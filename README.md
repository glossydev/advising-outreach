# Advising Outreach

A working prototype for a university advising office: advisors see which students to reach out to next and why, read what was discussed last time, and log new contacts. Built for the University of Arizona take-home exercise. "Today" is fixed at October 5, 2026, as the brief asks. All student data is fictional.

## How to run it

Needs Node 22.12 or newer. No configuration and no database server.

```
npm install
npm run dev        # then open http://localhost:3000
```

The first start creates `data/app.db` (SQLite) and loads the two sample CSVs through the app's own importer. A production build is `npm run build && npm start`. Set `DATABASE_URL` to a Postgres URL to use Postgres instead (see `.env.example`). A hosted copy runs at **https://wildcat-staging.glossydevserver.com**.

Tests: `npm test` (unit and integration), `npm run test:e2e` (browser, accessibility and phone/tablet layouts; first run `npx playwright install chromium`). The app has its own help pages at `/help`, with screenshots of every screen.

## Who it's for, and what I assumed

A small advising office, a few advisors sharing one caseload list, who track outreach in spreadsheets today and will keep getting spreadsheet exports. I assumed:

- They open the tool a few times a day to decide **who to contact next**, so the home page is a ranked queue with a plain-English reason for every student's place in it.
- They share one copy with no logins (the brief left authentication out). Each advisor picks their name in the top bar to see their own caseload.
- The next spreadsheet will be messy in new ways, so data cleaning is part of the product: the import flags every problem, explains it, suggests a fix, and the advisor decides. Nothing changes silently and the source file is never modified.
- Notes can hold things that shouldn't be there (an SSN) or shouldn't be on screen by default (a mental-health disclosure). SSNs are refused everywhere; sensitive notes stay collapsed until opened.

**What I noticed in the data:** 19 dates written in four formats other than YYYY-MM-DD, an "N/A" where a date should be, a Social Security number in a note, a student who appears twice (Grace and Gracie Okonkwo), a contact preference and a follow-up date buried in note text, three students never contacted, and four waiting on a reply. Every finding and the decision made about it is in [docs/DATA_AUDIT.md](docs/DATA_AUDIT.md) and [docs/DECISIONS.md](docs/DECISIONS.md).

**The "smart" feature** is the Outreach Queue: a rule-based score (time since contact, risk flag, GPA, credits, unanswered outreach, follow-ups due) with every point explained, so an advisor can check it by hand. It is deliberately not a prediction.

## What I cut or left for later

- **An AI summary of a student's notes.** The design mock-up had one; I removed it rather than show generated text, and replaced it with a deterministic "Before you reach out" card (preferences, open follow-ups, unanswered outreach, sensitive notes on file).
- **Accounts and permissions**, sending email or texts, calendar links. The tool records contacts; it doesn't make them.
- **Tuning the score with advisors.** The weights are a first guess in one table. The time-since-contact steps (14/30/60/90 days) are easy to check but have cliffs; a per-day ramp is a one-line change once advisors say what they want.
- **Merging duplicate students.** Possible duplicates are flagged and linked on both records, never merged.
- **CRM integration.** Not built; I'll cover the approach and the risks in the presentation.

## How I used AI

- **Planning:** Claude (Opus 5.5) turned the brief into a phased plan with a data audit before any app code.
- **Design:** v0.dev produced the initial UI from a high-level description. It never saw the data; where its guesses disagreed with the CSVs, the data won.
- **Coding:** Claude (Opus 5.5) in Claude Code built each phase; I reviewed and redirected between phases.
- **Bug and vulnerability check:** ChatGPT (Astra) reviewed the code and found seven real issues, all fixed.
- **Final checks, deliverables and documentation:** Claude (Fable 5.1).

Where I had to step in: every data judgment call (what counts as "contacted", how to treat the duplicate and the SSN, that a stated contact preference must not change how a contact was recorded), the decision to build the cleaning into the importer instead of fixing the files once, and the follow-up and scoring rules. Where the AI was wrong: v0's import read invented column names and would have silently dropped about seven notes; Claude's first contact-preference design caused four of the seven review findings; a package it called "hallucinated" was real. The full record, phase by phase, of what the tools did, what they got wrong and where a person decided is in [docs/AI_USAGE_LOG.md](docs/AI_USAGE_LOG.md). Time spent is in [docs/TIME_LOG.md](docs/TIME_LOG.md).

## Verification

128 unit and integration tests (135 when also run against Postgres), 82 browser tests including axe accessibility checks on every page and dialog, and a layout check of every screen at 15 widths from 320px up. All pages answer in under 60ms on the sample data ([docs/PERFORMANCE.md](docs/PERFORMANCE.md)). API reference: [docs/API.md](docs/API.md).
