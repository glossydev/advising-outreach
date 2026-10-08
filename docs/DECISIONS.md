# Decisions

Two kinds of entries:

- **Data decisions (D1, D2, …)** say how the tool handles a kind of data problem. Each one is exactly one named rule in code, and the rule name appears in the entry. Import rules live in `lib/import/rules/`; scoring rules live in `lib/scoring.ts`.
- **Technical decisions (T1, T2, …)** record tooling and architecture choices and why they were made.

## Guiding rules

**G1: When the v0-generated scaffold disagrees with the dataset or the brief, the dataset and brief win.** v0 built the UI from a high-level description and never saw the CSVs, so its column names, types and import logic are a starting point, not a spec. _(Set by Adam, 2026-10-07.)_

**G2: The import never changes data silently.** Source files are never modified. Bad data is flagged during import with a reason and, where possible, a suggested fix. The person importing accepts it (one at a time or in bulk), types a different value, or excludes the row. Every accepted fix is recorded. The point is a tool that can handle the *next* broken spreadsheet, not a one-time clean of this one. _(Set by Adam, 2026-10-08. Design: [IMPORT_DESIGN.md](IMPORT_DESIGN.md).)_

## Data decisions

> **Draft (2026-10-08): proposed by Claude, pending Adam's review.**
> "Blocking" means the row can't be imported until it's resolved. "Fires on sample" is how many times the rule triggers on the hiring team's files, from [DATA_AUDIT.md](DATA_AUDIT.md).

### Checks on any file

**D1 · `required_value_missing` · blocking.** A required column (see "Assumed column meanings" in IMPORT_DESIGN.md) is blank. No suggestion: the user types a value or excludes the row. _Fires on sample: 0._

**D2 · `duplicate_id_in_file` · blocking.** The same `student_id` or `note_id` appears on more than one row. If the rows are identical, the suggestion is to exclude the extra copies; otherwise the user picks which row to keep. _Fires on sample: 0._

**D3 · `id_already_imported` · depends on open question 1.** The ID already exists in the database.
- A student with changed fields is a warning: "will update this record", showing which fields change.
- A note identical to the stored one is info: "already imported, will be skipped".
- A note with the same ID but different content is blocking.

_Fires on sample: 0 on the first import. Re-importing the sample notes triggers it 57 times as "already imported", which is the intended behavior._

### Dates

**D4 · `date_not_iso` · blocking, one-click fix.** A date in a recognized non-ISO format (`Aug 25, 2026`, `30-Aug-2026`, `2026/09/02`, `09/16/2026`). The suggestion is the YYYY-MM-DD date, with "apply to all". _Fires on sample: 8 students, 11 notes (audit 2.2, 3.1)._

**D5 · `date_placeholder` · blocking, one-click fix.** Placeholder text in a date column (`N/A`, `TBD`, `none`, `-`). The suggestion is to clear it, but only for optional columns; a required date has to be typed in. _Fires on sample: 1, S1040 (audit 2.3)._

**D6 · `date_unreadable` · blocking.** Not blank, not a placeholder, not a recognized format, or not a real calendar date. No suggestion. _Fires on sample: 0._

**D7 · `date_ambiguous` · blocking.** A slash date that could be month-first or day-first (`03/04/2026`). Both readings are offered and the user picks. _Fires on sample: 0 (the one slash date, `09/16/2026`, can only be month-first)._

**D8 · `date_in_future` · blocking.** A date after the reference "today" (2026-10-05). The same check applies to notes logged in the app. _Fires on sample: 0._

### Values

**D9 · `value_not_in_list` · blocking.** `class_year`, `risk_flag` or `contact_type` isn't one of the allowed values. If it differs only in case or spacing (`low`, ` High`), the matching value is suggested; otherwise the user picks from the list. Allowed values follow the dataset (G1): `Zoom` stays `Zoom` rather than becoming v0's "video". _Fires on sample: 0._

**D10 · `number_invalid` · blocking.** `gpa` isn't a number between 0.0 and 4.0, or `credits_earned` isn't a whole number of 0 or more. A blank GPA is allowed and shows as "—". _Fires on sample: 0._

**D11 · `credits_outside_class_standing` · warning.** `credits_earned` is outside the UA class-standing range for the class year (Freshman 0–29, Sophomore 30–59, Junior 60–89, Senior 90+). The expected range is shown. _Fires on sample: 0._

**D12 · `email_invalid` · blocking.** _Fires on sample: 0._

**D13 · `email_shared` · warning.** Another student in the file or the database has the same email. _Fires on sample: 0._

**D14 · `extra_whitespace` · warning, one-click fix.** Leading, trailing or doubled spaces. The suggestion is the trimmed value, with "apply to all". _Fires on sample: 0._

### Students

**D15 · `possible_duplicate_student` · warning, row-level.** Same last name, first names within two letters of each other, and the same major or class year. This can be another row in the file or a student already in the database.
- Choices: import and **link the two as possible duplicates** (suggested), or exclude the row.
- Linked students show a banner on both detail pages pointing to each other.
- No automatic merge: the emails and advisors differ, they could be siblings, and merging student records is a registrar's call, not an advisor tool's.

_Fires on sample: 1, S1050 Gracie Okonkwo ↔ S1021 Grace Okonkwo (audit 2.1; the near-identical notes in 3.3 are supporting evidence)._

### Notes

**D16 · `unknown_student` · blocking.** The note's `student_id` isn't in the database. Choices: pick the right student, or exclude the row. _Fires on sample: 0._

