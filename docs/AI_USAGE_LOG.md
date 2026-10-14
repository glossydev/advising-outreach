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

## 2026-10-08 — Phase 5: the import page and the welcome dialog

**What Claude Code did**
- **`/import`, a four-step import** (IMPORT_DESIGN.md):
  1. Choose a file.
  2. Check columns: non-exact matches are highlighted and sorted first (P2).
  3. Review and fix: flagged cells highlighted by severity. A row panel shows each issue's reason and decision number, one-click fixes, "apply to all like this", "keep it as it is" and "leave this row out". Edits are re-checked instantly in the browser with the same functions the server uses (T4).
  4. Done.
- **"How importing works" panel** (P1): adds and updates, never deletes, and how to start clean.
- **Prototype-only panel:** sample files, reset, and a new "Reload the sample data" (with an API route) so the hosted demo can be put back without a command line.
- **Welcome dialog** (P4), reopenable from a help button. The Import nav link, an "Import data" button on Data Quality, and proper empty states for a reset database.

**Verified in Chrome, end to end through the interface**
1. Reset the database.
2. Imported the sample students: columns all exact; 9 rows blocking, 1 warning; accepted the suggested fixes; 50 imported.
3. Imported the sample notes: 12 rows blocking, 2 warnings. N041's panel showed the SSN, sensitivity and follow-up decisions, and a script check confirmed **no SSN-shaped number anywhere on the page**. 57 imported.
4. A messy upload with renamed headers and five planted problems: every non-exact column highlighted, every problem caught. The ambiguous date offered both readings; the unfixable values offered no guess.

**What Claude got wrong this phase**
- **Base UI warned** (dev "2 Issues" badge) that buttons rendering links need `nativeButton={false}`. Found in the browser console and fixed in all four places.
- **The welcome dialog reappeared on every page load.** "Closed" was only remembered in memory. Fixed: closing lasts for the browser session, and the checkbox makes it permanent.
- **The section headings** used their own numbering, at odds with the step pills ("3. Check the column matches" sat under step 2). Fixed.
- **With an empty database,** the queue would have said "Everyone has been contacted recently". There's now an empty state pointing to the importer.
- **One browser freeze** on the column step. Claude added a guard so a dropdown reporting its current value can't feed back into itself. Unconfirmed: later "stuck" dialogs turned out to be Chrome pausing animations in the background automation tab, which may also explain the freeze. Noted in CLAUDE.md so it isn't misdiagnosed again.

**Waiting on Adam:** the official UA Block A file. UA's brand rules forbid altering the mark, so Claude didn't draw one; the dialog shows a neutral icon until the official file is in `public/brand/`.

## 2026-10-08 — Phase 6: browser tests, accessibility checks and help pages

