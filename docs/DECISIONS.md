# Decisions

Two kinds of entries:

- **Data decisions (D1, D2, …)** say how the tool handles a kind of data problem. Each one is exactly one named rule in code, and the rule name appears in the entry. Import rules live in `lib/import/rules/`; scoring rules live in `lib/scoring.ts`.
- **Product decisions (P1, P2, …)** say how the app behaves for the people using it.
- **Technical decisions (T1, T2, …)** record tooling and architecture choices and why they were made.

## Guiding rules

**G1: When the v0-generated scaffold disagrees with the dataset or the brief, the dataset and brief win.** v0 built the UI from a high-level description and never saw the CSVs, so its column names, types and import logic are a starting point, not a spec. _(Set by Adam, 2026-10-07.)_

**G2: The import never changes data silently.** Source files are never modified. Bad data is flagged during import with a reason and, where possible, a suggested fix. The person importing accepts it (one at a time or in bulk), types a different value, or excludes the row. Every accepted fix is recorded. The point is a tool that can handle the *next* broken spreadsheet, not a one-time clean of this one. _(Set by Adam, 2026-10-08. Design: [IMPORT_DESIGN.md](IMPORT_DESIGN.md).)_

## Data decisions

> **Status:** proposed by Claude on 2026-10-08. Adam answered the open questions the same day (D3, P1–P3) and asked for no rule changes. Individual rules may still be adjusted while the importer is built; any change gets noted here.
> "Blocking" means the row can't be imported until it's resolved. "Fires on sample" is how many times the rule triggers on the hiring team's files, from [DATA_AUDIT.md](DATA_AUDIT.md).

### Checks on any file

**D1 · `required_value_missing` · blocking.** A required column (see "Column meanings" in IMPORT_DESIGN.md) is blank. No suggestion: the user types a value or excludes the row. _Fires on sample: 0._

**D2 · `duplicate_id_in_file` · blocking.** The same `student_id` or `note_id` appears on more than one row. If the rows are identical, the suggestion is to exclude the extra copies; otherwise the user picks which row to keep. _Fires on sample: 0._

**D3 · `id_already_imported` · warning or info.** The ID already exists in the database. Imports add and update, never delete (P1).
- A student with changed fields is a warning: "will update this record", showing which fields change.
- A note identical to the stored one is info: "already imported, will be skipped". The comparison removes SSNs from the file's text first, since stored notes never contain them; otherwise re-importing N041 would look like a conflict.
- A note with the same ID but different content is blocking.

_Fires on sample: 0 on the first import. Re-importing the sample notes triggers it 57 times as "already imported", which is the intended behavior._

### Dates

**D4 · `date_not_iso` · blocking, one-click fix.** A date in a recognized non-ISO format (`Aug 25, 2026`, `30-Aug-2026`, `2026/09/02`, `09/16/2026`). The suggestion is the YYYY-MM-DD date, with "apply to all". _Fires on sample: 8 students, 11 notes (audit 2.2, 3.1)._

**D5 · `date_placeholder` · blocking, one-click fix.** Placeholder text in a date column (`N/A`, `TBD`, `none`, `-`). The suggestion is to clear it, but only for optional columns; a required date has to be typed in. _Fires on sample: 1, S1040 (audit 2.3)._

**D6 · `date_unreadable` · blocking.** Not blank, not a placeholder, not a recognized format, or not a real calendar date. No suggestion. _Fires on sample: 0._

**D7 · `date_ambiguous` · blocking.** A slash date that could be month-first or day-first (`03/04/2026`). Both readings are offered and the user picks. _Fires on sample: 0 (the one slash date, `09/16/2026`, can only be month-first)._

**D8 · `date_in_future` · blocking.** A date after the reference "today" (2026-10-05). The same check applies to notes logged in the app. _Fires on sample: 0._

### Values

**D9 · `value_not_in_list` · blocking.** `class_year`, `risk_flag` or `contact_type` isn't one of the allowed values. If it differs only in case or spacing (`low`, ` High`), the matching value is suggested; otherwise the user picks from the list. Allowed values follow the dataset and its README (G1): `Zoom` stays `Zoom` rather than becoming v0's "video", and class years are Freshman / Sophomore / Junior / Senior. v0's extra "Graduate" was removed once the README arrived. _Fires on sample: 0._

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

