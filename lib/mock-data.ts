import type { RawNoteRow, RawStudentRow } from "./types"
import { TODAY_ISO } from "./config"
import { addDays } from "./format"

/**
 * Seed spreadsheets for the prototype. These mimic students.csv and contact_notes.csv,
 * including deliberately messy rows, and are run through the same import pipeline as uploads.
 */

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rand = mulberry32(20261005)
const pick = <T,>(items: readonly T[]) => items[Math.floor(rand() * items.length)]
const between = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min

const ADVISORS = [
  "Elena Marquez",
  "James Whitfield",
  "Priya Raman",
  "Marcus Chen",
  "Danielle Okafor",
  "Rachel Bergstrom",
] as const

const MAJORS = [
  "Psychology",
  "Computer Science",
  "Biology",
  "Mechanical Engineering",
  "Business Administration",
  "Nursing",
  "Communication",
  "Political Science",
  "Physiology",
  "Environmental Science",
  "Mathematics",
  "Economics",
  "Public Health",
  "Studio Art",
] as const

const NAMES: [string, string][] = [
  ["Aaliyah", "Johnson"], ["Mateo", "Hernandez"], ["Sophie", "Nguyen"], ["Ethan", "Begay"],
  ["Isabella", "Romero"], ["Noah", "Patel"], ["Chloe", "Whitaker"], ["Diego", "Alvarez"],
  ["Hannah", "Kowalski"], ["Liam", "O'Brien"], ["Maya", "Tsosie"], ["Owen", "Fischer"],
  ["Zoe", "Ramirez"], ["Caleb", "Washington"], ["Ava", "Kim"], ["Julian", "Morales"],
  ["Grace", "Holloway"], ["Elijah", "Yazzie"], ["Lucia", "Castillo"], ["Benjamin", "Ortiz"],
  ["Nora", "Lindqvist"], ["Samuel", "Adeyemi"], ["Emily", "Tran"], ["Gabriel", "Soto"],
  ["Leah", "Goldberg"], ["Isaac", "Mendoza"], ["Priyanka", "Shah"], ["Andre", "Thompson"],
  ["Camila", "Vega"], ["Tyler", "McAllister"], ["Fatima", "Haddad"], ["Lucas", "Ferreira"],
  ["Mia", "Delgado"], ["Jonah", "Whitehorse"], ["Ruby", "Sandoval"], ["Henry", "Albright"],
  ["Ana", "Gutierrez"], ["Xavier", "Brooks"], ["Lily", "Chavez"], ["Daniel", "Okoro"],
  ["Sara", "Lindgren"], ["Adrian", "Reyes"], ["Jasmine", "Carter"], ["Kai", "Nakamura"],
  ["Valeria", "Flores"], ["Malik", "Robinson"], ["Olivia", "Duarte"], ["Rafael", "Ibarra"],
  ["Tessa", "Moreno"], ["Wesley", "Harjo"],
]

const CLASS_YEARS = ["Freshman", "Sophomore", "Junior", "Senior", "Graduate"] as const
const CREDIT_RANGES: Record<(typeof CLASS_YEARS)[number], [number, number]> = {
  Freshman: [0, 29],
  Sophomore: [30, 59],
  Junior: [60, 89],
  Senior: [90, 132],
  Graduate: [6, 42],
}

const NOTE_COUNTS = [
  11, 0, 3, 2, 3, 0, 4, 4, 1, 3,
  0, 2, 7, 1, 2, 0, 3, 1, 2, 4,
  1, 0, 2, 8, 1, 3, 2, 0, 1, 2,
  5, 1, 0, 2, 3, 1, 2, 0, 1, 10,
  4, 2, 3, 1, 2, 3, 2, 1, 0, 4,
]

const NEWEST_CONTACT_DAYS_AGO = [2, 4, 6, 9, 12, 16, 21, 26, 33, 38, 44, 52, 61, 67, 74, 88, 95, 112, 134, 171]

interface NoteTopic {
  summary: string
  body: (first: string) => string
  method: RawNoteRow["method"][]
  followUp: boolean
}

