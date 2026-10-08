# AI usage log

Running record of how AI tools were used on this project: what they did, what they got wrong, and where a human had to decide. Newest entries at the bottom.

Tools in play:
- **v0.dev** generated the front-end design and a mock data layer (Next.js App Router, shadcn/ui). It never saw the real CSVs.
- **Claude (planning session)** turned the brief into a phased build plan. It also never saw the CSVs or the v0 export, so file names and some assumptions in the plan were guesses.
- **Claude Code (Opus 5.5)** does the hands-on work in this repo, phase by phase. Adam reviews each phase before the next one starts.

---

## 2026-10-07 — Phase 0: unpack and orient

**What Claude Code did**
- Unzipped the v0 export to the project root and the hiring team's dataset to `data/source/` (originals untouched; SHA-256 recorded below).
- Compared the CSV headers to the v0 types in `lib/types.ts` and read the v0 import, scoring, and data-access code.

**What turned out to be wrong in earlier AI output**
- *Planning session:* expected the dataset's `README.txt` to hold column descriptions. The file is **0 bytes** in the zip we received. The CSV headers are the only schema we have.
- *v0:* `lib/import.ts` was written against invented column names. Run against the real files it would (by manual reading at this point; measured in Phase 1, see below):
  - read `credits` instead of `credits_earned`, so every student would import with 0 credits;
  - read `method`, `summary`, `body` instead of `contact_type` and `note_text`, so every note would import with empty text and method "other";
  - fail to parse "Aug 25, 2026" and "30-Aug-2026" style dates, so about 7 of 57 notes would be **dropped** as errors and about 7 students' last-contact dates treated as unreadable.

  None of this would crash. The app would render and look fine while showing wrong data. This is the main reason the plan has a data audit before any application code.
- *v0:* `components/ui/alert-dialog.tsx` imports `cn` from an npm package named `cn` (`cn@^0.4.0`), while every other component uses the project's own `@/lib/utils` helper.
  - *Claude Code got this wrong at first:* the Phase 0 report called `cn` "a hallucinated dependency". Checking the npm registry before installing showed it is a real package published by shadcn-ui (a compiled replacement for clsx + tailwind-merge). The real issue is inconsistency (two class-merging helpers), not a supply-chain risk. Corrected in the follow-up report.
- *v0:* `next.config.mjs` sets `typescript.ignoreBuildErrors: true`, which would hide type errors at build time.

**Where human judgment is needed (raised with Adam, not decided by Claude)**
- Whether to ask the hiring team about the empty README, or proceed and document the assumption.
- Note N041 contains a Social Security number and a confidential mental-health disclosure the student asked to keep private. How the tool and the public repo should handle that is a policy call, not a parsing detail.
- S1021 "Grace Okonkwo" and S1050 "Gracie Okonkwo" look like the same person entered twice under two advisors. Merging records is not something to automate silently.

**Source file fingerprints (SHA-256)**
- `students.csv` — `C9A181E31779AB69EAC98E7182C8FA2C85A2EE8328C0C57A7CD0C6FEE1608669`
- `contact_notes.csv` — `6CFEA8FCD3B0766C65910721FA6775B62304F02AEFB9B772FAD8EDCA3992EED0`
- `README.txt` — `E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855` (the hash of an empty file)

---

## 2026-10-07 — Decisions after Phase 0 (Adam)

- **Precedence rule set by Adam:** when the v0 scaffold disagrees with the dataset or the brief, the dataset and brief win. v0 only had a high-level description of the data.
- **Storage changed from the plan's SQLite to Postgres.** Adam will host the finished app on his own deploy server (GDS), which provides Postgres. Claude chose the local-development setup (Postgres in Docker, same dialect as production); see DECISIONS.md T2.
- **Repo stays private until submission**, then goes public.
- **Package manager left to Claude:** pnpm, as pinned by v0 (DECISIONS.md T1).
- Adam is raising the empty README with the hiring team himself.

## 2026-10-07 — Phase 1: data audit