**What Claude Code did**
- **Playwright end-to-end specs, one per required capability:** list and search, filter, open a student, log a note and see it appear (with the score update), the outreach queue. Plus specs for the import (the sample files through the UI, and a messy file with renamed headers), the welcome dialog and the help pages. They run against a production build on a separate database (T10).
- **axe accessibility checks** on every page and on each dialog and panel state: log contact with errors showing, Ctrl+K search, each import step, a sensitive note opened, the welcome dialog, and help search on desktop and phone. Anything worse than "minor" fails.
- **Help pages** (P7, at Adam's request): `/help`, opened from the bottom of the sidebar, with a contents list, search and 44 screenshots. The screenshots come from a Playwright walk through every screen, which fails on any browser error.
- Moved the pages into a route group so the help pages can sit outside the app shell (T9).

**What the tests and the walk-through found**
- **Ctrl+K crashed the page.** v0's search dialog was missing a wrapper component, so opening it threw an error and took down the page. This had been there since Phase 2. Manual testing missed it because everyone clicked the search box, which uses a different path. Found by the first e2e run. Fixed.
- **axe found four real accessibility problems:**
  1. Two links in running text told apart from the text only by color. They're now underlined.
  2. The "student not found" page had no top-level heading.
  3. The import drop zone was dimmed before a file type was chosen, which put its text below the contrast minimum.
  4. A fifth report was the test's fault, not the app's: it measured a panel halfway through fading in. Checks now wait for animations to finish.
- **Both main tables were clipped at a common laptop width (1280px).** The queue's "Log contact" column and the student list's "Risk" column ran off the right edge. Claude's first fix wasn't enough. Measuring the columns in the browser showed both tables 20–40px too wide, and the fix was tighter cell padding and reason chips that wrap.
- **The log-contact form said the wrong thing.** With "All advisors" selected it claimed the advisor was "set from the Advisor selection in the top bar", but it was really the student's assigned advisor. The hint now says which.
- **The "Contacted this week" tile was mislabeled.** It said "contact logged in the last 7 days" but counts students whose last contact, from a note *or* the spreadsheet, was in the past 7 days. Relabeled.
- **On a phone, the top bar wraps to three rows** and was sticky, covering a sixth of the screen. It now scrolls away on small screens.

**What Claude got wrong this phase**
- **The first help draft didn't match the app in six places.** For example, it called a column-match label "Not found" (the app says "Not matched"), described a "bring it back" action without naming the real button, defined "Contacted this week" wrongly, and gave an incomplete list of date placeholders. All were caught by checking each statement against the code before publishing, and fixed.
- **Test selectors:** three of the first four e2e failures were the tests' own fault: a heading matched as a substring, and a checkbox locator that matched two elements. Only the fourth, the Ctrl+K crash, was a real bug.
- **ESLint's React hooks rule** flagged Playwright's fixture callback, which Playwright names `use`. Renamed it rather than switching the rule off.
- **First screenshot run:** it failed on the deliberate 404 of the "student not found" page, and full-page captures cut the fixed sidebar off at the window height. The walk now allows that one 404 and grows the window instead of using full-page capture.
- **Ordering trap:** Next's production server only serves public files that existed at build time, so screenshots made after a build can't be checked until the next build. Documented in CLAUDE.md (`docs:screenshots` before `test:e2e`).

**Results**
- `npm run test:e2e`: 44 passed (18 accessibility checks, 26 end-to-end).
- `npm test`: 111 passed, including new checks that every screenshot and link in the help exists.
- Typecheck and lint: clean.

## 2026-10-08 — Phase 6 review: Adam's notes and a ChatGPT/Astra code review

Adam reviewed Phase 6 with four notes, and passed on findings from a bug and vulnerability review he ran with ChatGPT (Astra). Claude checked every claim against the code before changing anything.

**Adam's notes, and what was decided**
1. **The contact preference was tangled up with the contact type.** Adam saw a phone-only preference nudging contacts to be recorded as phone calls.
   - *What Claude found:* the importer never changed N001's contact type (it's Phone in the CSV). What did the damage was D19's stored preference: the Log contact form used it to pre-select the contact type and to warn on any other choice. That's the bug Adam described. The type records how a contact happened.
   - *Decided:* Claude offered reading preferences from notes, or a real field with an editor. Adam chose the real field (P9). The form no longer chooses a contact type at all (P6 revised).
2. **Sortable queue** (P10): Rank, Student, Risk, Last contact, Follow-up, Score. Rank keeps the outreach order whatever the sort.
3. **Follow-ups** (P8): Adam specified the column, a 2-day ramp and "due today goes to the very top". Claude asked two follow-up questions with options. Adam chose: overdue stays at the top, the oldest first; a follow-up is completed by a checkbox when logging a contact.
4. **"Explain the math."** Answered in chat. The help pages gained a worked example and an honest note about the cliffs in the time-since-contact steps.

