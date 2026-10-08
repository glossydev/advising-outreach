/*
 * Reads the date formats people actually type into spreadsheets. Every format found in the sample
 * data is covered (docs/DATA_AUDIT.md 2.2, 3.1), plus common neighbours. Nothing is guessed: a
 * slash date that could be month-first or day-first comes back "ambiguous" (D7).
 */

export type DateReading =
  | { kind: "blank" }
  | { kind: "placeholder" }
  | { kind: "unreadable" }
  | { kind: "ambiguous"; monthFirst: string; dayFirst: string }
  | { kind: "date"; iso: string; isIso: boolean; format: string }

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
]

/** Text people put in a date cell instead of a date (D5). */
export const DATE_PLACEHOLDERS = new Set(["n/a", "na", "n.a.", "none", "null", "nil", "unknown", "tbd", "-", "--", "?"])

/** 1–12 for a month name or abbreviation ("Sep", "Sept", "September"); 0 if not a month. */
export function monthNumber(name: string): number {
  const lower = name.toLowerCase().replace(/\.$/, "")
  if (lower.length < 3) return 0
  return MONTHS.findIndex((m) => m.startsWith(lower)) + 1
}

export function toIsoDate(year: number, month: number, day: number): string | null {
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1) return null
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null
  return date.toISOString().slice(0, 10)
}

export function isIsoDate(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  return m !== null && toIsoDate(+m[1], +m[2], +m[3]) === value
}

function dated(raw: string, year: number, month: number, day: number, format: string): DateReading {
  const iso = toIsoDate(year, month, day)
  return iso ? { kind: "date", iso, isIso: raw === iso, format } : { kind: "unreadable" }
}

export function readDate(raw: string): DateReading {
  const value = raw.trim()
  if (!value) return { kind: "blank" }
  if (DATE_PLACEHOLDERS.has(value.toLowerCase())) return { kind: "placeholder" }

  let m: RegExpExecArray | null
  if ((m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value))) return dated(raw, +m[1], +m[2], +m[3], "YYYY-MM-DD")
  if ((m = /^(\d{4})-(\d{2})-(\d{2})[T ]\d{1,2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/.exec(value)))
    return dated(raw, +m[1], +m[2], +m[3], "YYYY-MM-DD with a time")
  if ((m = /^(\d{4})[/.](\d{1,2})[/.](\d{1,2})$/.exec(value))) return dated(raw, +m[1], +m[2], +m[3], "YYYY/MM/DD")

  if ((m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/.exec(value))) {
    const [a, b] = [+m[1], +m[2]]
    const year = m[3].length === 2 ? 2000 + +m[3] : +m[3]
    if (a > 12 && b <= 12) return dated(raw, year, b, a, "DD/MM/YYYY")
    if ((b > 12 && a <= 12) || a === b) return dated(raw, year, a, b, "MM/DD/YYYY")
    const monthFirst = toIsoDate(year, a, b)
    const dayFirst = toIsoDate(year, b, a)
    if (monthFirst && dayFirst) return { kind: "ambiguous", monthFirst, dayFirst }
    return { kind: "unreadable" }
  }

  if ((m = /^([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/.exec(value)))
    return dated(raw, +m[3], monthNumber(m[1]), +m[2], "Mon DD, YYYY")
  if ((m = /^(\d{1,2})[-\s]([A-Za-z]{3,9})\.?[-\s,]+(\d{4})$/.exec(value)))
    return dated(raw, +m[3], monthNumber(m[2]), +m[1], "DD-Mon-YYYY")

  return { kind: "unreadable" }
}

const LONG = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
const SHORT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" })

/** "Aug 25, 2026" */
export function formatLongDate(iso: string): string {
  return LONG.format(new Date(`${iso}T00:00:00Z`))
}

/** "Aug 25" when in the same year as `today`, otherwise "Aug 25, 2025". */
export function formatShortDate(iso: string, today: string): string {
  return iso.slice(0, 4) === today.slice(0, 4) ? SHORT.format(new Date(`${iso}T00:00:00Z`)) : formatLongDate(iso)
}

/** Whole days from one YYYY-MM-DD date to another (positive when `to` is later). */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000)
}