**What Claude Code did**
- Wrote `scripts/audit.ts` (`pnpm data:audit`), which reads the untouched CSVs and *generates* `docs/DATA_AUDIT.md`. Every count in the report comes from code, not from a model summarizing the data. 73 checks: 15 findings, 58 clean.
- Went beyond the checklist in the plan where reading the data suggested it: personal identifiers and sensitive disclosures in note text, contact preferences buried in notes, open items ("no reply", "pending"), dates written into note text, near-duplicate students by name similarity, near-identical notes, and risk flag vs. GPA consistency.
- Looked up the University of Arizona's own class-standing thresholds (30/60/90 completed units, UA catalog) for the credits check instead of assuming generic ones.
- Masked the SSN and withheld sensitive note text *in the audit report itself*, since the report lives in the repo.

**What AI got wrong, now measured**
- *Planning session:* expected `last_contact_date` to disagree with the notes for some students. It doesn't: after normalizing dates, **all 47 students with both agree** (the other 3 have neither). 15 of those 47 write the same date in different formats in the two files, so a naive string comparison would have reported 15 false disagreements.
- *v0's import pipeline*, run unchanged against the real CSVs (scratch script, not committed):
  - all **50 of 50** students imported with 0 credits (`credits` vs. `credits_earned`);
  - **7 of 57 notes dropped** as unparseable ("Mar 05, 2026", "25-Jun-2026" styles);
  - all **50** surviving notes had empty text and method "other" (`summary`/`body`/`method` vs. `note_text`/`contact_type`);
  - S1003 Sofia Hernandez came out "never contacted", because both her CSV date and her only note use "Aug 25, 2026". She was contacted 41 days before "today".
  None of this would have crashed. It would have rendered plausible-looking wrong data.

**Claude Code's own mistakes this phase**
- The first run's sentence splitter broke "Dr. Alvarez" after "Dr.", garbling one quoted sentence; the first fix attempt was also wrong (lookbehind missing the period). Caught by reading the generated report, not by a test.
- Left in on purpose: the similar-notes check flags N044/N048 ("placement confirmed") at the threshold, and the deadline check flags N034 ("Sent deadlines") and N054 ("defense scheduled"), which have no actual date. These are weak matches. They are shown rather than tuned away, so the checks aren't fitted to the answers.

**Tooling notes**
- pnpm 12 refused to run esbuild's install script (needed by `tsx`) until approved. Approved esbuild by name only, not `--all`.

**Waiting on human judgment:** the 15 findings in DATA_AUDIT.md, each with options and a blank Decision line.

## 2026-10-08 — Import redesign (Adam overrode Claude's approach)

**What Claude proposed:** for each audit finding, an automatic transformation during import (convert the dates, mask the SSN, set the follow-up date), logged afterwards for review on the Data Quality page.

**What Adam decided instead:** the importer should *flag* bad data, explain why each value failed, suggest a fix, and let the person importing accept it, change it, or exclude the row. Source files stay untouched. His reasoning: "teach the system how to fish" instead of cleaning this one dataset, because the interview may bring a new dataset that's broken in different ways. He also asked for a clearly labeled prototype-only panel that loads the sample files without uploading.

**What Claude did with it:**
- Turned the 15 audit findings into a draft catalog of 23 import rules and 2 scoring rules (DECISIONS.md D1–D25).
- Wrote the flow and architecture in IMPORT_DESIGN.md:
  - choose type, choose file, match columns, review and fix, commit;
  - one rule per file, shared by browser and server;
  - seed = the same import with every suggestion accepted.
- Added generic rules the sample data doesn't trigger (duplicate IDs, unknown students, invalid numbers), because a different dataset might.

**Claude changed one of its own Phase 1 recommendations:** last contact is now *the later of* the newest note and the spreadsheet date, not always the newest note. A newer spreadsheet date means a contact nobody wrote up; ignoring it would push an already-contacted student back to the top of the queue.

**Flagged for Adam:** the importer is now the biggest feature in the app and sits in "extended" scope, not "required". The build order puts the required features first.

## 2026-10-08 — Adam's answers, and Phase 2: get the v0 app running

