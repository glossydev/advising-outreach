# Import design

**Status:** draft for Adam's review (2026-10-08). Nothing here is built yet.

## Why the import works this way

The audit ([DATA_AUDIT.md](DATA_AUDIT.md)) found real problems in the sample data: mixed date formats, an SSN in a note, a likely duplicate student, and contact preferences buried in note text. Cleaning those files once would fix this dataset and nothing else. The next spreadsheet an advising office exports, or a new dataset handed over in the interview, will be broken in different ways.

So the import itself does the work, every time:

1. **Source files are never changed.** The CSV is read, never rewritten.
2. **Nothing changes silently.** Every changed value is a fix the person importing accepted: one cell at a time, or "apply to all like this". Each one is recorded with the original value, the new value, the rule that flagged it, and whether a person or the seed script accepted it.
3. **The rules live in code, one per decision.** Each data decision in [DECISIONS.md](DECISIONS.md) is one named rule. The same rules run on CSV import, on notes typed into the app (where they apply), and in the seed script.
4. **The server has the final say.** The browser holds the draft while the user fixes it. Commit re-runs every rule on the server and refuses anything still blocking.

## The flow

**Step 1: What are you importing?** Students or Contact notes. Notes are checked against the students already in the database, so students come first. The notes option says so if none exist yet.

**Step 2: Choose the file.** Upload a CSV, or use the prototype panel below.

**Step 3: Match columns.** Headers are matched automatically by name and by known alternatives (`credits` ↔ `credits_earned`, `method` ↔ `contact_type`, `notes` ↔ `note_text`). The user confirms the matches or changes them. A required field with no matching column has to be mapped before continuing. Extra columns are listed and ignored.

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

The panel is controlled by an environment variable (`ENABLE_PROTOTYPE_TOOLS`, on in this repo). A real deployment would turn it off and the routes behind it would refuse requests.

## Seeding

`pnpm seed` runs the same import on the sample files and accepts every suggested fix. Rows with a blocking issue and no suggestion are excluded and reported. Every fix is recorded as accepted by the seed script. This gives a fresh clone, the hosted demo and the end-to-end tests the same known starting point, using the same rules a person would use.

## How it fits together

| Piece | Where | What it does |
|---|---|---|
| Rules | `lib/import/rules/` | One file per rule: a check that returns issues, and an optional suggested fix. Plain functions, no database access, unit-tested with tiny inline CSVs. |
| Scan | `lib/import/scan.ts` | Parses the CSV, matches columns, runs the rules against the rows plus a snapshot of what's already in the database (existing IDs, names). |
| API | `app/api/import/*` | `POST /scan` (an uploaded file or a sample name) returns rows, column matches and issues. `POST /commit` re-validates, then writes the rows, the import record and every fix in one transaction. Prototype routes: `POST /sample-reset`. |
| Storage | Postgres | `imports` (who, when, kind, file name and SHA-256, row counts) and `import_fixes` (rule, row, column, original value, final value, accepted by). For the SSN rule the original value is stored masked. |
| UI | `/import` (new) and `/data-quality` | The step-by-step import, then the history and fixes report. v0's replace-everything upload card is retired; its severity badges and per-rule issue list are reused for the report. |

## Assumed column meanings

The README that should describe the columns arrived empty, so these meanings are inferred from the headers and values (see the column profiles in DATA_AUDIT.md). They are what the rules validate against.

| File | Column | Assumed meaning | Required |
|---|---|---|---|
| students | `student_id` | Unique student ID, `S` + 4 digits in this data | yes |
| students | `first_name`, `last_name` | Student's name | yes |
| students | `email` | Student's email | yes |
| students | `major` | Declared major; "Undeclared" is a valid value | yes |
| students | `class_year` | Freshman / Sophomore / Junior / Senior (Graduate also accepted) | yes |
| students | `credits_earned` | Completed units, which is what UA class standing is based on | yes |
| students | `gpa` | Cumulative GPA, 0.0–4.0 | no |
| students | `advisor` | Assigned advisor's last name | yes |
| students | `last_contact_date` | Last contact as recorded in the spreadsheet; kept as the source value, while the app works out last contact from the notes | no |
| students | `risk_flag` | Low / Medium / High; who sets it and how is unknown | yes |
| notes | `note_id` | Unique note ID, `N` + digits in this data | yes |
| notes | `student_id` | The student the note is about | yes |
| notes | `contact_date` | Date of the contact | yes |
| notes | `contact_type` | Phone / Email / In person / Zoom | yes |
| notes | `advisor` | The advisor who made the contact | yes |
| notes | `note_text` | Free-text note | yes |

## Open questions for Adam

1. **What happens to data already in the database?** _(Recommendation: add and update.)_
2. **Column matching step, or require exact headers?** _(Recommendation: matching step.)_
3. **Does the app start seeded or empty?** _(Recommendation: seeded.)_
