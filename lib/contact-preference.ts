import { containsSsn, extractContactPreference, removeSsn } from "./import/text"
import type { ContactPreference, ContactPreferenceErrors, ContactPreferenceInput, PreferredChannel } from "./types"

/*
 * A student's contact preference (P9). Shared by the import, the Log contact form, the editor on
 * the student's page and the API, so every route to the field applies the same rules.
 */

export const PREFERRED_CHANNELS: readonly PreferredChannel[] = ["Phone", "Email", "Text"]
export const PREFERENCE_DETAILS_MAX = 500

/**
 * The preference a note states, if any, worked out from the note's final text. The details are
 * the note's own words, with any SSN-shaped number removed (D17) even though notes are checked
 * for them already: every saved copy is checked, not just the first.
 */
export function preferenceFromNote(note: { note_id: string; contact_date: string; note_text: string }): ContactPreference | null {
  const stated = extractContactPreference(note.note_text)
  if (!stated) return null
  return {
    channel: stated.channel,
    only: stated.channel ? stated.only : false,
    details: removeSsn(stated.text),
    stated_on: note.contact_date,
    source_note_id: note.note_id,
  }
}

/** "Phone only", "Prefers email", or "Contact preference" when no channel was named. */
export function preferenceHeading(p: Pick<ContactPreference, "channel" | "only">): string {
  if (!p.channel) return "Contact preference"
  return p.only ? `${p.channel} only` : `Prefers ${p.channel === "Text" ? "texts" : p.channel.toLowerCase()}`
}

/**
 * Reads the stored JSON. Preferences saved before 2026-10-08 had a different shape
 * ({ channel, text, note_id, noted_on }); they're read as the new one, as "only" when the text says so.
 */
export function parsePreference(json: string | null): ContactPreference | null {
  if (!json) return null
  try {
    const raw = JSON.parse(json) as Record<string, unknown>
    const channel = PREFERRED_CHANNELS.includes(raw.channel as PreferredChannel) ? (raw.channel as PreferredChannel) : null
    if (typeof raw.details === "string") {
      return {
        channel,
        only: channel ? raw.only === true : false,
        details: removeSsn(raw.details),
        stated_on: typeof raw.stated_on === "string" ? raw.stated_on : "",
        source_note_id: typeof raw.source_note_id === "string" ? raw.source_note_id : null,
      }
    }
    const text = typeof raw.text === "string" ? raw.text : ""
    return {
      channel,
      only: channel ? /\bonly\b/i.test(text) : false,
      details: removeSsn(text),
      stated_on: typeof raw.noted_on === "string" ? raw.noted_on : "",
      source_note_id: typeof raw.note_id === "string" ? raw.note_id : null,
    }
  } catch {
    return null
  }
}

/** Rules for a preference entered by hand. Shared by the editor (instant feedback) and the API (the authority). */
export function validatePreferenceInput(input: ContactPreferenceInput): ContactPreferenceErrors {
  const errors: ContactPreferenceErrors = {}
  if (input.channel !== null && !PREFERRED_CHANNELS.includes(input.channel)) errors.channel = "Choose phone, email, text, or no particular channel."
  const details = input.details?.trim() ?? ""
  if (details.length > PREFERENCE_DETAILS_MAX) errors.details = `Keep the details under ${PREFERENCE_DETAILS_MAX} characters.`
  else if (containsSsn(details)) errors.details = "This looks like a Social Security number. Remove it: SSNs must not be stored."
  if (!input.channel && !details) errors.details = "Choose a channel or describe the preference."
  return errors
}