**Decided by Adam** (recorded as P1–P4 and a revised T2 in DECISIONS.md):
- Imports add and update, never delete. The page must explain this and say how to reset for a clean import.
- Column matching should be as close to automatic as possible: a brief review that highlights only the non-exact matches.
- The app starts with the data already imported, and a first-visit welcome dialog explains the app, with UA branding and a "don't show again" option.
- **Storage requirement changed:** a fresh clone must work with nothing configured, and no connection details may go in the repo. So SQLite is the default and Postgres is used when `DATABASE_URL` points to one. Claude then swapped the planned Drizzle for Kysely, because Kysely runs the same queries against both databases.

**What Claude Code did**
- Created the private GitHub repo. The first commit is the v0 export **as generated**, so the history shows exactly what was changed afterwards.
  - The original zip was no longer on disk. `package.json` and `pnpm-workspace.yaml` were restored from their pre-edit contents; the lockfile, already rewritten by pnpm, went into the second commit. The commit message says so.
  - Added a `.gitattributes` rule after noticing git's line-ending setting would have rewritten the source CSVs on commit, invalidating their recorded hashes.
- Kept the hiring team's brief (`instructions.txt`) out of the repo, which will become public.
- Fixed what was broken in the v0 export:
  - `next.config.mjs` had `ignoreBuildErrors: true`. Removed; the build and `tsc` both pass with 0 type errors.
  - The `cn` import in `alert-dialog.tsx` now uses `@/lib/utils`, and the extra package is gone.
  - Removed `@vercel/analytics` (Vercel-only; the app is hosted on GDS).
  - Set up ESLint (the export had none). It found one real issue, a state update inside an effect in the upload card, which is fixed.
- Made the reference date configurable (`NEXT_PUBLIC_REFERENCE_DATE`) and wrote `.env.example` (no secrets) and `CLAUDE.md`.
- Opened all four pages in Chrome on v0's mock data: all render with no console errors.

**What Claude got wrong this phase**
- In Phase 0 Claude called the `shadcn` package an unneeded command-line tool. It's actually imported by `globals.css` for styles, so it stays.
- Claude first installed ESLint 10, the latest. Next's lint plugins only support up to 9, so it's pinned to 9 (T6).
- Claude tried to find a student's detail-page link by scraping HTML; rows navigate on click, not via links. Switched to checking the pages in a real browser.

**Noticed for later (Phase 5 UI work):** at a ~1230px-wide window the outreach-queue table is wider than the page, and the "Log contact" column is cut off behind a horizontal scroll.

## 2026-10-08 — GDS access check, and switching to npm

**What Claude Code did**
- Adam created GDS deployment 23. Claude verified access through the deploy tools and over HTTPS:
  - staging serves the latest commit;
  - the Postgres database exists and answers read-only queries (empty, as expected);
  - the connection string is only reachable from the GDS box;
  - production isn't set up yet.

  Secrets from the env file were read but not repeated anywhere.
- Reading GDS's build log showed it installs with **npm**, not pnpm, so it ignored our lockfile.
- Switched the project to npm (T1):
  - `package-lock.json`, with install-script approvals in `package.json` (`allowScripts`);
  - Node 22.12+;
  - re-verified typecheck, lint and build.

**What Claude got wrong**
- In Phase 0 Claude kept pnpm because v0 had shipped a pnpm lockfile, without checking how the deployment target installs packages. GDS's build log is what caught it.
- `npm audit fix` reported a fix for the 9 high advisories, but there isn't one: the vulnerable package (`braces` 3.0.3) has no patched release. Claude checked the registry instead of trusting the tool, and recorded the risk as accepted, with reasoning (T8).
- An install-script listing suggested `better-sqlite3` would compile C++ code on install (`node-gyp rebuild`), which could break a deploy machine without a compiler. Inspecting the package showed it ships precompiled binaries and never compiles. The build step is denied explicitly so it stays that way.

## 2026-10-08 — Phase 3: database, import rules, seed, scoring, tests