**D19 · `contact_preference_in_text` · warning, one-click fix (or info).** A stated contact preference ("contact him by phone only", "prefers email", "best reached after 5 pm", "do not call").
- The suggestion saves it as the student's **contact preference** (P9). It never touches the note's `contact_type`, which records how that contact happened.
- The detector tells three things apart, so the suggestion never claims more than the note says: a **restriction** ("by phone only", "email-only"), a **preference** ("prefers email"), and **other guidance** with no channel ("best reached after 5 pm"). How a contact happened ("contacted the student by email") is not matched.
- **Only the newest statement per student in a file** gets the suggestion. Older ones are info ("row N states a newer one").
- **It never replaces a newer preference already on the record.** That case is info, and the stored one is kept. When saving would replace an older one, the message says which.
- **Accepting sets a flag, not a value.** At commit, the preference is worked out again from the note's final text, after every other fix (such as removing an SSN). It is SSN-scrubbed again, and the rule's message masks any SSN. The newest-wins and never-older checks run again on the server too.

_Fires on sample: 1, N001. The student's latest contact, N017, was an academic-warning email sent after he asked for phone only (audit 5.3)._
- _Revised 2026-10-08 after Adam's review and a code review._ The first version saved a "phone only" preference from any "by phone" mention, and kept the newest only within one file. It copied the note's raw sentence, which could carry an SSN past D17's fix. It also made the Log contact form pre-select and warn on the contact type. Adam pointed out the last part is wrong: the type records how the contact happened, not how the student would like to be contacted.

**D20 · `follow_up_date_in_text` · warning, one-click fix.** An explicit month-and-day in note text ("by Oct 15").
- The suggestion sets the note's follow-up date to the next such date on or after the contact date (2026-10-15).
- Vague phrases ("mid-October", "this week", "deadline is approaching") are not guessed at.

_Fires on sample: 1, N041 (audit 5.5)._

**D21 · `duplicate_note_in_file` · warning, one-click fix.** Two rows with different note IDs but the same student, date, type and text. The suggestion is to exclude the copy. _Fires on sample: 0._

### Across files

**D22 · `last_contact_mismatch` · info.**
- A student's last contact is **the later of** their newest note and the spreadsheet's `last_contact_date`.
- The spreadsheet value is kept, after any fixes accepted during import (such as converting "Aug 25, 2026"), as `source_last_contact_date`.
- When the two disagree, this rule records which one was used.
- Why the later of the two: a newer spreadsheet date means a contact happened that nobody wrote a note for, and a newer note means the spreadsheet is stale. Either way the most recent known contact is the right input for "who hasn't heard from us".

_Fires on sample: 0. All 47 students with both agree once dates are normalized (audit 4.2)._

**D23 · `note_advisor_differs` · info.** The note was written by someone other than the student's assigned advisor. The note keeps its author and the assignment doesn't change. _Fires on sample: 0._

### Display and scoring (the smart feature)

**D24 · `no_contact_on_record` · scoring rule.** A student with no notes and no spreadsheet date shows as **"Never contacted"** and ranks at the top of the outreach queue, after only follow-ups that are due (P8). _Applies to 3 students on sample: S1006, S1018 (High risk), S1040 (audit 4.1)._
- _Revised 2026-10-08, when the README arrived:_ the first version said "No contact on record", on the grounds that a spreadsheet can't prove a contact never happened. The README defines it: "Blank = never contacted". The data owner's definition wins (G1).
- S1040's "N/A" is a placeholder rather than a blank. D5 suggests clearing it, after which it means the same thing.

**D25 · `waiting_on_student` · scoring rule.** If a student's newest note is waiting on them ("no reply", "no response", "awaiting a reply", "left voicemail"), their outreach priority goes up and the reason says how long they've been waiting.
- _Applies to 4 students on sample, all High risk, waiting 69–138 days (audit 5.4)._
- _Corrected while building it:_ the audit counted 5. The fifth, N019's "Financial aid appeal pending", is waiting on the aid office, not on the student, so it doesn't count.

**Scoring weights** live in one table (`WEIGHTS` in `lib/scoring.ts`) so they can be tuned with advisors. The plan's other factors are there too:
- days since last contact (the biggest factor);
- risk flag;
- GPA under 2.0 / 2.5;
- credits below the UA class-standing minimum (fires 0 times on sample);
- an open follow-up two days out (+10), one day out (+20), or due or overdue (+30, and the top of the queue). See P8. On the sample, N041's Oct 15 follow-up is 10 days out, so it earns nothing yet.

Every factor adds a plain-language reason, and the reasons are shown to advisors verbatim.