**The code review's seven findings: all real**
- **High: a network failure while saving a note crashed the page and lost the draft.** The save had no error handling. It now keeps the draft and shows a retryable message. An e2e test cuts the connection to prove it.
- **High: an SSN could survive in a saved preference.** D19 copied the note's original sentence, before D17's fix. Fixed: accepting D19 now sets a flag, and the preference is worked out at commit from the final text, SSN-scrubbed again. The rule's message masks SSNs too.
- **Medium: an unrelated note made an open follow-up disappear.** Scoring only read the newest note's follow-up. Also, a follow-up more than 14 days out wasn't shown anywhere. Both fixed by P8.
- **Medium: an older import could overwrite a newer preference.** "Newest wins" only applied within one file. It now compares against the stored preference, and the review step says when a statement is older and won't be saved.
- **Medium: preferences couldn't be updated.** Now possible from a logged note (an opt-in box) and from an editor on the student's page.
- **Medium: the detector over-reached.** "Contacted the student by email" was read as an email-only instruction, and "prefers email" became "email only". The detector now tells restrictions, preferences and other guidance apart, and ignores how a contact happened.
- **Low: "Back to list" lost filters.** It relied on `document.referrer`, which client-side navigation doesn't update. Each list now records its exact address for the tab (P11).

**What Claude got wrong this round**
- **D19 and P6 were Claude's designs from Phases 3 to 5,** and four of the seven findings, plus Adam's first note, trace back to them. The single root cause: a preference stored as a by-product of import, with no owner and no way to edit it.
- **A PowerShell rewrite of `queue-table.tsx` double-encoded a dash** into "Ã¢â‚¬â€". The tests passed; reviewing the regenerated screenshots caught it. Fixed, a test now checks that cell, and CLAUDE.md says never to rewrite source files with PowerShell.
- **Adding the Follow-up column clipped "Log contact" at 1280px again.** Measured in a browser and fixed with tighter padding.
- **Claude dated this work 2026-10-09 in several places.** It's 2026-10-08. Corrected.

**The dev-server reload loop Adam reported in Phase 4: seen once, not solved**
- The dev server got into a state where every page load got "HMR hash mismatch" and an immediate reload, about three times a second. It began after files were rewritten while the dev server was running. Restarting the dev server cleared it.
- Ruled out: two dev servers sharing `.next/` (only one was running); a production build just before starting dev (tried, no loop); rewriting a file with a BOM while dev runs (tried, no loop).
- If it happens again: stop the dev server and start it again.

**Results**
- `npm run test:e2e`: 54 passed (21 accessibility checks, 33 end-to-end).
- `npm test`: 128 passed; 135 with the Postgres suite in Docker, which also ran the new migration.
- Typecheck and lint: clean.

## 2026-10-09 — Responsive pass: phones and tablets

Adam asked for a pass at "weird" viewport sizes on phones and tablets, verified in a browser.

**What Claude Code did**
- Wrote `e2e/responsive.spec.ts`: 24 pages and dialogs at 15 widths, from a 320px phone to 1279px, including one pixel either side of each breakpoint, in a touch browser below 1024px. It checks layout automatically and saves 353 screenshots, which Claude then reviewed.
- Added `e2e/small-screens.spec.ts` for the new phone layouts.

**What it found**
- **The queue and Students pages were 985px wide on every phone and tablet.** Screen-reader-only text inside the tables (the score's "out of 100", the reason chips' "more: …") is absolutely positioned. It escaped the tables' scroll boxes and stretched the page, so mobile Chrome zoomed out. The welcome dialog, search and phone menu broke with it. Fixed with `relative` on every scroll box. shadcn's own table had it; the hand-built ones didn't.
- **On anything narrower than a 1280px screen, the queue table hid its most important columns off to the side.** On a phone only the name showed; on an iPad held sideways, the reasons and the Log contact button were off-screen. The queue and Students list are now cards below the width the table needs, with a "Sort by" menu (P12).
- **Side panels were never the width they were meant to be.** They were 75% wide on phones and capped at 384px on desktop: shadcn sets sheet widths under `data-[side=right]:`, which outranked the plain overrides. In the import row editor, fix buttons ran out of their cards.
- **The column-match step** hid "How it was matched", its whole point, off the side on phones. Now it stacks.
- **The student page at 1024px** squeezed its cards into a 200px column. Three columns now need 60rem of room.
- **The welcome dialog opened scrolled past its title on short phones,** because focus went to the first link, near the bottom.
- **Smaller things:**
  - the SSN data note quoted the whole note twice;
  - the queue cards' Log contact button changed side from card to card;
  - the column-match headings were 4–12px off their columns;
  - long reason chips couldn't wrap.