**What Claude Code did**
- **Database layer:** one Kysely client that picks SQLite or Postgres from `DATABASE_URL`, plus migrations that use only types both databases accept (T2).
- **Import engine** (`lib/import/`), all plain functions with no database access:
  - CSV parsing that never alters a value;
  - automatic column matching, labeled exact / formatting / alias / guess for the review screen (P2);
  - date reading that refuses to guess between month-first and day-first;
  - **23 rules, one file each**, named exactly as in DECISIONS.md D1–D23;
  - applying fixes (one, or "apply to all"), the commit plan, and a fix history the server builds itself by comparing the file as uploaded with the rows as committed.
- **Services:** loading what's in the database, committing an import in one transaction, seeding, and reset. `npm run seed` and `npm run db:reset` work on both databases.
- **Scoring** (`lib/scoring.ts`): weights in one table, a plain-language reason for every point, last contact = the later of the newest note and the spreadsheet (D22).
- **96 Vitest tests:**
  - per rule: fires, suggests, stays quiet;
  - dates, column matching, fixes and history, scoring;
  - the full sample import on SQLite **and on Postgres 16 in Docker**.

  One test reads DECISIONS.md and fails if any rule's entry is missing or misnamed, so the docs and the code can't drift apart.

**Verified, not assumed**
- Seeding the hiring team's files: 50 students and 57 notes, 0 excluded. Every fix fired exactly where the audit predicted (8+11 date conversions, the N/A, Grace/Gracie, and N041's SSN, sensitivity and follow-up date, N001's phone-only preference).
- No SSN-shaped number exists anywhere in the database, including the fix history (checked by query and by test, on both databases).
- The SHA-256 recorded for each import equals the audit's fingerprint for the original file, so the import read the files byte-for-byte.
- The outreach ranking for the top of the queue and for S1002 matches a hand calculation, written into a test.

**Judgment calls Claude made within the agreed decisions** (flagged for Adam)
- "No contact on record ranks first" (D24) is implemented as a **separate tier in the sort**, not by inflating the score. A no-contact Low-risk student honestly scores 40, while a contacted High-risk student can score 100. Listing the no-contact group first keeps every score truthful and still puts them at the top.
- D25 counts "no reply", "awaiting a reply" and "left voicemail", but not "pending". Building it showed the audit's 5th match (N019, "Financial aid appeal pending") is waiting on an office, not the student. DECISIONS.md corrected to 4.

**What Claude got wrong this phase**
- Two mistakes caught in Claude's own review, before any test ran:
  - The first fix-history draft would have recorded N041's sensitivity decision (D18) against the SSN fix's text change.
  - The first "clean file" test fixture would have tripped the last-contact rule (D22).
- Docker Desktop wasn't running and wasn't in its default install folder; it had to be found and started.
- All 89 SQLite tests and all 96 with Postgres passed on their first run.

## 2026-10-08 — Phase 4: API, service layer, pages on real data

**What Claude Code did**
- **Types follow the dataset** (G1): risk flags Low/Medium/High, contact types Phone/Email/In person/Zoom, one `note_text` per note, reasons that carry their points. Every page and component was moved over to these.
- **Service layer** (`lib/services/`) for students, notes, data quality, import scan/commit and prototype tools.
- **Nine API routes**, all thin: Zod validation, one error shape, documented with real responses in `docs/API.md`.
- **The pages read the database** through the same services. Logging a note goes through the API, and the page refreshes from the server.
- **v0's mock data and mock pipeline deleted**, along with its replace-everything upload card. Phase 5's import page takes its place.
- **The data decisions are now visible in the UI:**
  - sensitive notes collapsed, with their follow-up date still showing (D18);
  - a possible-duplicate banner on both students' pages (D15);
  - the saved contact preference, and a warning when an advisor picks a conflicting channel (D19);
  - "No contact on record" wording and grouping (D24);
  - where the last-contact date comes from (D22);
  - a per-student "Data notes" card showing what the import changed.
- **v0's fake AI summary card replaced** with a deterministic "Before you reach out" card (P5).

**Verified, not assumed**
- **Fresh database:** deleted the local file and started the app. The first request created the database and imported the sample data by itself.
- **Smoke test of every endpoint**, including the error paths:
  - 400 for a bad filter, wrong types or broken JSON;
  - 422 for an SSN or a future date, with a message per field;
  - an upload with renamed headers, refused while issues were unresolved, committed after the fixes;
  - reset.