const TOPICS: NoteTopic[] = [
  {
    summary: "Registration hold cleared; spring schedule reviewed",
    body: (f) =>
      `${f} had a bursar hold blocking spring registration. Confirmed payment plan posted and the hold was lifted while we met. Reviewed a 15-unit draft schedule and swapped a conflicting lab section.`,
    method: ["in_person", "video"],
    followUp: false,
  },
  {
    summary: "Discussed withdrawal from CHEM 151 before deadline",
    body: (f) =>
      `${f} is failing CHEM 151 after two exams and asked about withdrawing. Walked through the W deadline, impact on financial aid SAP, and the plan to retake in summer. ${f} will talk to the instructor first.`,
    method: ["in_person", "phone"],
    followUp: true,
  },
  {
    summary: "Exploring change of major",
    body: (f) =>
      `${f} is reconsidering the current major and is interested in options that keep most completed credits. Ran a what-if degree audit for two alternatives and shared the career services exploration workshop.`,
    method: ["video", "in_person"],
    followUp: true,
  },
  {
    summary: "Graduation audit: two requirements outstanding",
    body: (f) =>
      `Ran the graduation audit with ${f}. Still missing one upper-division Gen Ed and the writing emphasis course. Both are offered next term; ${f} plans to enroll during priority registration.`,
    method: ["video", "email"],
    followUp: true,
  },
  {
    summary: "Academic probation check-in",
    body: (f) =>
      `Required probation check-in. ${f} is attending tutoring twice a week and reports improved quiz scores in math. Discussed limiting work hours during finals and signed the success contract.`,
    method: ["in_person"],
    followUp: true,
  },
  {
    summary: "Referred to Think Tank tutoring",
    body: (f) =>
      `${f} is struggling with calculus problem sets. Referred to drop-in tutoring and the supplemental instruction sessions. Shared hours and the booking link by email after the meeting.`,
    method: ["email", "in_person"],
    followUp: false,
  },
  {
    summary: "Financial aid appeal paperwork",
    body: (f) =>
      `${f} lost aid eligibility after last term. Explained the SAP appeal process and what the academic plan needs to include. Drafted the plan together; ${f} will submit to the aid office this week.`,
    method: ["in_person", "phone"],
    followUp: true,
  },
  {
    summary: "Internship credit options",
    body: (f) =>
      `${f} has a summer internship offer and wants it to count for credit. Reviewed the internship course requirements, faculty sponsor process, and registration timeline.`,
    method: ["email", "video"],
    followUp: false,
  },
  {
    summary: "Study abroad course equivalencies",
    body: (f) =>
      `${f} is applying to a spring semester exchange. Reviewed which courses have existing equivalencies and which need a petition. Sent the course approval form.`,
    method: ["video", "email"],
    followUp: true,
  },
  {
    summary: "Wellness check after missed classes",
    body: (f) =>
      `Faculty early alert reported several missed classes. Reached ${f}, who described a stressful few weeks. Shared counseling and dean of students resources; ${f} agreed to email instructors about missed work.`,
    method: ["phone", "text"],
    followUp: true,
  },
  {
    summary: "Transfer credit evaluation questions",
    body: (f) =>
      `${f} had questions about community college credits that posted as electives. Explained the petition process for direct equivalencies and which syllabi to gather.`,
    method: ["email"],
    followUp: false,
  },
  {
    summary: "Four-year plan update",
    body: (f) =>
      `Updated ${f}'s four-year plan after this term's grades. On track for an on-time graduation if a summer course is added. Flagged the prerequisite chain for the capstone.`,
    method: ["in_person", "video"],
    followUp: false,
  },
  {
    summary: "No response to outreach email",
    body: (f) =>
      `Sent outreach about the early alert and an invitation to schedule. No reply from ${f} yet. Will try a phone call next.`,
    method: ["email", "text"],
    followUp: true,
  },
  {
    summary: "Brief check-in at advising drop-in",
    body: (f) =>
      `${f} stopped by drop-in hours with a quick question about adding a minor. Confirmed eligibility and pointed to the declaration form. No concerns raised.`,
    method: ["in_person"],
    followUp: false,
  },
]

function buildStudents() {
  const students: RawStudentRow[] = NAMES.map(([first, last], i) => {
    const classYear = i % 11 === 10 ? "Graduate" : CLASS_YEARS[i % 4]
    const [cMin, cMax] = CREDIT_RANGES[classYear]
    const id = `S1${String(23 + i * 17).padStart(4, "0")}`
    const gpaValue = Math.round((1.55 + rand() * 2.45) * 100) / 100
    const riskRoll = rand()
    const risk = gpaValue < 2.1 || riskRoll < 0.12 ? "high" : riskRoll < 0.42 ? "medium" : riskRoll < 0.93 ? "low" : "unknown"
    const handle = `${first[0]}${last}`.toLowerCase().replace(/[^a-z]/g, "")

    return {
      student_id: id,
      first_name: first,
      last_name: last,
      email: `${handle}@arizona.edu`,
      major: MAJORS[(i * 5 + 3) % MAJORS.length],
      class_year: classYear,
      credits: String(between(cMin, cMax)),
      gpa: gpaValue.toFixed(2),
      advisor: ADVISORS[i % ADVISORS.length],
      last_contact_date: "",
      risk_flag: risk,
    }
  })
  return students
}

