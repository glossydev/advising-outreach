# API

JSON over HTTP, served by the Next.js app (`app/api/`). Route handlers are thin: they validate input with Zod and call the service layer (`lib/services/`), the same code the pages use. The examples are real responses from the sample data (trimmed where marked `…`).

**Errors** always look like this, with an HTTP status to match:

```json
{ "error": { "code": "validation_failed", "message": "The note couldn't be saved. Check the highlighted fields.", "fields": { "note_text": "…" } } }
```

| Status | `code` | When |
|---|---|---|
| 400 | `invalid_request` | Query or body has the wrong shape; `fields` says which |
| 400 | `invalid_json` | The body isn't JSON |
| 403 | `forbidden` | A prototype-only route when `ENABLE_PROTOTYPE_TOOLS=false` |
| 404 | `not_found` | No such student |
| 422 | `validation_failed` | A note breaks a rule (future date, SSN, …); `fields` has a message per field |
| 422 | `blocking_issues`, `missing_columns`, `rows_mismatch`, `empty_file`, `file_too_large`, `invalid_file` | An import can't proceed; `issues` lists blocking issues |
| 500 | `internal_error` | Anything unexpected; details go to the server log, not the response |

There's no authentication: the brief left it out of scope (see the README).

---

## `GET /api/health`

```json
{ "ok": true, "students": 50, "notes": 57, "referenceDate": "2026-10-05", "database": "SQLite (data/app.db)", "prototypeTools": true }
```

The first request after a fresh install creates the database and imports the sample data.

## `GET /api/students`

Search, filter, sort and page the directory.

| Parameter | Values |
|---|---|
| `q` | Name, student ID or email (substring, case-insensitive) |
| `advisor`, `major` | Exact value |
| `classYear`, `risk` | Comma-separated: `Junior,Senior`; `High,Medium` |
| `lastContact` | `30`, `60`, `90` (that many days or more, or none on record), `none` (no contact on record) |
| `minDaysSince` | Number of days |
| `sort` | `name` (default), `student_id`, `major`, `class_year`, `credits`, `gpa`, `advisor`, `last_contact`, `risk`, `score` |
| `dir` | `asc` (default) or `desc` |
| `page`, `pageSize` | Defaults 1 and 25 (max 200) |

`GET /api/students?risk=High&advisor=Reyes&sort=score&dir=desc&pageSize=1`

```json
{
  "students": [
    {
      "student_id": "S1002", "first_name": "Jordan", "last_name": "Whitfield", "email": "jordan.whitfield@example.edu",
      "major": "Business Administration", "class_year": "Junior", "credits_earned": 74, "gpa": 2.15,
      "advisor": "Reyes", "risk_flag": "High",
      "source_last_contact_date": "2026-06-02", "last_contact_date": "2026-06-02", "last_contact_source": "note",
      "days_since_contact": 125, "no_contact_on_record": false,
      "outreach_score": 90,
      "outreach_reasons": [
        { "rule": "days_since_contact", "points": 35, "text": "No contact in 125 days" },
        { "rule": "risk_flag", "points": 30, "text": "High risk flag" },
        { "rule": "gpa", "points": 10, "text": "GPA 2.15 (below 2.5)" },
        { "rule": "waiting_on_student", "points": 15, "text": "Waiting on a reply since Jun 2 (125 days)" }
      ],
      "contact_preference": { "channel": "Phone", "text": "Student asked that we contact him by phone only; email goes to a shared family account. Best reached after 5 pm.", "note_id": "N001", "noted_on": "2026-01-22" },
      "possible_duplicates": [],
      "note_count": 3
    }
  ],
  "page": 1, "pageSize": 1, "total": 4
}
```

`GET /api/students?risk=Severe` → `400`

```json
{ "error": { "code": "invalid_request", "message": "The request isn't valid.", "fields": { "risk.0": "Invalid option: expected one of \"Low\"|\"Medium\"|\"High\"" } } }
```

## `GET /api/students/:id`

The student (as above), their notes newest first, and `dataNotes`: what the imports found in this student's data and what was done about it.

`GET /api/students/S1003` (trimmed)

