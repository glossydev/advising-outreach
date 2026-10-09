# Import design

**Status:** agreed 2026-10-08 (decisions G2, P1, P2, T4, T5 in [DECISIONS.md](DECISIONS.md)).
- **Built:**
  - the rules, column matching, fixes, commit and fix history, seed and reset (Phase 3);
  - the API (Phase 4);
  - the import page at `/import`, including the prototype panel's "Reload the sample data" (Phase 5).

## Why the import works this way

The audit ([DATA_AUDIT.md](DATA_AUDIT.md)) found real problems in the sample data: mixed date formats, an SSN in a note, a likely duplicate student, and contact preferences buried in note text. Cleaning those files once would fix this dataset and nothing else. The next spreadsheet an advising office exports, or a new dataset handed over in the interview, will be broken in different ways.

So the import itself does the work, every time:

1. **Source files are never changed.** The CSV is read, never rewritten.
2. **Nothing changes silently.** Every changed value is a fix the person importing accepted: one cell at a time, or "apply to all like this". Each one is recorded with the original value, the new value, the rule that flagged it, and whether a person or the seed script accepted it.
3. **The rules live in code, one per decision.** Each data decision in [DECISIONS.md](DECISIONS.md) is one named rule. The same rules run on CSV import, on notes typed into the app (where they apply), and in the seed script.
4. **The server has the final say.** The browser holds the draft while the user fixes it. Commit re-runs every rule on the server and refuses anything still blocking.

## The flow

**Before step 1: how import treats existing data (P1).** The top of the import page says, in plain words: importing **adds new records and updates existing ones; it never deletes anything**. Students are matched by ID. Notes already imported are skipped. For a completely clean import, use **Reset database** in the prototype tools box first, or run `pnpm db:reset` locally.

**Step 1: What are you importing?** Students or Contact notes. Notes are checked against the students already in the database, so students come first. The notes option says so if none exist yet.

**Step 2: Choose the file.** Upload a CSV, or use the prototype panel below.

**Step 3: Check the column matches (P2).** Meant to take a few seconds.
- Every expected field is matched automatically, in this order:
  1. exact header (`credits_earned` = `credits_earned`);
  2. same name with different formatting (`Credits Earned`);
  3. a known alternative (`credits`, `units_earned` → `credits_earned`; `method` → `contact_type`; `notes`, `body` → `note_text`);
  4. the closest remaining header by name.
- The screen is one compact list: expected field, the CSV column it was matched to, and two sample values from the file so a wrong match is obvious.
- **Exact matches are plain.** Everything else is highlighted, with the reason ("matched by alternative name", "best guess"), sorted to the top. The eye goes straight to the few lines that need a look.
- A required field with no match is red and needs a column picked from a dropdown before continuing.
- CSV columns that weren't used are listed underneath as "will be ignored".
- If every field matched exactly, the screen says so and shows a single **Continue**.

**Step 4: Review and fix.** A preview grid of every row.
- A summary bar shows rows ready, rows with blocking issues, rows with warnings, and excluded rows.
- Flagged cells are highlighted by severity. A filter switches between all rows, rows needing attention, and one rule at a time.
- Clicking a flagged cell opens a panel with:
  - the rule and a plain-language reason;
  - the original value;
  - the suggested fix, if there is one;
  - a box to type a different value;
  - **Apply to all N like this**, where the rule allows it.
- Row-level issues, such as a possible duplicate student, sit on the row with their own choices. Any row can be excluded.
- Edits are re-checked immediately in the browser (the rules are plain functions shared by browser and server).
- An SSN-shaped number is shown masked even in the preview.

**Step 5: Commit.**
- The commit button stays disabled while any included row has a blocking issue.
- The confirmation lists any warnings being imported as they are.
- The result links to the Data Quality page, which keeps the history of every import and every fix.

### Severity

| Level | Meaning |
|---|---|
| **Blocking** (error) | The row can't be imported as it is. Accept a suggested fix, type a value, or exclude the row. Most blocking issues come with a one-click suggestion. |
| **Warning** | Importable as is. A suggested fix is offered. |
| **Info** | Context only. No action needed. |

## Prototype-only panel

On the import page, in a clearly marked box labeled **Prototype only: not part of a production build**:

- **Use the sample students.csv** / **Use the sample contact_notes.csv**: loads the hiring team's files from `data/source/` on the server and sends them through exactly the same steps as an upload.
- **Reset the database to empty**: so the importer can be demonstrated from a clean start, with a confirmation step.
- **Reload the sample data**: back to the starting point in one step (empty, then the sample files imported with every suggestion accepted). Mainly for the hosted demo, where there's no command line.

The panel is controlled by an environment variable (`ENABLE_PROTOTYPE_TOOLS`, on in this repo). A real deployment would turn it off and the routes behind it would refuse requests.

## Seeding

`pnpm seed` runs the same import on the sample files and accepts every suggested fix. Rows with a blocking issue and no suggestion are excluded and reported. Every fix is recorded as accepted by the seed script. This gives a fresh clone, the hosted demo and the end-to-end tests the same known starting point, using the same rules a person would use.

## How it fits together

| Piece | Where | What it does |
|---|---|---|
| Rules | `lib/import/rules/` | One file per rule: a check that returns issues, and an optional suggested fix. Plain functions, no database access, unit-tested with tiny inline CSVs. |
| Scan | `lib/import/csv.ts`, `columns.ts`, `validate.ts` | Parses the CSV without changing any value, matches columns, builds editable rows, and runs the rules against them plus a snapshot of what's already in the database (`lib/services/existing-data.ts`). |
| Fixes and commit | `lib/import/resolve.ts`, `plan.ts`, `history.ts`, `lib/services/import-service.ts` | Applying suggestions (one, or "apply to all"), turning reviewed rows into writes, and building the fix history by comparing the file as uploaded with the rows as committed. |
| API | `app/api/import/*` | `POST /scan` (an uploaded file or a sample name) returns rows, column matches and issues. `POST /commit` re-validates, then writes the rows, the import record and every fix in one transaction. Prototype routes: `POST /sample-reset`. |
| Storage | SQLite file by default, Postgres via `DATABASE_URL` (T2) | `imports` (who, when, kind, file name and SHA-256, row counts) and `import_issues` (rule, row, column, original value, final value, resolution). For the SSN rule the original value is stored masked. |
| UI | `/import` (new) and `/data-quality` | The step-by-step import, then the history and fixes report. v0's replace-everything upload card is retired; its severity badges and per-rule issue list are reused for the report. |

## Column meanings

These are from the dataset's README (`data/source/README.txt`), and they are what the rules validate against. The README first arrived empty, so for a day these meanings were inferred from the headers and values. When the full file came, it confirmed them except for two corrections, marked below.

| File | Column | Meaning | Required |
|---|---|---|---|
| students | `student_id` | Unique ID (`S` + 4 digits in this data) | yes |
| students | `first_name`, `last_name` | Student's name | yes |
| students | `email` | Student's email (fictional, `example.edu`) | yes |
| students | `major` | Major; "Undeclared" and "Pre-Nursing" are valid values | yes |
| students | `class_year` | Freshman / Sophomore / Junior / Senior. _Corrected: v0's "Graduate" isn't a value._ | yes |
| students | `credits_earned` | Total credits completed (what UA class standing is based on) | yes |
| students | `gpa` | Cumulative GPA (4.0 scale) | no |
| students | `advisor` | Assigned advisor (last name) | yes |
| students | `last_contact_date` | Most recent outreach, YYYY-MM-DD. **Blank = never contacted.** _Corrected: we had said "no contact on record"._ Kept as the source value; the app uses the later of this and the newest note (D22). | no |
| students | `risk_flag` | Low / Medium / High, as set by the advising office | yes |
| notes | `note_id` | Unique note ID, `N` + digits in this data | yes |
| notes | `student_id` | The student the note is about | yes |
| notes | `contact_date` | Date of the contact | yes |
| notes | `contact_type` | Email / Phone / Zoom / In person | yes |
| notes | `advisor` | The advisor who made the contact | yes |
| notes | `note_text` | Free-text note | yes |

## Resolved questions

1. **What happens to data already in the database?** Add and update, never delete; the page explains this and how to reset (P1).
2. **Column matching step, or require exact headers?** Automatic matching with a brief, highlighted review (P2).
3. **Does the app start seeded or empty?** Seeded with the sample data (P3).