function buildNotes(students: RawStudentRow[]) {
  const notes: RawNoteRow[] = []
  let noteSeq = 1

  students.forEach((student, i) => {
    const count = NOTE_COUNTS[i] ?? 0
    if (count === 0) return

    let daysAgo = pick(NEWEST_CONTACT_DAYS_AGO)
    const studentNotes: RawNoteRow[] = []
    for (let n = 0; n < count; n++) {
      const topic = TOPICS[(i * 3 + n * 5) % TOPICS.length]
      const contactDate = addDays(TODAY_ISO, -daysAgo)
      const loggedNextDay = rand() < 0.2
      const createdDate = loggedNextDay ? addDays(contactDate, 1) : contactDate
      const hasFollowUp = topic.followUp && rand() < 0.75
      studentNotes.push({
        note_id: `N${String(noteSeq++).padStart(4, "0")}`,
        student_id: student.student_id,
        contact_date: contactDate,
        method: pick(topic.method),
        advisor: student.advisor,
        summary: topic.summary,
        body: topic.body(student.first_name),
        follow_up_date: hasFollowUp ? addDays(contactDate, between(10, 28)) : "",
        created_at: `${createdDate}T${String(between(8, 16)).padStart(2, "0")}:${String(between(0, 59)).padStart(2, "0")}:00Z`,
      })
      daysAgo += between(9, 48)
    }
    notes.push(...studentNotes)
    student.last_contact_date = studentNotes[0].contact_date
  })

  return notes
}

function applyImperfections(students: RawStudentRow[], notes: RawNoteRow[]) {
  const byIndex = (i: number) => students[i]

  // Missing GPAs, as exported from the SIS.
  byIndex(5).gpa = ""
  byIndex(18).gpa = "N/A"
  byIndex(33).gpa = ""
  byIndex(44).gpa = "--"

  // Risk flags typed by hand.
  byIndex(9).risk_flag = "HIGH"
  byIndex(27).risk_flag = "?"

  // Non-ISO dates in the spreadsheet.
  byIndex(3).last_contact_date = toUsDate(byIndex(3).last_contact_date)
  byIndex(14).last_contact_date = toUsDate(byIndex(14).last_contact_date)
  byIndex(20).last_contact_date = "sometime in Aug"

  // Spreadsheet last_contact_date is stale compared to the notes.
  byIndex(0).last_contact_date = addDays(byIndex(0).last_contact_date, -41)
  byIndex(12).last_contact_date = addDays(byIndex(12).last_contact_date, -73)
  byIndex(39).last_contact_date = addDays(byIndex(39).last_contact_date, -19)

  // Contacted before notes were tracked; no notes on file.
  byIndex(10).last_contact_date = addDays(TODAY_ISO, -48)
  byIndex(32).last_contact_date = addDays(TODAY_ISO, -11)

  // Duplicate student rows exported twice with different values.
  students.push({ ...byIndex(7), advisor: ADVISORS[2], last_contact_date: addDays(TODAY_ISO, -200) })
  students.push({ ...byIndex(23), email: byIndex(23).email.toUpperCase(), last_contact_date: "" })

  // Notes with non-ISO dates and free-text methods.
  const firstNoteOf = (i: number) => notes.find((n) => n.student_id === byIndex(i).student_id)
  const n1 = firstNoteOf(30)
  if (n1) n1.contact_date = toUsDate(n1.contact_date, true)
  const n2 = firstNoteOf(41)
  if (n2) n2.method = "Zoom"
  const n3 = firstNoteOf(16)
  if (n3) n3.method = "walk-in"

  // Orphan notes for students not in the roster.
  notes.push(
    {
      note_id: "N9001",
      student_id: "S19999",
      contact_date: addDays(TODAY_ISO, -30),
      method: "email",
      advisor: ADVISORS[1],
      summary: "Follow-up on readmission paperwork",
      body: "Emailed readmission checklist and deadlines.",
      follow_up_date: "",
      created_at: `${addDays(TODAY_ISO, -30)}T10:12:00Z`,
    },
    {
      note_id: "N9002",
      student_id: "S10999",
      contact_date: addDays(TODAY_ISO, -64),
      method: "phone",
      advisor: ADVISORS[4],
      summary: "Left voicemail about early alert",
      body: "Left a voicemail asking the student to schedule an appointment.",
      follow_up_date: "",
      created_at: `${addDays(TODAY_ISO, -64)}T14:40:00Z`,
    },
  )
}

function toUsDate(iso: string, shortYear = false) {
  if (!iso) return iso
  const [y, m, d] = iso.split("-")
  return `${Number(m)}/${Number(d)}/${shortYear ? y.slice(2) : y}`
}

function buildSeed() {
  const students = buildStudents()
  const notes = buildNotes(students)
  applyImperfections(students, notes)
  return { students, notes }
}

export const SEED = buildSeed()
