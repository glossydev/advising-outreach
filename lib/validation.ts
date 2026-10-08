import type { ContactMethod, NewNoteInput, NoteFieldErrors } from "./types"
import { SUMMARY_MAX_LENGTH, TODAY_ISO } from "./config"

const METHODS: ContactMethod[] = ["email", "phone", "in_person", "video", "text", "other"]
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function validateNoteInput(input: NewNoteInput): NoteFieldErrors {
  const errors: NoteFieldErrors = {}

  if (!input.contact_date || !ISO_DATE.test(input.contact_date)) {
    errors.contact_date = "Enter the date of contact."
  } else if (input.contact_date > TODAY_ISO) {
    errors.contact_date = "Contact date cannot be in the future."
  }

  if (!METHODS.includes(input.method)) errors.method = "Choose a contact method."

  const summary = input.summary?.trim() ?? ""
  if (!summary) errors.summary = "Summary is required."
  else if (summary.length > SUMMARY_MAX_LENGTH) errors.summary = `Keep the summary to ${SUMMARY_MAX_LENGTH} characters.`

  if (!input.body?.trim()) errors.body = "Notes are required."

  if (input.follow_up_date) {
    if (!ISO_DATE.test(input.follow_up_date)) errors.follow_up_date = "Enter a valid date."
    else if (input.contact_date && input.follow_up_date < input.contact_date)
      errors.follow_up_date = "Follow-up date must be on or after the contact date."
  }

  if (!input.advisor?.trim()) errors.advisor = "Advisor is required."

  return errors
}
