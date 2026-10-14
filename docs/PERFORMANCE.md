# Performance

Measured 2026-10-14 on the production build (`next build && next start`), on the development laptop (Windows 11), SQLite, the 50-student / 57-note sample data loaded. Everything on localhost, so these are the app's own costs with no network in the way. Script: a Node fetch loop and Playwright Chromium; numbers are from one run and vary by a few milliseconds between runs.

## Server response times

Full response, 20 sequential requests after one warm-up.

| Request | p50 | p95 | max |
|---|---|---|---|
| `/` (the queue, all 50 students scored and ranked) | 49ms | 59ms | 59ms |
| `/students` | 31ms | 42ms | 42ms |
| `/students?q=okonkwo&risk=Medium` | 31ms | 39ms | 39ms |
| `/students/S1002` | 17ms | 29ms | 29ms |
| `/import` | 16ms | 29ms | 29ms |
| `/data-quality` | 16ms | 27ms | 27ms |
| `/help` | 16ms | 21ms | 21ms |
| `/api/outreach` | 15ms | 22ms | 22ms |
| `/api/students?risk=High` | 15ms | 19ms | 19ms |
| `/api/students/S1002` | 15ms | 17ms | 17ms |

## Writes

- Log a contact (POST a note; the response carries the student's recomputed score): p50 15ms, max 16ms.
- Reload the sample data (empty the database, run both CSVs through all 23 import rules, write 107 records and the fix history): 59ms.

## Browser

Chromium, 1280×800, median of 5 cold navigations.

| Page | First byte | DOM ready | Load event |
|---|---|---|---|
| `/` | 24ms | 59ms | 184ms |
| `/students` | 19ms | 53ms | 161ms |
| `/students/S1002` | 14ms | 41ms | 144ms |
| `/import` | 13ms | 41ms | 137ms |
| `/help` | 8ms | 32ms | 167ms |

## Build and footprint

- `npm ci`: 35s. `next build`: 17s. First start of a fresh clone, which creates and seeds the database: under 5s to a healthy `/api/health`.
- SQLite file with the sample data: 100 KB.
- The queue page's HTML is about 488 KB, because it server-renders both the table layout and the phone/tablet card layout for every student (only one is displayed). At 50 students that's invisible; at a few thousand it would be the first thing to change (render one layout, or paginate the queue).

## What would change at scale

Scores are computed on every read from all notes (`lib/services/students.ts`), which is why the queue is the slowest page at 49ms. That is deliberate for a caseload of hundreds: logging a note changes the ranking immediately, with no cache to invalidate. An office with tens of thousands of students would cache scores per student and recompute on write.