```json
{
  "student": { "student_id": "S1003", "first_name": "Sofia", "…": "…" },
  "notes": [{ "note_id": "N030", "contact_date": "2026-08-25", "contact_type": "Phone", "…": "…" }],
  "dataNotes": [
    { "rule": "date_not_iso", "title": "Date not in YYYY-MM-DD format", "message": "Last contact date: \"Aug 25, 2026\" → \"2026-08-25\"", "resolution": "Suggested fix accepted (sample data load)", "record_id": "S1003" },
    { "rule": "date_not_iso", "title": "Date not in YYYY-MM-DD format", "message": "Note N030, Contact date: \"Aug 25, 2026\" → \"2026-08-25\"", "resolution": "Suggested fix accepted (sample data load)", "record_id": "N030" }
  ]
}
```

`GET /api/students/S9999` → `404 { "error": { "code": "not_found", "message": "No student with ID S9999." } }`

## `GET /api/students/:id/notes`

```json
{
  "notes": [
    { "note_id": "N041", "student_id": "S1037", "contact_date": "2026-09-11", "contact_type": "In person", "advisor": "Lindqvist",
      "note_text": "… she gave her SSN [SSN removed] so I could fill it out. Follow up on missing FAFSA verification by Oct 15.",
      "follow_up_date": "2026-10-15", "is_sensitive": true, "source": "import", "created_at": "…" },
    { "note_id": "N007", "…": "…" }
  ]
}
```

Sensitive notes are returned in full, as the API is for staff tools. The page decides how to show them (collapsed, D18).

## `POST /api/students/:id/notes`

Logs a contact. Returns the note and the student with the score worked out again.

```http
POST /api/students/S1002/notes
Content-Type: application/json

{ "contact_date": "2026-10-05", "contact_type": "Phone", "advisor": "Reyes",
  "note_text": "Called as requested. Set up tutoring for Accounting II.", "follow_up_date": "2026-10-12", "is_sensitive": false }
```

`201`

```json
{
  "note": { "note_id": "N058", "student_id": "S1002", "contact_type": "Phone", "source": "app", "follow_up_date": "2026-10-12", "…": "…" },
  "student": { "student_id": "S1002", "outreach_score": 50, "outreach_reasons": [
    { "rule": "risk_flag", "points": 30, "text": "High risk flag" },
    { "rule": "gpa", "points": 10, "text": "GPA 2.15 (below 2.5)" },
    { "rule": "follow_up", "points": 10, "text": "Follow-up due Oct 12 (in 7 days)" } ], "…": "…" }
}
```

- `contact_type` is one of `Phone`, `Email`, `In person`, `Zoom`.
- The contact date can't be after the reference "today" (D8).
- Note text can't contain an SSN-shaped number (D17).
- A follow-up date can't be before the contact date.
- New note IDs continue the dataset's pattern (N058, N059, …).

A future date with an SSN → `422`

```json
{ "error": { "code": "validation_failed", "message": "The note couldn't be saved. Check the highlighted fields.", "fields": {
  "contact_date": "The contact date can't be after today.",
  "note_text": "This looks like a Social Security number. Remove it before saving: SSNs must not be stored in advising notes." } } }
```

## `GET /api/outreach`

The ranked queue (no contact on record first, then highest score; D24) and the summary counts.

| Parameter | Values |
|---|---|
| `advisor` | Exact value |
| `risk`, `classYear` | Comma-separated |
| `minDaysSince` | Days since last contact (students with none on record always qualify) |
| `limit` | Max students returned |

`GET /api/outreach?limit=5` (students trimmed to ID and score)

```json
{
  "students": [ "S1018 (80, no contact on record)", "S1006 (55, no contact on record)", "S1040 (55, no contact on record)", "S1044 (90)", "S1014 (90)" ],
  "stats": { "assigned": 50, "overdue": 29, "high_risk": 10, "contacted_this_week": 2 }
}
```

## `GET /api/data-quality`

Every import (newest first), what each rule found across them, and totals by resolution.