- **Every page in Chrome:**
  - the queue (no-contact students first), Camila's collapsed sensitive note, Jordan's phone-only preference and open reply, Grace's duplicate banner, the import history;
  - logging a note on Jordan's page: the preference warning appeared, the note saved as N058, the score dropped from 90 to 40, and there were no console errors.
- 104 tests pass, including 10 new service-layer tests.

**What went wrong, and what it exposed**
- **Claude's own smoke-test script hung.** In PowerShell 5.1, `Get-Content -Raw` attaches hidden metadata to strings, so `ConvertTo-Json` ran out of memory and sent an empty request body. That exposed a real bug: **an empty or broken JSON body returned a 500.** Now a 400 `invalid_json`.
- **Mixed line endings** (a Unix-style header, Windows-style rows) left a stray carriage return on the last value of each row. The importer coped (it suggested "Low" for `"low\r"`), but the parser now treats any line ending as a row break. Test added.
- **Re-scanning the sample students re-flagged Grace/Gracie as possible duplicates,** although they were already linked. The rule now sees links from earlier imports. Test added.
- **The sidebar still said "Mock data only."** Caught in the browser walkthrough.

**Judgment calls Claude made** (recorded as P5, P6; flagged for Adam)
- Removed the AI summary card rather than leave a fake one in front of reviewers.
- The log-contact form follows the dataset:
  - one note field;
  - defaults to the student's preferred channel;
  - warns rather than blocks on a channel conflict or sensitive wording;
  - blocks future dates and SSNs.

## 2026-10-08 — Adam's report: local dev server stuck recompiling

**What Adam saw:** the local app (not GDS) looping. The dev log confirmed it: about 800 cycles of `GET /` → `Compiled in 1ms` → `GET /`.

**What Claude tried, and what it ruled out**
1. **SQLite's files changing on every read and tripping the file watcher.** Plausible, since `app.db-shm` was the most recently modified file. A test with no browser attached showed no recompiles. Claude then realized that test proved nothing, because Turbopack only recompiles when a browser is connected. Re-tested with a tab connected: still no recompiles. **Ruled out.**
2. **A production build into the same `.next` folder just before starting the dev server**, which was Claude's exact sequence. Repeated with a tab open: one reload on restart, then quiet. **Ruled out.**
3. **Two dev servers on one folder.** Only one was running. **Ruled out.**
4. **The app's own code refreshing in a loop.** The only `router.refresh()` runs after saving a note, and the advisor server action only runs on a change. A note saved with a tab connected caused no loop. **Ruled out.**

**Result:** not reproducible on a fresh server (Adam hasn't reported it since). The leading remaining explanation is a browser tab left in a bad state after Claude stopped and restarted the server three times while it was open. That's unconfirmed, and Adam was asked for details if it recurs rather than given a guess as a fix.

## 2026-10-08 — The real README arrives

Adam asked the hiring team about the empty README.txt, and they sent the full file. Claude compared it with every assumption made so far (IMPORT_DESIGN.md "Column meanings").

**It confirmed** the inferred meanings: column names and types, the four contact types, "Undeclared" and "Pre-Nursing" as valid majors, credits as total completed, the YYYY-MM-DD format. It also states that all the data is synthetic, emails included (on the reserved `example.edu` domain), which settles the earlier question about committing it to a public repo.

**It corrected two things, both from AI output:**
- **"Blank = never contacted."** Claude had proposed "No contact on record" (D24) on the grounds that a spreadsheet can't prove a negative, and Adam had accepted it. The data owner's definition wins (G1). The label is now "Never contacted" everywhere; ranking is unchanged.
- **Class years are Freshman–Senior.** v0 had added "Graduate", and the import had kept it. Removed.

**Also:** "risk flag as set by the advising office" answers the audit's open question about where the flag comes from.

**What changed in the repo:** the README is saved in `data/source/`, with the empty original kept in git history. The field descriptions on the column-matching screen now use the README's wording. The audit report was regenerated with a note recording the README's history.