**Time since contact counts in steps:** 0 / 6 / 18 / 28 / 35 points from 0 / 14 / 30 / 60 / 90 days. Steps are easy to check by hand, and 30 days matches the Overdue tile. The cost is a cliff at each step (29 days earns 6, 30 days earns 18). A per-day ramp is a one-line change if the advisors would rather. The help pages explain this with a worked example, because Adam asked how the math works.

### Audit findings with no rule

| Audit finding | Decision |
|---|---|
| 1.1 README.txt is empty | Until it arrived, the CSV headers were the spec and the inferred meanings were written down in IMPORT_DESIGN.md. **Resolved 2026-10-08:** Adam asked the hiring team, and they sent the full README (now `data/source/README.txt`; the empty original is in git history). It confirmed every inferred meaning except two: blank `last_contact_date` = never contacted (D24 revised), and no "Graduate" class year (D9). It also states that all the data, including emails on the reserved `example.edu` domain, is synthetic. |
| 3.2 Short notes | No action. "Left voicemail. No response." is a complete note. |
| 3.3 Near-identical notes | No rule. N026/N036 is evidence for D15. N044/N048 is a false positive, left visible in the audit. |

## Product decisions

**P1: Imports add and update; they never delete.** Students already in the database are matched by `student_id`: changed fields are updated (and shown before commit), and new students are added. New notes are added, and notes already imported are skipped. The import page explains this before the user picks a file, and says how to start clean: the **Reset database** button in the prototype tools box (or `pnpm db:reset` locally). _(Adam, 2026-10-08.)_

**P2: Column matching is automatic, with a brief review.** Headers are matched by exact name, then by known alternatives, then by closest name. The review screen lists every match on one screen and highlights anything that isn't an exact header match, so problems stand out without reading every row. If everything matches exactly, it's a single "Continue". A required field with no match is shown in red and must be assigned. _(Adam, 2026-10-08.)_

**P3: The app starts with the sample data already imported.** First load lands on a working outreach queue. The data comes from the seed script, which runs the same import rules (T5). _(Adam, 2026-10-08.)_

**P4: First visit opens a welcome dialog.**
- It explains what the app is, gives a short tour of the features and how to use them, and uses the University of Arizona "A" mark in its branding.
- A "Don't show this again" checkbox is remembered in that browser (there are no user accounts to store it against). Closing without ticking it keeps the dialog away for the rest of the visit.
- The dialog can be reopened from the help (?) button in the top bar. _(Adam, 2026-10-08.)_
- **The logo:** UA's brand rules say the Block A must not be altered in any way, so the app never draws its own version. It shows the official file if it's placed at `public/brand/ua-block-a.svg` (or `.png`), with a trademark line, and a neutral icon otherwise.

**P5: A "Before you reach out" card replaces v0's AI summary card.**
- v0 showed generated summaries from mock data. The real AI summary was deferred, and a fake one would misrepresent what the tool does.
- The card lists what an advisor should know before contacting this student, all from decisions already made on the data:
  - the student's contact preference (D19, P9), with an editor;
  - an unanswered outreach (D25);
  - every open follow-up (D20, P8);
  - sensitive notes (D18);
  - a last contact that has no note behind it (D22);
  - never contacted (D24).
- It's deterministic, explainable, and works with no API key. _(Claude, 2026-10-08.)_

**P6: Logging a note applies the same data rules as the import.**
- **The form:**
  - one note field, matching the dataset (v0 had a summary plus a body);
  - contact types Phone / Email / In person / Zoom;
  - the type defaults to the student's preferred channel when one is saved.
- **Blocked:** a contact date after today (D8) and an SSN-shaped number (D17), with a message saying why.
- **Warned, not blocked:** note text that mentions sensitive topics suggests ticking "Sensitive note" (D18). The advisor decides.
- **IDs:** new notes continue the dataset's ID pattern (N058, N059, …). _(Claude, 2026-10-08.)_
- _Revised 2026-10-08 (Adam):_ **the contact type has no default.** It records how this contact happened, so the advisor chooses it. The first version pre-selected the student's preferred channel and warned when another was picked. That nudged advisors to record a phone-only student's email as a phone call. The preference is now shown at the top of the form, for reference only.
- _Added 2026-10-08:_ **a failed save keeps the draft.** A network error or a server error leaves the form open with everything typed, and says what happened. Before, a network error inside the save crashed the page and lost the note (found by a code review).

