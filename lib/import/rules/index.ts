import type { Rule } from "../types"
import { contactPreferenceInText } from "./contact-preference-in-text"
import { creditsOutsideClassStanding } from "./credits-outside-class-standing"
import { dateAmbiguous } from "./date-ambiguous"
import { dateInFuture } from "./date-in-future"
import { dateNotIso } from "./date-not-iso"
import { datePlaceholder } from "./date-placeholder"
import { dateUnreadable } from "./date-unreadable"
import { duplicateIdInFile } from "./duplicate-id-in-file"
import { duplicateNoteInFile } from "./duplicate-note-in-file"
import { emailInvalid } from "./email-invalid"
import { emailShared } from "./email-shared"
import { extraWhitespace } from "./extra-whitespace"
import { followUpDateInText } from "./follow-up-date-in-text"
import { idAlreadyImported } from "./id-already-imported"
import { lastContactMismatch } from "./last-contact-mismatch"
import { noteAdvisorDiffers } from "./note-advisor-differs"
import { numberInvalid } from "./number-invalid"
import { possibleDuplicateStudent } from "./possible-duplicate-student"
import { requiredValueMissing } from "./required-value-missing"
import { sensitiveContent } from "./sensitive-content"
import { ssnInText } from "./ssn-in-text"
import { unknownStudent } from "./unknown-student"
import { valueNotInList } from "./value-not-in-list"

/** Every import rule, in DECISIONS.md order (D1–D23). */
export const RULES: readonly Rule[] = [
  requiredValueMissing,
  duplicateIdInFile,
  idAlreadyImported,
  dateNotIso,
  datePlaceholder,
  dateUnreadable,
  dateAmbiguous,
  dateInFuture,
  valueNotInList,
  numberInvalid,
  creditsOutsideClassStanding,
  emailInvalid,
  emailShared,
  extraWhitespace,
  possibleDuplicateStudent,
  unknownStudent,
  ssnInText,
  sensitiveContent,
  contactPreferenceInText,
  followUpDateInText,
  duplicateNoteInFile,
  lastContactMismatch,
  noteAdvisorDiffers,
]