**What Claude got wrong this round**
- **The first version of the checker missed things.** It skipped 1px elements and assumed anything inside a scroll box was contained, so the escaping screen-reader text showed up only as "the page scrolls sideways". It also missed the row editor's buttons running out of their cards. Both checks were improved and re-run.
- **A note in DECISIONS claimed a phone held sideways has less room than a tablet.** It doesn't; a sideways phone is wider than 768px and gets the sidebar too. Corrected to exact figures before committing.
- **Two of the new phone tests had their own bugs:** counting nested list items, and an exact width of 389.99998px.

**Results**
- `npm run test:responsive`: 24 passed (every page and dialog at all 15 widths).
- `npm run test:e2e`: 82 passed, including the responsive checks at 320, 768 and 1024, and four phone-layout tests.
- `npm test`: 128 passed. Typecheck and lint: clean.

## 2026-10-14 — Phase 7: final checks and the submission README (Claude Fable 5.1)

Adam asked for a final bug check, performance numbers, a check that everything in the brief is covered, and the missing README. This entry was written by a different model from the earlier phases (Fable 5.1, not Opus 5.5), as Adam's README credits say.

**Spec check against the brief.** Every required item is present: list, search and filter students; open a student's detail; log a contact note; an API that serves the data and saves notes; one smart feature (the ranked queue); what was noticed in the data and decided (DATA_AUDIT, DECISIONS). The one missing deliverable was the one-page README, now written in Adam's voice from his notes on who did what.

**Bug check, all clean:** typecheck, lint, 128 unit and integration tests on SQLite, 135 on Postgres in Docker, 82 browser and accessibility tests, the 24-screen × 15-width layout sweep. A **fresh `git clone`** into a temp folder, `npm ci` (35s), `npm run build` (17s) and a first start with no `.env` and no database file came up healthy with the sample data loaded, and every page returned 200. That is the path a grader takes, so it was worth testing as a whole rather than assuming the pieces add up.

**Staging** was still on Phase 5 code. Claude triggered the staging build and verified the deployed copy: the new migration ran on Postgres, the preference saved in the old shape reads correctly in the new one, the help pages are served, and the queue carries ranks.

**Housekeeping found by the check:** three docs still said `pnpm` from before the switch to npm; `.env.example` listed an `ANTHROPIC_API_KEY` for a summary feature that was cut and that no code reads; the local `.claude/` folder of command approvals is now gitignored before the repo goes public. The ChatGPT/Astra review in the Phase 6 entry was previously described only as "another AI agent"; Adam named it, and the entry now says so.

**Secrets and PII scan of the tracked files:** no connection strings, keys or tokens. The only SSN-shaped numbers are in the hiring team's own CSV (kept byte-for-byte by rule) and in tests that prove the refusal works. `npm audit`: the same 9 "high" entries as T8, all one `braces` advisory in build-time tooling with no published fix.

**Performance numbers** are in [PERFORMANCE.md](PERFORMANCE.md). One honest gap: the script's largest-contentful-paint column came back empty, because the simple timing API doesn't expose it; it was dropped rather than guessed.

**Left for Adam:** the hosted copy has one extra note from his own testing (reload the sample data on the Import page to reset it); make the repository public at submission.
