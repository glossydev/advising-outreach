import { TODAY_ISO } from "./config"
import { isIsoDate } from "./import/dates"
import { CONTACT_TYPES } from "./import/fields"
import { containsSsn } from "./import/text"
import type { NewNoteInput, NoteFieldErrors } from "./types"

export const NOTE_MAX_LENGTH = 5000

/**
 * Rules for a note logged in the app. Shared by the form (instant feedback) and the API (the
 * authority). The same decisions as the importer: no future contact dates (D8) and no SSNs (D17).
 */
export function validateNoteInput(input: NewNoteInput, today: string = TODAY_ISO): NoteFieldErrors {
  const errors: NoteFieldErrors = {}

  if (!input.contact_date || !isIsoDate(input.contact_date)) errors.contact_date = "Enter the date of contact."
  else if (input.contact_date > today) errors.contact_date = "The contact date can't be after today."

  if (!(CONTACT_TYPES as readonly string[]).includes(input.contact_type)) errors.contact_type = "Choose how you made contact."

  const text = input.note_text?.trim() ?? ""
  if (!text) errors.note_text = "Write what was discussed."
  else if (text.length > NOTE_MAX_LENGTH) errors.note_text = `Keep the note under ${NOTE_MAX_LENGTH.toLocaleString()} characters.`
  else if (containsSsn(text))
    errors.note_text = "This looks like a Social Security number. Remove it before saving: SSNs must not be stored in advising notes."

  if (input.follow_up_date) {
    if (!isIsoDate(input.follow_up_date)) errors.follow_up_date = "Enter a valid date."
    else if (input.contact_date && input.follow_up_date < input.contact_date)
      errors.follow_up_date = "The follow-up date must be on or after the contact date."
  }

  if (!input.advisor?.trim()) errors.advisor = "Advisor is required."

  return errors
}
