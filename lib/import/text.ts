import { monthNumber, toIsoDate, daysBetween } from "./dates"

/*
 * Pattern detection on free text: SSNs (D17), sensitive disclosures (D18), contact preferences
 * (D19), dates written into a note (D20) and notes left waiting on the student (D25). These are
 * keyword searches; they surface things for a person to decide, they don't decide.
 */

export const normalizeKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "")
export const lettersOnly = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "")
export const collapseSpaces = (s: string) => s.trim().replace(/\s+/g, " ")

export function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j]
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = tmp
    }
  }
  return dp[b.length]
}

/** Splits on . ! ? but not after titles such as "Dr." */
export function sentences(text: string): string[] {
  return text
    .trim()
    .split(/(?<!\b(?:Dr|Mr|Mrs|Ms|Prof|St)\.)(?<=[.!?])\s+/)
    .filter(Boolean)
}

// ---------- SSNs (D17) ----------

const SSN = /\b\d{3}-\d{2}-\d{4}\b/
const SSN_ALL = new RegExp(SSN.source, "g")

/** What an SSN is replaced with when the suggested fix is accepted. */
export const SSN_REPLACEMENT = "[SSN removed]"

export const containsSsn = (text: string) => SSN.test(text)
export const removeSsn = (text: string) => text.replace(SSN_ALL, SSN_REPLACEMENT)
/** For display and for anything stored about an import: the number is never shown or kept. */
export const maskSsn = (text: string) => text.replace(SSN_ALL, "•••-••-••••")

// ---------- Sensitive disclosures (D18) ----------

const SENSITIVE_TERMS: readonly { label: string; pattern: RegExp }[] = [
  {
    label: "mental health",
    pattern: /\b(counsel(?:or|ing)|therap(?:y|ist)|anxiety|depress\w*|mental health|panic attacks?|suicid\w*|self-harm)\b/i,
  },
  { label: "emotional distress", pattern: /\bemotional\b/i },
  {
    label: "medical",
    pattern: /\b(medical|diagnos\w*|illness|hospital\w*|disabilit\w*|accommodations?|pregnan\w*)\b/i,
  },
  {
    label: "a request for privacy",
    pattern: /\b(stay private|keep (?:this|it) private|confidential|don't share|do not share)\b/i,
  },
  { label: "a government ID", pattern: /\b(ssn|social security)\b/i },
]

export function findSensitiveTerms(text: string): { label: string; match: string }[] {
  return SENSITIVE_TERMS.flatMap(({ label, pattern }) => {
    const m = pattern.exec(text)
    return m ? [{ label, match: m[0] }] : []
  })
}

// ---------- Contact preferences (D19) ----------

const PREFERENCE =
  /\b((?:by|via) (?:phone|email|text)(?: only)?|(?:phone|email|text)[- ]only|prefers? (?:phone|email|texts?|calls?)|best reached|do not (?:email|call|text)|email goes to)\b/i

export interface ContactPreference {
  /** The channel the student asked for, when the text names one. */
  channel: "Phone" | "Email" | "Text" | null
  /** The sentence(s) stating the preference, verbatim. */
  text: string
}

export function extractContactPreference(noteText: string): ContactPreference | null {
  const stated = sentences(noteText).filter((s) => PREFERENCE.test(s))
  if (stated.length === 0) return null
  const text = stated.join(" ")
  const asked = /\b(?:by|via) (phone|email|text)\b|\b(phone|email|text)[- ]only\b|\bprefers? (phone|email|text|call)/i.exec(text)
  const word = (asked?.[1] ?? asked?.[2] ?? asked?.[3] ?? "").toLowerCase()
  const channel = word === "phone" || word === "call" ? "Phone" : word === "email" ? "Email" : word === "text" ? "Text" : null
  return { channel, text }
}

// ---------- Dates written into a note (D20) ----------

const EXPLICIT_DATE =
  /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b(?:,?\s+(\d{4}))?/i

/**
 * An explicit month-and-day in the text ("by Oct 15"), as the date it most likely means: the
 * stated year if there is one, otherwise the next such date on or after the note's own date.
 * A month-and-day shortly before the note's date is a past event, not a follow-up, and is ignored.
 * Vague phrases ("mid-October", "this week") are deliberately not matched.
 */
export function findFollowUpDate(noteText: string, noteDate: string): { phrase: string; iso: string } | null {
  const m = EXPLICIT_DATE.exec(noteText)
  if (!m) return null
  const month = monthNumber(m[1])
  const day = Number(m[2])
  const noteYear = Number(noteDate.slice(0, 4))
  if (m[3]) {
    const iso = toIsoDate(Number(m[3]), month, day)
    return iso && iso >= noteDate ? { phrase: m[0], iso } : null
  }
  const sameYear = toIsoDate(noteYear, month, day)
  if (!sameYear) return null
  if (sameYear >= noteDate) return { phrase: m[0], iso: sameYear }
  if (daysBetween(sameYear, noteDate) <= 60) return null
  const nextYear = toIsoDate(noteYear + 1, month, day)
  return nextYear ? { phrase: m[0], iso: nextYear } : null
}

// ---------- Waiting on the student (D25) ----------

/** The note ends with the advisor waiting to hear back from the student. "Pending" (an office) doesn't count. */
export const WAITING_ON_STUDENT =
  /\b(no (?:reply|response)(?: yet)?|awaiting(?: a)? (?:reply|response)|did not respond|has(?:n't| not) (?:replied|responded)|left (?:a )?voicemail|to reply)\b/i
