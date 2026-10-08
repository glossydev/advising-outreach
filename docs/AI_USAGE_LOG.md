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
