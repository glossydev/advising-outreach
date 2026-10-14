# Time log

How the roughly three hours of development time went, session by session. Each row is one sitting: what Adam decided or asked for, and what Claude Code then built. AI wall-clock time isn't counted.

| Date | What happened |
|---|---|
| 2026-10-07 | Brief read; v0 design generated; build plan drafted with a Claude planning session. Phase 0: archives unpacked, schema compared, v0 code reviewed. |
| 2026-10-07 | Phase 0 review: set precedence rule (dataset beats v0), switched storage to Postgres for GDS hosting. Phase 1: data audit script and report. |
| 2026-10-08 | Reviewed the audit; redirected the import to an interactive, human-in-the-loop design with a prototype sample panel. Import design and draft rule catalog written. |
| 2026-10-08 | Answered import/seed/onboarding questions; asked for SQLite-by-default storage. Phase 2: repo created, v0 export fixed (types, lint, build), pages verified. |
| 2026-10-08 | Created GDS deployment 23 + database. Access verified; switched to npm. Phase 3: database layer, 23 import rules, seed/reset, scoring, 96 tests (SQLite + Postgres). |
| 2026-10-08 | Phase 4: API routes and service layer, pages on the real database, mock data removed, data decisions visible in the UI. |
| 2026-10-08 | Real README received and applied. Phase 5: import page (column check, review and fix, prototype tools), welcome dialog, empty states; full UI import verified in Chrome. |
| 2026-10-08 | Asked for help pages alongside Phase 6. Phase 6: Playwright e2e + axe checks (44 passing), Ctrl+K crash and four accessibility problems fixed, help pages with a generated screenshot walk, which found clipped tables, a misleading form hint and a mislabeled tile. |
| 2026-10-08 | Reviewed Phase 6: contact preference vs contact type, sortable queue, follow-ups in the queue and score, the scoring math. Ran a ChatGPT/Astra code review (7 findings). Chose a real preference field and the follow-up rules. Claude: preference field and editor, follow-up completion, queue sorting, review fixes; 54 e2e / 128 unit tests. |
| 2026-10-09 | Asked for a responsive pass on phones and tablets. Claude: a 15-width layout check of every screen, which found the queue and Students pages 985px wide on phones; card layouts for narrow screens, full-width panels, container-query layouts; 82 e2e tests. |
| 2026-10-14 | Asked for the final pass for submission. Claude (Fable 5.1): spec check against the brief, all suites on SQLite and Postgres, a fresh-clone install and first run, staging deployed, performance numbers, the README. |