**P7: Help pages at `/help`, linked from the bottom of the sidebar.** _(Adam asked for them, 2026-10-08. The details are Claude's.)_
- **Why:** not in the brief. Adam's reason for asking: writing them means going through every screen, dialog and function, which finds bugs and unfinished features. It did (see the Phase 6 entry in AI_USAGE_LOG).
- **Navigation:** a clickable contents list down the left and a search that narrows both the contents and the page to the matching topics, with the matches highlighted. Every heading has its own link.
- **Opens in a new tab,** so following a help link never throws away a half-done import or an unsaved note. The link says so, visibly and to screen readers.
- **Written in Markdown** (`content/help.md`). It is split by headings into sections and topics; anyone can edit it without touching code.
- **Screenshots are generated, not hand-made.** A Playwright walk through the app (`npm run docs:screenshots`) recreates them, so they can be redone after any UI change. A unit test fails if the help shows a missing image or links to a missing heading.
- **Accuracy:** every statement was checked against the code, not against memory of it. The first draft had six mismatches; they're listed in AI_USAGE_LOG.

**P8: Follow-ups.** _(Adam, 2026-10-08: the column, the 2-day ramp and "due today goes to the very top". Adam chose "overdue stays at the top, oldest first" and "a checkbox when logging" from options Claude offered.)_
- **The queue shows the next open follow-up** in its own sortable column, with how far away it is.
- **A short ramp:** nothing until two days before (+10), then the day before (+20).
- **On the day, and after, until it's done:** +30, and the student is ranked **above everyone**, including students never contacted. With several, the longest overdue comes first. A follow-up is a promise to get back to someone, so a missed one shouldn't sink below today's.
- **A follow-up stays open until a contact is logged as completing it.** The Log contact form lists the student's open follow-ups, each with "This contact completes the follow-up due …". It starts ticked when the contact is within 2 days of the follow-up date or after it, and unticked when earlier, so an unrelated early contact doesn't close it by accident. The completing note is recorded on the original (`follow_up_done_by`, migration 0002), and the timeline says which note completed it.
- **Every open follow-up counts, not just the newest note's.** Before, logging an unrelated note made an open follow-up vanish from the score, and one more than 14 days out wasn't shown anywhere (found by a code review). "Before you reach out" now lists every open follow-up, however far ahead.
- **Imported follow-ups** (D20) start open. The sample has one, N041's (Oct 15).

**P9: A contact preference field on each student.** _(Adam chose a real, editable field over reading preferences from notes, 2026-10-08.)_
- **One per student:** channel (phone, email, text, or none), whether it's **only** that way or just **preferred**, details in words, the date it was stated, and the note it came from (or "entered on the student's page").
- **Three ways in:** the import (D19, accepted by the person importing); logging a contact whose note states one (an unticked "Save as … contact preference" box that says what it would replace); and a small editor on the student's page, which can also remove it. All three check for SSNs, and the server re-checks.
- **A newer statement replaces an older one.** The import never overwrites a newer preference (D19). The editor and the log form are explicit human choices, so they replace whatever is there, and say so.
- **Shown where someone is about to reach out:** "Before you reach out", and the top of the Log contact form. It never changes or pre-fills a contact type (P6).
- **Stored as JSON text on the student** (T2). Preferences saved in the earlier shape are read as the new one, so existing databases (including GDS staging) need no data migration.

**P10: The queue sorts by its first six columns,** like the Students page: Rank, Student, Risk, Last contact, Follow-up and Score. _(Adam asked, 2026-10-08.)_
- **Rank always shows the outreach order,** whatever the sort, so sorting never hides who's first.
- **Each column's first click gives the useful order:** highest risk, longest without contact, soonest follow-up, highest score. Students with no follow-up sort last both ways.
- **The sort lives in the URL,** with the default left out so the plain queue keeps a plain address.

**P11: "Back to" returns to the exact list.** The student page's back link used to fall back to the unfiltered Students page, because `document.referrer` doesn't change on in-app navigation (found by a code review). Each list page now records its full address (filters, sort, page) for the browser tab, and the link says where it goes: "Back to Students" or "Back to Outreach Queue".

## Technical decisions

**T1: Package manager is npm.** _(Revised 2026-10-08. The first version was pnpm 12.3.4, as pinned by v0.)_
- **Why the change:**
  - GDS installs with npm and was ignoring `pnpm-lock.yaml`, so the deployed app got whatever versions npm resolved that day, not the ones we tested.
  - npm ships with every Node install, so someone cloning the repo needs nothing extra.
- **Locking:** `package-lock.json` pins versions everywhere.
- **Install scripts:** npm's `allowScripts` field in `package.json` approves `esbuild` and `unrs-resolver` (needed by `tsx` and ESLint). It denies `better-sqlite3`'s build step, which isn't needed: the package ships precompiled binaries for Windows, macOS and Linux (x64/ARM, glibc/musl), so nothing is compiled on any machine, including GDS.
- **Node:** 22.12 or newer (`engines`), required by `better-sqlite3` 13 and Vitest 5. Node 20 reached end of life in April 2026.

**T2: Storage is a SQLite file by default, or Postgres when `DATABASE_URL` points to one; queries go through Kysely.** _(Revised 2026-10-08. The first version chose Postgres + Drizzle everywhere.)_
- **Fresh clone:** needs no database server and no secrets. With `DATABASE_URL` unset, the app uses `data/app.db` (gitignored), created and filled by `pnpm seed`.
- **On GDS:** `DATABASE_URL` is a `postgres://` address supplied by the environment, and the same code runs against Postgres. No connection details are ever committed.
- **Why Kysely over Drizzle:** Kysely runs the same queries and migrations against both databases; Drizzle needs a separate schema per database.
- **Portability rules:** only SQL both databases share. Dates and JSON are stored as text, true/false as 0/1, IDs as text.
- **Testing:** unit tests run against SQLite. The Postgres path is checked against Postgres in Docker before deploying.

**T3: One class-name helper.** `components/ui/alert-dialog.tsx` imports `cn` from the `cn` npm package (a real shadcn-ui package), while every other component uses `@/lib/utils`. Standardize on `@/lib/utils` and drop the extra dependency. _(Applied in Phase 2.)_

**T6: ESLint 9, not 10.** Next 16.4's lint config depends on plugins (`eslint-plugin-react`, `-import`, `-jsx-a11y`) that don't support ESLint 10 yet. ESLint 9 is past its support window, but it only runs on developer machines and never ships with the app. Revisit when the plugins catch up.

**T7: The reference date is `NEXT_PUBLIC_REFERENCE_DATE`, defaulting to 2026-10-05.** The plan called it `REFERENCE_DATE`, but client components (the log-contact form's default date) import `lib/config.ts` too. A server-only variable would let the browser and server disagree about "today". An invalid value falls back to the default with a warning.

**T8: Accepted for now: 9 "high" `npm audit` advisories, all the same issue.**
- **The issue:** `braces` ≤ 3.0.3 ([GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)), stack exhaustion from deeply nested glob patterns.
- **How it gets in:** through `fast-glob`, used by ESLint's Next plugin and by the `shadcn` package.
- **Why it can't be fixed yet:** no patched `braces` has been published (3.0.3 is the latest), so `npm audit fix` can't resolve it, despite reporting that a fix is available.
- **Why the risk is acceptable:** both paths are build-time tooling, and nothing in the app passes user input to glob matching. `shadcn` moved to dev dependencies, since only its stylesheet is used, at build time.
- Revisit when `braces` publishes a fix.

**T4: Import rules are plain functions shared by browser and server.** The browser re-checks a row the moment it's edited, so highlighting updates instantly. The server re-runs the same functions on commit and refuses anything still blocking, so the browser never has the final say.

**T5: The seed script is an import with every suggestion accepted.** `pnpm seed` sends the sample files through the same rules and records each fix as accepted by the seed script. A fresh clone, the hosted demo and the end-to-end tests all start from the same known state, produced by the same code a person would use.

**T9: The app's pages live in a route group, `app/(app)/`.** Its layout holds the shell (sidebar, top bar, welcome dialog). The help pages sit outside it with their own layout. URLs are unchanged: a route group only groups files.

**T10: Browser tests run against a production build, on their own database.**
- **The server:** Playwright builds the app and starts `next start` on port 3100, with `DATABASE_URL=file:./data/e2e.db`, seeded fresh. The dev database is never touched, and the tests see what a user would see, not the dev server.
- **One worker, in order:** the specs share one database. Each spec reloads the sample data before it starts. The import spec, which empties the database, also reloads it when it finishes.
- **Accessibility:** axe runs on every page and on each dialog and panel state. Anything worse than "minor" fails the run. Checks wait for animations to finish, because a panel measured mid-fade fails contrast checks it passes when settled.
- **The screenshot walk is a second Playwright project** (`docs`), kept out of `test:e2e` because it rewrites committed files. It fails on any browser error, so it doubles as a sweep of every screen.
