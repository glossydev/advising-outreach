import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { NotebookPen } from "lucide-react"
import { RiskBadge } from "@/components/shared/risk-badge"
import { EmptyState } from "@/components/shared/page-header"
import { LogContactButton } from "@/components/log-contact/log-contact-button"
import { BackLink } from "@/components/student-detail/back-link"
import { ContactTimeline } from "@/components/student-detail/contact-timeline"
import {
  AtAGlanceCard,
  BeforeYouReachOutCard,
  DataNotesCard,
  DuplicateBanner,
  OutreachPriorityCard,
} from "@/components/student-detail/detail-cards"
import { getNotes, getStudent, getStudentDataNotes } from "@/lib/data"
import { getSelectedAdvisor } from "@/lib/advisor"
import { fullName } from "@/lib/format"

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const student = await getStudent((await params).id)
  return { title: student ? fullName(student) : "Student not found" }
}

export default async function StudentDetailPage({ params }: Props) {
  const { id } = await params
  const [student, advisor] = await Promise.all([getStudent(id), getSelectedAdvisor()])
  if (!student) notFound()
  const [notes, dataNotes] = await Promise.all([getNotes(student.student_id), getStudentDataNotes(student.student_id)])

  const sheetStudent = {
    student_id: student.student_id,
    first_name: student.first_name,
    last_name: student.last_name,
    advisor: student.advisor,
    contact_preference: student.contact_preference,
    open_follow_ups: student.open_follow_ups,
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
        <BackLink />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight text-navy text-balance">{fullName(student)}</h1>
            <p className="flex flex-wrap items-center gap-x-2 text-[13px] text-muted-foreground">
              <span className="font-mono text-foreground">{student.student_id}</span>
              <span aria-hidden="true">·</span>
              <a href={`mailto:${student.email}`} className="text-azurite hover:underline">
                {student.email}
              </a>
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="inline-flex items-center rounded-md border border-azurite/30 bg-cloud px-2 py-0.5 text-[12px] font-medium text-navy">
                {student.class_year}
              </span>
              <RiskBadge risk={student.risk_flag} />
            </div>
          </div>
          <LogContactButton student={sheetStudent} selectedAdvisor={advisor} />
        </div>
      </header>

      <DuplicateBanner student={student} />

      {/*
        Three columns once the content area has 60rem (1280px screens and up with the sidebar). Between 40 and 60rem,
        the timeline takes the full width and the cards sit two-up beneath it; narrower, everything stacks.
      */}
      <div className="grid gap-6 @min-[60rem]:grid-cols-3">
        <section
          aria-labelledby="timeline-heading"
          className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 @min-[60rem]:col-span-2"
        >
          <h2 id="timeline-heading" className="text-lg font-semibold text-navy">
            Contact timeline
          </h2>
          {notes.length === 0 ? (
            <EmptyState
              icon={NotebookPen}
              title="No advising contacts on record"
              description={`Log the first contact with ${student.first_name} to start the timeline.`}
              action={<LogContactButton student={sheetStudent} selectedAdvisor={advisor} variant="outline" />}
            />
          ) : (
            <ContactTimeline notes={notes} />
          )}
        </section>

        <aside
          className="grid items-start gap-4 @min-[40rem]:grid-cols-2 @min-[60rem]:flex @min-[60rem]:flex-col"
          aria-label="Student summary"
        >
          <BeforeYouReachOutCard student={student} notes={notes} />
          <OutreachPriorityCard student={student} />
          <AtAGlanceCard student={student} />
          <DataNotesCard notes={dataNotes} />
        </aside>
      </div>
    </div>
  )
}