**D17 · `ssn_in_text` · blocking, one-click fix.** An SSN-shaped number (###-##-####) in note text.
- The suggestion replaces it with `[SSN removed]`.
- The unmasked number is never stored, including in the fix history, and is masked even in the import preview.
- The same check blocks saving a note typed in the app and tells the advisor why.
- Phone numbers and emails in note text are allowed, since advisors legitimately record "best reached at …".

_Fires on sample: 1, N041 (audit 5.1)._

**D18 · `sensitive_content` · blocking until decided.** Health, mental-health, privacy-request or government-ID terms in note text.
- Choices: **mark the note sensitive** (suggested) or not sensitive.
- A sensitive note shows collapsed in the timeline, labeled as sensitive, until someone chooses to reveal it.
- It is left out of any summary or AI feature.
- The content isn't deleted: the same note holds an action item (D20).

_Fires on sample: 1, N041 (audit 5.2)._

**D19 · `contact_preference_in_text` · warning, one-click fix.** A stated contact preference ("contact him by phone only", "best reached after 5 pm", "email goes to a shared family account").
- The suggestion saves it as the student's contact preference: channel, quoted sentence, source note.
- The preference shows on the student's page.
- Logging a contact by a different channel shows a warning.

_Fires on sample: 1, N001. The student's latest contact, N017, was an academic-warning email sent after he asked for phone only (audit 5.3)._

**D20 · `follow_up_date_in_text` · warning, one-click fix.** An explicit month-and-day in note text ("by Oct 15").
- The suggestion sets the note's follow-up date to the next such date on or after the contact date (2026-10-15).
- Vague phrases ("mid-October", "this week", "deadline is approaching") are not guessed at.

_Fires on sample: 1, N041 (audit 5.5)._

**D21 · `duplicate_note_in_file` · warning, one-click fix.** Two rows with different note IDs but the same student, date, type and text. The suggestion is to exclude the copy. _Fires on sample: 0._

### Across files

**D22 · `last_contact_mismatch` · info.**
- A student's last contact is **the later of** their newest note and the spreadsheet's `last_contact_date`.
- The spreadsheet value is stored unchanged as `source_last_contact_date`.
- When the two disagree, this rule records which one was used.
- Why the later of the two: a newer spreadsheet date means a contact happened that nobody wrote a note for, and a newer note means the spreadsheet is stale. Either way the most recent known contact is the right input for "who hasn't heard from us".

_Fires on sample: 0. All 47 students with both agree once dates are normalized (audit 4.2)._

**D23 · `note_advisor_differs` · info.** The note was written by someone other than the student's assigned advisor. The note keeps its author and the assignment doesn't change. _Fires on sample: 0._

### Display and scoring (the smart feature)

**D24 · `no_contact_on_record` · scoring rule.** A student with no notes and no readable spreadsheet date shows as **"No contact on record"**, not "Never contacted", because a spreadsheet can't prove a contact never happened. They rank at the top of the outreach queue. _Applies to 3 students on sample: S1006, S1018 (High risk), S1040 (audit 4.1)._

**D25 · `waiting_on_student` · scoring rule.** If a student's newest note is waiting on them ("no reply", "no response", "awaiting", "left voicemail"), their outreach priority goes up and the reason says how long they've been waiting. _Applies to 5 students on sample, 4 of them High risk, waiting 69–138 days (audit 5.4)._

### Audit findings with no rule

| Audit finding | Decision |
|---|---|
| 1.1 README.txt is empty | The CSV headers are the spec. Assumed column meanings are written down in IMPORT_DESIGN.md. Revisit if the hiring team sends the README. |
| 3.2 Short notes | No action. "Left voicemail. No response." is a complete note. |
| 3.3 Near-identical notes | No rule. N026/N036 is evidence for D15. N044/N048 is a false positive, left visible in the audit. |

## Technical decisions

**T1: Package manager is pnpm 12.3.4.** v0 shipped a pnpm lockfile and pinned `pnpm@12.3.4` in `packageManager`; corepack honors the pin, so every machine gets the same version. pnpm 12 also checks the lockfile against supply-chain policies and blocks dependency install scripts until approved. Only `esbuild` (needed by `tsx`) is approved, in `pnpm-workspace.yaml`.

**T2: Storage is Postgres via Drizzle ORM, replacing the plan's SQLite.** The finished app will be hosted on GDS, which provides Postgres. Using Postgres everywhere means one SQL dialect and one schema from laptop to production. Local development and tests run Postgres in Docker, so nothing touches the hosted database. Trade-off: running locally needs Docker, where SQLite would have needed nothing; the hosted version covers anyone who doesn't want to install it.

**T3: One class-name helper.** `components/ui/alert-dialog.tsx` imports `cn` from the `cn` npm package (a real shadcn-ui package), while every other component uses `@/lib/utils`. Standardize on `@/lib/utils` and drop the extra dependency. _(Applied in Phase 2.)_

**T4: Import rules are plain functions shared by browser and server.** The browser re-checks a row the moment it's edited, so highlighting updates instantly. The server re-runs the same functions on commit and refuses anything still blocking, so the browser never has the final say.

**T5: The seed script is an import with every suggestion accepted.** `pnpm seed` sends the sample files through the same rules and records each fix as accepted by the seed script. A fresh clone, the hosted demo and the end-to-end tests all start from the same known state, produced by the same code a person would use.