```json
{
  "imports": [
    { "kind": "notes", "source_name": "contact_notes.csv", "source_kind": "seed", "accepted_by": "seed", "rows_in_file": 57, "rows_added": 57, "rows_updated": 0, "rows_unchanged": 0, "rows_excluded": 0, "…": "…" },
    { "kind": "students", "source_name": "students.csv", "rows_added": 50, "…": "…" }
  ],
  "rules": [
    { "rule": "date_not_iso", "title": "Date not in YYYY-MM-DD format", "decision": "D4", "severity": "error", "count": 19,
      "resolutions": { "accepted_suggestion": 19 }, "records": ["S1003", "S1009", "…"], "examples": ["…"] },
    "…"
  ],
  "totals": { "fixes_accepted": 25, "edited": 0, "kept_as_is": 0, "rows_excluded": 0, "info": 0 }
}
```

## Import

The interactive import (docs/IMPORT_DESIGN.md) is two calls: **scan** (read, match columns, run the rules; writes nothing), then **commit** (the reviewed rows). The server keeps no state between them. Commit gets the file again, re-runs every rule, refuses anything still blocking, and works out the fix history itself.

### `POST /api/import/scan`

Three ways to call it:

- **Upload:** `multipart/form-data` with `kind` (`students` or `notes`) and `file`.
- **Sample file** (prototype tools): `{ "kind": "students", "source": { "kind": "sample" } }`.
- **Re-scan with the person's column choices:** `{ "kind", "source": { "kind": "upload", "name", "text" }, "matches": [...] }`.

An upload whose headers differ from the expected ones (`Student ID`, `Surname`, `Program`, `credits`, `Risk`, …), trimmed:

```json
{
  "kind": "students",
  "source": { "name": "smoke-upload.csv", "kind": "upload", "sha256": "…", "bytes": 196 },
  "headers": ["Student ID", "First Name", "Surname", "…"],
  "matches": [
    { "field": "student_id", "header": "Student ID", "column": 0, "kind": "formatting" },
    { "field": "last_name", "header": "Surname", "column": 2, "kind": "alias" },
    { "field": "credits_earned", "header": "credits", "column": 6, "kind": "alias" }, "…"
  ],
  "unusedHeaders": [], "missingRequired": [],
  "rows": [{ "index": 0, "values": { "student_id": "S2001", "last_contact_date": "Sep 30 2026", "risk_flag": "low", "…": "…" }, "excluded": false, "acknowledged": [] }],
  "issues": [
    { "key": "date_not_iso:0:last_contact_date", "rule": "date_not_iso", "severity": "error", "rowIndex": 0, "field": "last_contact_date",
      "message": "\"Sep 30 2026\" isn't in the standard YYYY-MM-DD format. It reads as Sep 30, 2026.",
      "value": "Sep 30 2026", "suggestions": [{ "label": "Change to 2026-09-30", "set": { "last_contact_date": "2026-09-30" } }], "bulk": true },
    { "key": "value_not_in_list:0:risk_flag", "rule": "value_not_in_list", "severity": "error", "field": "risk_flag",
      "message": "\"low\" should be written \"Low\".", "suggestions": [{ "label": "Change to Low", "set": { "risk_flag": "Low" } }], "…": "…" }
  ],
  "existing": { "students": ["…"], "notes": ["…"] },
  "today": "2026-10-05"
}
```

`existing` is a snapshot of what's in the database, so the browser can re-check rows instantly as they're edited (T4).

### `POST /api/import/commit`

```json
{ "kind": "students", "source": { "kind": "upload", "name": "smoke-upload.csv", "text": "<the file>" }, "matches": ["…as scanned…"], "rows": ["…as reviewed…"] }
```

Rows that still have blocking issues → `422`

```json
{ "error": { "code": "blocking_issues", "message": "2 issues must be fixed, or the rows excluded, before importing.",
  "issues": [ { "rule": "date_not_iso", "rowIndex": 0, "field": "last_contact_date", "message": "…" },
              { "rule": "value_not_in_list", "rowIndex": 0, "field": "risk_flag", "message": "…" } ] } }
```

After the fixes are accepted → `201`

```json
{ "importId": "cd670587-…", "kind": "students", "added": 1, "updated": 0, "unchanged": 0, "excluded": 0,
  "fixesByRule": { "date_not_iso": 1, "value_not_in_list": 1 } }
```

### `POST /api/prototype/reset`

Prototype tools only. Empties the database for a clean import; the app won't reload the sample data by itself afterwards (`npm run seed` does).

```json
{ "ok": true, "students": 0, "notes": 0 }
```
