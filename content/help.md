# Advising Outreach help

<!--
  The help pages. Split by ## (sections) and ### (topics) for the contents and search.
  Screenshots come from `npm run docs:screenshots` (e2e/screenshots.spec.ts), so they match the app.
-->

## Getting started

Advising Outreach helps an advising office decide which students to contact next, see what was discussed last time, and record each new contact. It runs on spreadsheets the office already keeps: a list of students and a log of past contacts.

### What the app does

- **Outreach Queue** ranks every student by how much they need a call or email right now, and shows the reasons for each ranking. Follow-ups that are due come first.
- **Students** lets you search and filter the whole caseload.
- **A student's page** shows their contact history, anything to know before reaching out, and a **Log contact** button.
- **Import** brings in a spreadsheet. Anything it can't use as it is gets flagged and explained, usually with a fix you can accept in one click.
- **Data Quality** keeps a record of every import, every problem found and what was done about it.

### Your first visit

The first time you open the app, a welcome window explains what's here and how to start. Tick **Don't show this again** to keep it closed in this browser. Without the tick it stays closed until you open the app in a new tab.

You can bring the window back at any time with the **?** button at the right of the top bar.

![The welcome window, shown on the first visit](/help/screens/welcome.jpg "The welcome window. The ? button in the top bar brings it back.")

### Finding your way around

The **sidebar** on the left links to the four main pages. **Help & documentation** at the bottom opens this guide in a new tab, so you don't lose your place in an import or a note you're writing.

![The sidebar](/help/screens/sidebar.jpg "The sidebar. Help & documentation is at the bottom.")

The **top bar** is on every page:

- **Search** finds a student by name, ID or email from anywhere. Click it or press **Ctrl+K** (**⌘K** on a Mac). See [Search from anywhere](#search-from-anywhere).
- **Advisor** picks whose caseload you're looking at. See [Choose your advisor view](#choose-your-advisor-view).
- **Today** shows the date the app treats as today.
- **?** reopens the welcome window.

### Choose your advisor view

Pick your name under **Advisor** in the top bar. The Outreach Queue then shows only your students, the summary tiles count only your caseload, and contacts you log are recorded under your name. **All advisors** shows the whole office.

The choice is remembered in this browser until you change it.

![The queue for one advisor](/help/screens/queue-advisor.jpg "The queue with Okafor chosen in the top bar: 17 students, ranked.")

### Why "today" is October 5, 2026

The sample data was written with "today" as **Oct 5, 2026**, so the app uses that date everywhere: for "days since contact", for overdue follow-ups and as the default date of a new contact. The date is shown in the top bar so it's never a surprise.

## Outreach Queue

The Outreach Queue is the home page. It answers one question: **who should I contact next, and why?**

### Reading the queue

![The Outreach Queue](/help/screens/queue.jpg "The Outreach Queue for all advisors. Students never contacted are at the top, then the highest scores.")

Each row shows:

- **Rank**: the student's place in the outreach order.
- **Student**: name, student ID and major. Click anywhere on the row to open the student's page.
- **Risk**: the risk flag set by the advising office (Low, Medium or High).
- **Last contact**: the date of the most recent contact and how long ago it was. Over 30 days is shown in red.
- **Follow-up**: the student's next open follow-up and how far away it is. Red when it's due or overdue, brown in the two days before. A dash means none.
- **Score**: the outreach score, from 0 to 100. See [How the outreach score works](#how-the-outreach-score-works).
- **Reasons**: why the student scored what they did, in plain words. A **+1** or **+2** chip means there are more reasons. Point at it to see them.
- **Log contact**: record a contact without leaving the queue.

The queue is ranked in three groups:

1. **A follow-up due today or overdue.** These students come first, whatever their score, the longest overdue at the top. A follow-up is a promise to get back to someone.
2. **Never contacted.** A first contact is the most overdue kind.
3. **Everyone else, by score**, highest first.

### Follow-ups at the top

When you log a contact you can set a follow-up date. The student starts climbing the queue two days before it, and on the day they go to the very top. They stay there until a contact is logged that completes the follow-up. See [Open follow-ups](#open-follow-ups).

![A follow-up due today at the top](/help/screens/queue-follow-up-due.jpg "Maya Patel's follow-up is due today, so she's ranked first, above the students never contacted.")

### Sorting the queue

Click the **Rank**, **Student**, **Risk**, **Last contact**, **Follow-up** or **Score** heading to sort by that column. Click it again to reverse the order. Each column starts with the order you'd most likely want: highest risk first, longest without contact first, soonest follow-up first, highest score first.

**Rank always shows the outreach order**, whatever the table is sorted by, so you can see who's first even in a list sorted by name. Click **Rank** to go back to the outreach order. The sort is saved in the page address, like the filters.

![The queue sorted by follow-up date](/help/screens/queue-sorted.jpg "Sorted by follow-up: Camila Vargas has the only open follow-up. Her rank in the outreach order is unchanged.")

### The summary tiles

The four tiles above the queue count the students in your current view:

| Tile | What it counts |
| --- | --- |
| Students assigned | Every student for the chosen advisor, or for the office under All advisors. |
| Overdue | Students with no contact in 30 days or more, or never contacted. |
| High risk | Students flagged High in the source data. |
| Contacted this week | Students whose last contact was in the past 7 days. |

### Filtering the queue

Narrow the queue with the filters above it:

- **Advisor**: the same choice as in the top bar.
- **Risk flag**: one or more of Low, Medium and High. Pick a value again to remove it.
- **Min. days since contact**: only students not contacted in at least 14, 30, 60 or 90 days. Students never contacted are always included.
- **Class year**: one or more of Freshman, Sophomore, Junior and Senior.

![A filter open](/help/screens/queue-filter-open.jpg "The Risk flag filter. You can pick more than one value.")

**Clear filters** appears as soon as a filter is set. Filters are saved in the page address, so you can bookmark a view or send it to a colleague.

![The queue filtered to high-risk students](/help/screens/queue-filtered.jpg "The queue filtered to High risk. Rank and order still follow the score.")

If no student matches, the queue says so. Loosen a filter or switch advisors to see more.

### Logging a contact from the queue

Click **Log contact** on any row to open the contact form beside the queue. When you save, the student's score and place in the queue update straight away. See [Logging a contact](#logging-a-contact).

## How the outreach score works

The score adds up points for things that make a contact more urgent. Every point comes with a reason you can read, so you can always check a ranking by hand. The score is capped at 100.

### The points

| What | Points |
| --- | --- |
| Never contacted | 40 |
| No contact in 90 days or more | 35 |
| No contact in 60–89 days | 28 |
| No contact in 30–59 days | 18 |
| No contact in 14–29 days | 6 |
| High risk flag | 30 |
| Medium risk flag | 15 |
| GPA below 2.0 | 20 |
| GPA from 2.0 up to 2.5 | 10 |
| Waiting on a reply from the student | 15 |
| Follow-up due today, or overdue (also moves the student to the top) | 30 |
| Follow-up due tomorrow | 20 |
| Follow-up due in 2 days | 10 |
| Credits below the usual minimum for the class year | 6 |

Only one line from each group counts. For example, a student not contacted in 120 days gets 35 points for that, not 35 + 28 + 18 + 6.

![The Outreach priority card](/help/screens/card-outreach-priority.jpg "The Outreach priority card on a student's page lists each reason and its points.")

### A worked example

Jordan Whitfield (S1002), on Oct 5, 2026:

| Reason | Points |
| --- | --- |
| Last contact Jun 2: 125 days, so the 90-days-or-more step | 35 |
| High risk flag | 30 |
| GPA 2.15, so the from-2.0-up-to-2.5 step | 10 |
| His last note says he still hasn't replied | 15 |
| **Score** | **90** |

### Why time since contact goes in steps

Days since contact count in steps rather than a point a day: nothing for the first 13 days, then 6, 18, 28 and 35 at 14, 30, 60 and 90 days. Steps are easy to check by hand, and 30 days is the line the **Overdue** tile uses too.

The cost is a jump at each step: a student at 29 days has 6 points for it, and at 30 days, 18. The weights are tunable: in a real office they would be set with the advisors.

### Which date counts as the last contact

Two places record contact: the **Last contact** date in the students spreadsheet, and the dated notes in the contact log. The app uses **whichever is later**. A newer spreadsheet date means someone made contact but didn't write a note. A newer note means the spreadsheet hasn't been updated.

The **At a glance** card says which one was used ("from the newest note" or "from the spreadsheet").

### Waiting on a reply

If the newest note says the office is waiting to hear back, for example "no reply yet", "left a voicemail" or "student to reply", the student gets 15 points and **Before you reach out** shows how long you've been waiting. Logging a new contact clears it, unless the new note also says you're waiting.

### Follow-up dates

A contact can have a follow-up date. The ramp is short on purpose: nothing until two days before, then 10 points, then 20 the day before. On the day, and every day after until it's done, the student gets 30 points and is ranked above everyone else.

Every open follow-up counts, not just the one on the newest note: logging an unrelated contact doesn't make a follow-up disappear. A follow-up is done only when a contact is logged as completing it. See [Open follow-ups](#open-follow-ups).

### Credits behind class standing

The University of Arizona sets class standing by credits earned: 30 for a Sophomore, 60 for a Junior and 90 for a Senior. A student with fewer credits than their class year needs gets 6 points, as a hint that they may be falling behind.

### What the score is not

The score is a set of simple rules for putting a caseload in order. It is **not a prediction** of whether a student will succeed, and it doesn't replace an advisor's judgment. It only knows what's in the spreadsheets and notes.

## Finding students

### Search from anywhere

Press **Ctrl+K** (**⌘K** on a Mac) or click the search box in the top bar, then type part of a name, a student ID or an email address. Use the arrow keys and **Enter** to open a student, or click one. **Esc** closes the search.

![Searching for a student](/help/screens/search.jpg "Searching from the top bar. The advisor is shown on the right of each result.")

### The Students page

The Students page lists the whole caseload, 25 students to a page, sorted by last name to start with.

![The Students page](/help/screens/students.jpg "The Students page. Click a row, or move with the arrow keys and press Enter, to open a student.")

- Click a row to open the student's page. With the keyboard, Tab to the table, move with the **↑** and **↓** keys, and press **Enter**.
- Click a column heading to sort by it. Click again to reverse the order.
- The count under the table shows how many students match, out of the total.

### Filters and sorting

Filter by **Search** (name, ID or email), **Advisor**, **Major**, **Class year**, **Risk flag** and **Last contact** (30, 60 or 90 days or more, or never contacted). Major, Class year and Risk flag accept more than one value.

![Students filtered](/help/screens/students-filtered.jpg "High-risk students not contacted in 30 days or more.")

Filters and sorting are kept in the page address, so a filtered list can be bookmarked or shared. **Clear filters** resets them.

If nothing matches, the page says so and suggests clearing the filters.

![No students match](/help/screens/students-no-match.jpg "No match for the search term.")

### Possible duplicates in the list

A warning triangle next to a student ID means the import found another record that may be the same person, such as Grace and Gracie Okonkwo. Point at the triangle to see which student. See [Possibly the same person](#possibly-the-same-person).

![The duplicate warning](/help/screens/students-duplicate-icon.jpg "Point at the triangle to see the other record.")

## A student's page

Open a student from the queue, the Students page or the search.

### Overview

![A student's page](/help/screens/student.jpg "Jordan Whitfield's page: the timeline on the left, and what to know before reaching out on the right.")

The header shows the student's name, ID, email (click it to write an email), class year and risk flag, with the **Log contact** button on the right. **Back to Students** or **Back to Outreach Queue** returns to the list you came from, exactly as you left it: filters, sort and page.

### Contact timeline

Every contact on record, newest first. Each entry shows the date, how the contact was made (phone, email, in person or Zoom), the advisor and the note ID, then the note itself. A follow-up date shows as a tag under the note. Once a later contact completes it, the tag says which note did.

![A completed follow-up in the timeline](/help/screens/timeline-follow-up-done.jpg "N059 completed the follow-up set in N041.")

Long histories show the newest few contacts. Click **Show earlier contacts** to see the rest.

### Before you reach out

The first card on the right gathers what an advisor should know before contacting the student:

- **Contact preference**: how the student wants to be contacted, with where it came from. See [Contact preference](#contact-preference).
- **Waiting on a reply**: when the last contact is still unanswered, and for how long.
- **Every open follow-up**, with its date and how far away it is, however far ahead.
- **Sensitive notes** on file, which stay collapsed until someone opens them.
- **Never contacted**, when this would be the first outreach.

![Before you reach out](/help/screens/card-before-you-reach-out.jpg "Jordan asked to be contacted by phone only, and hasn't replied since June 2.")

### Contact preference

Each student can have one contact preference: a channel (phone, email or text), whether it's the **only** way to reach them or just the one they **prefer**, and details such as "best reached after 5 pm". It's shown in **Before you reach out** and at the top of the Log contact form.

A preference gets onto a student's record in three ways:

- **From an import**, when a note states one and the person importing accepts it. See the D19 rule in the [Import rules reference](#import-rules-reference).
- **When you log a contact** whose note states one, if you tick **Save as … contact preference**. See [Fill in the details](#fill-in-the-details).
- **By hand**: click **Add a contact preference** in Before you reach out, or **Edit** next to the current one. **Remove preference** takes it off the record. The note it came from stays in the timeline.

A newer preference replaces an older one. The card says where the current one came from: a note and its date, or the student's page.

![The contact preference editor](/help/screens/preference-editor.jpg "Editing Jordan Whitfield's phone-only preference.")

A preference never changes how a contact is recorded. The **Contact type** on a note always says how that contact actually happened.

### Outreach priority

The student's score and every reason behind it, with the points each one adds. See [How the outreach score works](#how-the-outreach-score-works).

### At a glance

Major, class year, credits, GPA, advisor, the last contact date (and whether it came from a note or the spreadsheet) and the days since.

![At a glance](/help/screens/card-at-a-glance.jpg "The At a glance card.")

### Data notes

When the import changed or flagged anything in this student's data, the **Data notes** card says what and how it was resolved, for example a date converted to the standard format. The full record is on the [Data Quality page](#data-quality-page).

![Data notes](/help/screens/card-data-notes.jpg "Two dates in Sofia Hernandez's records were converted during the import.")

### Sensitive notes

Notes that mention things like mental health, medical matters or a request for privacy can be marked **sensitive**. A sensitive note stays collapsed in the timeline. Only its date, type and advisor show until someone clicks **Show note**. **Hide note** collapses it again.

![A collapsed sensitive note](/help/screens/student-sensitive.jpg "A sensitive note, collapsed.")

![The same note, opened](/help/screens/student-sensitive-revealed.jpg "The note opened. The Social Security number it once held was removed during the import.")

### Possibly the same person

When the import found another record that may be the same student, a banner at the top of the page names the other record and links to it. Check both records before contacting the student twice, and confirm with the registrar before treating them as one person. The app never merges records on its own.

![The possible duplicate banner](/help/screens/student-duplicate.jpg "Grace Okonkwo (S1021) may be the same person as Gracie Okonkwo (S1050).")

### Students never contacted

A student with no notes and no last contact date in the spreadsheet shows an empty timeline with a **Log contact** button, and **Before you reach out** says this would be the first outreach. These students come near the top of the Outreach Queue: only follow-ups that are due come before them.

![A student never contacted](/help/screens/student-never-contacted.jpg "Mateo Alvarez has never been contacted.")

### Student not found

A link to a student ID that isn't in the database shows **Student not found**. The record may have come from a different import. **Back to Students** returns to the list.

![Student not found](/help/screens/student-not-found.jpg "No student has this ID.")

## Logging a contact

Record every call, email, meeting or Zoom with a student, so the next advisor knows what happened.

### Open the form

Click **Log contact** on a student's page, or on the student's row in the Outreach Queue. The form opens on the right.

![The Log contact form](/help/screens/log-contact.jpg "The Log contact form for Jordan Whitfield, with his contact preference shown at the top.")

### Fill in the details

- **Contact date**: today by default. Pick an earlier date if you're catching up. Future dates aren't allowed.
- **Contact type** (required): how this contact happened: Phone, Email, In person or Zoom. Nothing is chosen for you, not even the student's preferred channel. If a phone-only student emailed you, the contact type is Email.
- **Note** (required): what was discussed and what happens next, up to 5,000 characters.
- **Save as … contact preference**: appears when the note reads like a contact preference ("prefers email", "phone only", "best reached after 5 pm"). Tick it to make that the student's [contact preference](#contact-preference). It replaces the current one, and the form says which.
- **Sensitive note**: tick this for anything that should stay collapsed in the timeline. See [Sensitive notes](#sensitive-notes).
- **Open follow-ups**: see [Open follow-ups](#open-follow-ups).
- **Follow-up date** (optional): when to check in again. The student climbs the queue two days before it, and goes to the top on the day.
- **Advisor**: the advisor chosen in the top bar. Under All advisors, it's the student's assigned advisor.

### Open follow-ups

If the student has follow-ups that aren't done yet, the form lists each one with **This contact completes the follow-up due …**. Tick it when this contact is the follow-up.

It starts ticked when the contact date is within two days of the follow-up date, or after it, and unticked when it's earlier. An early, unrelated contact ("sent the campus map") doesn't close a follow-up by accident. Change the tick whenever it's wrong.

![An open follow-up and a stated preference](/help/screens/log-contact-follow-up.jpg "Camila's follow-up is ticked as completed, and her note's preference for texts is ticked to save.")

### Checks before saving

The form checks a few things as you go:

- **Social Security numbers are refused.** A note with something shaped like an SSN can't be saved. Remove the number first.
- **Contact type and note are required**, and the form points to whichever is missing.
- **Sensitive words.** If the note mentions mental health, medical matters, a request for privacy or a government ID, you're prompted to consider ticking **Sensitive note**.

![The checks in action](/help/screens/log-contact-checks.jpg "A note containing an SSN, which can't be saved (the note is covered in this picture).")

If saving fails, for example because the connection dropped, the form stays open with everything you typed and says what happened. Click **Save contact** again to retry.

### After you save

The form closes, a confirmation appears at the bottom right, and the new contact is at the top of the timeline. The student's score, reasons and place in the queue update straight away, and so do any follow-up you completed and any preference you saved.

![A contact saved](/help/screens/log-contact-saved.jpg "The new contact is at the top of the timeline. The score dropped from 90 to 40.")

### Cancel and discard

**Cancel**, the **×** or **Esc** closes the form. If you've started typing, the app asks before throwing the note away.

![Discard this contact?](/help/screens/log-contact-discard.jpg "Keep editing returns to the form.")

## Importing data

Import brings in students and contact notes from CSV files, the kind any spreadsheet can save. It checks every row, explains anything it can't use as it is, and lets you decide what to do. Nothing is saved until you confirm.

### How importing works

- **Imports add and update. They never delete.** Students already in the database are matched by student ID and updated with the new details. New students are added. Notes already imported are skipped.
- **The file is never changed.** Fixes are applied to what gets saved, not to your spreadsheet, and every fix is recorded on the [Data Quality page](#data-quality-page).
- **Import students first, then their notes.** Notes are checked against the students already in the database.
- For a clean start, empty the database first. See [Prototype tools](#prototype-tools).

![The Import page](/help/screens/import.jpg "The Import page: how importing works, the four steps, and the prototype tools on the right.")

### Step 1: Choose a file

1. Choose what you're importing: **Students** or **Contact notes**. Each option lists the columns it expects.
2. Drop the CSV file on the page or click **Browse for a CSV file**. Files up to 5 MB are accepted.

The file's first row must hold the column headings.

### Step 2: Check the columns

The app matches each field it needs to a column in your file, even when the headings are named differently: "Surname" for last name, "Program" for major, "Last Contacted" for last contact date, and so on.

![Every column matched exactly](/help/screens/import-columns.jpg "The sample students file: every column matched exactly, so there's nothing to check.")

Anything that isn't an exact match is highlighted and listed first, with how it was matched:

- **Same name, different formatting**: "First Name" for first_name.
- **Known alternative name**: a heading the app knows means the same thing.
- **Best guess: check this**: a heading that's only similar. Check these.
- **Not matched**: no column fits. Pick one from the list, or leave an optional field empty.

The sample values beside each match let you check it at a glance. Columns the app doesn't need are listed under the table and left out.

![Renamed columns](/help/screens/import-columns-renamed.jpg "A file with renamed headings. Eleven matches to check, highlighted at the top.")

Click **Continue to review** when the matches look right.

### Step 3: Review and fix

The review shows every row, with flagged cells highlighted: red for **blocking** problems and amber for **warnings**.

![The review step](/help/screens/import-review.jpg "Nine rows with blocking problems and one warning in the sample students file.")

- The tiles count rows ready to import, rows with blocking problems, warnings to review and rows left out.
- **Needs attention**, **All rows** and **Left out** switch which rows are listed.
- **Issue type** shows the rows flagged by one rule at a time.
- The **Import** button stays disabled until no included row has a blocking problem.

What the severities mean:

| Severity | Meaning |
| --- | --- |
| Blocking | The row can't be saved as it is. Accept a fix, type a value, or leave the row out. |
| Warning | The row can be saved as it is. Look at it and decide. |
| Info | Nothing to fix. Shown so you know what the import noticed. |

### Fixing one row

Click a row number to open it. The panel lists everything the import rules found in the row, each with an explanation and, usually, a suggested fix as a button.

![A row with a possible duplicate](/help/screens/import-row-duplicate.jpg "Row 51 may be the same student as S1021. Import it and link the two, or keep it as it is.")

In the panel you can:

- **Accept a suggested fix** with its button. When there are two readings, such as a date that could be month-first or day-first, pick the right one.
- **Edit a value** directly in the fields under **Values**.
- **Keep it as it is** for a warning you've checked.
- **Leave this row out** of the import. To bring it back, open it from the **Left out** list and click **Include this row again**.

![A note with a Social Security number](/help/screens/import-row-ssn.jpg "Note N041: an SSN to remove, a sensitive note to mark, and a follow-up date found in the text.")

Some problems have no automatic fix, because there's no safe guess. A risk flag of "Severe" or a GPA of 4.3 needs a person to type the right value or leave the row out.

![A row with several problems](/help/screens/import-row-problems.jpg "An ambiguous date, an unknown risk flag and a GPA above 4.0 in one row.")

### Fixing many rows at once

- **Accept all suggested fixes** applies every suggestion in the file in one go. Problems without a suggestion are left for you.
- Choose a rule under **Issue type**, then **Apply the suggested fix to all** to fix just that kind of problem, for example every date in the wrong format.

![Filtered to one rule](/help/screens/import-rule-filter.jpg "Only the date-format problems, with a button to fix them all.")

![All fixed](/help/screens/import-review-fixed.jpg "After accepting all suggested fixes, all 50 rows are ready.")

### Step 4: Import

Click **Import** to see a summary of what will happen: how many records will be added, updated or skipped. Confirm with **Import**.

![Confirming the import](/help/screens/import-confirm.jpg "The summary before anything is saved.")

The server checks every row again before saving. When it's done, the last step lists the fixes recorded in the fix history, with links to the Outreach Queue and the Data Quality report.

![The import finished](/help/screens/import-done.jpg "50 students added, and the fixes that were recorded.")

### Students first, then notes

**Contact notes** can't be chosen until there are students in the database, because every note must belong to a known student. A note for a student ID that doesn't exist is blocking. When a close match exists, such as a mistyped ID, it's offered as the fix.

![The notes review](/help/screens/import-notes-review.jpg "The sample contact notes: dates to convert, an SSN to remove, and preferences and follow-ups found in the text.")

### Prototype tools

The dashed box on the Import page holds tools for trying the app. They're not part of a real deployment.

- **Use the sample students.csv** and **Use the sample contact_notes.csv** run the bundled sample files through the import, so you don't have to find them. With the sample data already loaded, every row shows as already in the database. Empty the database first to see the import rules at work.
- **Reset the database to empty** deletes every student, note and import record, including contacts logged in the app. The sample files aren't changed. The app asks you to confirm first.
- **Reload the sample data** empties the database and imports both sample files again, accepting every suggested fix.

![Empty the database?](/help/screens/import-reset-confirm.jpg "Resetting asks for confirmation first.")

With an empty database, each page points you to the Import page.

![The empty queue](/help/screens/empty-queue.jpg "The Outreach Queue with no students yet.")

On a computer running the app locally, `npm run db:reset` does the same reset from the command line.

## Import rules reference

Each rule checks for one kind of problem. Its code (D1 to D23) matches the decision log the rules were designed from.

| Code | Rule | Severity | What happens |
| --- | --- | --- | --- |
| D1 | Required value missing | Blocking | Type a value or leave the row out. |
| D2 | Same ID twice in the file | Blocking | Leave one copy out. |
| D3 | Already in the database | Info, warning or blocking | Unchanged students and notes are skipped. A student with new details is updated (warning). A note ID reused for a different note is blocking. |
| D4 | Date not in YYYY-MM-DD format | Blocking | Suggests the date in the standard format, for example "Aug 25, 2026" → 2026-08-25. |
| D5 | Placeholder instead of a date | Blocking | "N/A", "TBD", "unknown" and the like. An optional date can be left blank. |
| D6 | Unreadable date | Blocking | Type the date as YYYY-MM-DD. |
| D7 | Date could be month-first or day-first | Blocking | "03/04/2026" could be March 4 or April 3. Pick the right reading. The app never guesses. |
| D8 | Date after today | Blocking | Correct the date. |
| D9 | Value not in the allowed list | Blocking | A near miss such as "low" for "Low" is fixed for you. Anything else needs a person. |
| D10 | Invalid number | Blocking | GPA must be 0.0 to 4.0 and credits a whole number. Obvious fixes are suggested. |
| D11 | Credits outside the class-standing range | Warning | For example a Senior with 40 credits. Check the class year or the credits. |
| D12 | Invalid email address | Blocking | Correct the address. |
| D13 | Email shared with another student | Warning | Check that the address is right. |
| D14 | Extra spaces | Warning | Removes the spaces. |
| D15 | Possibly the same student twice | Warning | Similar names and details under different IDs. Import and link the records as possible duplicates, or keep them apart. |
| D16 | Note for an unknown student | Blocking | Suggests the closest student ID when there is one. |
| D17 | Social Security number in a note | Blocking | Replaces the number with "[SSN removed]". SSNs are never stored. |
| D18 | Sensitive note | Blocking | Mentions mental health, medical matters, a request for privacy or a government ID. Decide whether the note is sensitive. |
| D19 | Contact preference in a note | Warning or info | "By phone only", "prefers email", "best reached after 5 pm". Offers to save it as the student's [contact preference](#contact-preference); the note's contact type is never changed. Only the newest statement per student can be saved, and never over a newer preference already on the record (info). A note saying how a contact happened ("emailed the student") isn't a preference. |
| D20 | Follow-up date in a note | Warning | "Follow up by Oct 15". Sets it as the note's follow-up date. |
| D21 | Same note twice in the file | Warning | The same text under a different note ID. Leave the copy out. |
| D22 | Spreadsheet and notes disagree on last contact | Info | The later date is used. See [Which date counts as the last contact](#which-date-counts-as-the-last-contact). |
| D23 | Note by a different advisor | Info | The note was written by someone other than the student's assigned advisor. Shown for context. |

## Data Quality page

The Data Quality page is the record of every import: what the rules found in each file and what was done about it. The source files are never changed, so this page is where the fixes are recorded.

![The Data Quality page](/help/screens/data-quality.jpg "The Data Quality page after the sample data was loaded.")

### Summary tiles

- **Suggested fixes accepted**: dates converted, SSNs removed and other one-click fixes.
- **Kept as they were**: warnings someone looked at and left alone.
- **Rows left out**: rows excluded from an import.
- **Noted**: information only, nothing to fix.

### Import history

Every import, newest first: when it ran, the file, where it came from (an upload or the sample data) and how many records were added, updated, unchanged or left out.

### What the import rules found

One line per rule that found something, with its severity and how many records it affected. Click a rule to see how its records were resolved, examples with the value before and after the fix, and links to each record. A Social Security number is always masked here.

![A rule opened](/help/screens/data-quality-rule.jpg "The Social Security number rule, opened.")

**Import data** at the top right goes to the Import page.

## Privacy and sensitive information

Advising notes can hold personal details. The app is built to keep the most sensitive ones out, or out of sight.

### Social Security numbers

The app never stores a Social Security number. The import replaces any SSN in a note with "[SSN removed]", and the Log contact form won't save a note that contains one. Anything else that identifies a student should be looked up in the official systems, not copied into notes.

### Sensitive notes

A note marked sensitive stays collapsed in the timeline until someone chooses to read it. Use it for health, family or financial matters, or anything the student asked to keep private. The import asks about every note with sensitive words in it, and the Log contact form suggests it.

### Contact preferences

A student's [contact preference](#contact-preference) is shown wherever someone is about to reach out: in **Before you reach out** and at the top of the Log contact form. A preference saved from a note gets the same SSN check as the note itself, so it can never hold a number the note wasn't allowed to keep.

## Phones and small screens

The app works on a phone. The sidebar becomes a menu button at the top left, and the cards on a student's page stack under the timeline. Wide tables scroll sideways.

![The queue on a phone](/help/screens/mobile-queue.jpg "The Outreach Queue on a phone.")

![The menu on a phone](/help/screens/mobile-nav.jpg "The menu, opened from the button at the top left.")

![A student on a phone](/help/screens/mobile-student.jpg "A student's page on a phone.")

## Questions and troubleshooting

### Why is a student with a lower score above one with a higher score?

The queue ranks in groups before it looks at scores. Follow-ups due today or overdue come first, then students who have never been contacted, then everyone else. Within the last group, the higher score comes first. If you've sorted the table by another column, click **Rank** to go back to the outreach order.

### How do I mark a follow-up as done?

Log the contact, and tick **This contact completes the follow-up** in the form. The follow-up stays open until you do, even if other contacts are logged in between. See [Open follow-ups](#open-follow-ups).

### How do I change a student's contact preference?

On the student's page, click **Edit** next to it in **Before you reach out**, or **Add a contact preference** if there isn't one. You can also tick **Save as … contact preference** when the note you're logging states a new one. See [Contact preference](#contact-preference).

### Why doesn't the Last contact date match the spreadsheet?

The app uses the later of two dates: the spreadsheet's last contact date and the newest note. A logged contact is usually newer than the spreadsheet. **At a glance** on the student's page says which one was used.

### I imported a file. Why wasn't anything removed?

Imports only add and update. A student missing from a new file stays in the database, so a partial export can't wipe out records by accident. To start over, use [Reset the database to empty](#prototype-tools) and import again.

### Why can't I choose Contact notes on the Import page?

Notes are checked against the students in the database, so students must be imported first. With an empty database, the Contact notes option is turned off and says why.

### Why won't the Import button work?

At least one included row still has a blocking problem. The message next to the button says how many. Switch to **Needs attention**, fix or leave out those rows, and the button turns on.

### A date could be read two ways. Which one is right?

A date like 03/04/2026 can mean March 4 or April 3, depending on where the spreadsheet came from. The app doesn't guess. It offers both readings, so you can pick the one that matches how the file was written. Other dates in the same file are a good clue.

### Who sees the contacts I log?

Everyone using this copy of the app. There are no personal accounts in this prototype. The advisor recorded on a contact is the one chosen in the top bar, or the student's assigned advisor under All advisors.

### Keyboard shortcuts

| Keys | What they do |
| --- | --- |
| Ctrl+K or ⌘K | Search for a student from any page |
| ↑ and ↓, then Enter | Move through the Students table and open a student |
| Tab to a column heading, then Enter | Sort the queue or the Students table by that column |
| Esc | Close the search, a form or a window |
| / | Search the help, on this page |
