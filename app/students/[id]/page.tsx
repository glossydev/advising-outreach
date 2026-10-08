import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { NotebookPen } from "lucide-react"
import { RiskBadge } from "@/components/shared/risk-badge"
import { EmptyState } from "@/components/shared/page-header"
import { LogContactButton } from "@/components/log-contact/log-contact-button"
import { BackLink } from "@/components/student-detail/back-link"
import { ContactTimeline } from "@/components/student-detail/contact-timeline"
import { TimelineSkeleton } from "@/components/student-detail/timeline-skeleton"
import {
  AiSummaryCard,
  AtAGlanceCard,
  DataNotesCard,
  OutreachPriorityCard,
} from "@/components/student-detail/detail-cards"
import { getNotes, getNotesSummary, getStudent } from "@/lib/data"
import { getSelectedAdvisor } from "@/lib/advisor"
import { AI_SUMMARIES_CONFIGURED } from "@/lib/config"
import { fullName } from "@/lib/format"
import type { Student } from "@/lib/types"

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const student = await getStudent((await params).id)
  return { title: student ? fullName(student) : "Student not found" }
}

export default async function StudentDetailPage({ params }: Props) {
  const { id } = await params
  const [student, advisor] = await Promise.all([getStudent(id), getSelectedAdvisor()])
  if (!student) notFound()

  const sheetStudent = {
    student_id: student.student_id,
    first_name: student.first_name,
    last_name: student.last_name,
    advisor: student.advisor,
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

      <div className="grid gap-6 lg:grid-cols-3">
        <section aria-labelledby="timeline-heading" className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 lg:col-span-2">
          <h2 id="timeline-heading" className="text-lg font-semibold text-navy">
            Contact timeline
          </h2>
          <Suspense fallback={<TimelineSkeleton />}>
            <Timeline student={student} advisor={advisor} sheetStudent={sheetStudent} />
          </Suspense>
        </section>

        <aside className="flex flex-col gap-4" aria-label="Student summary">
          <AtAGlanceCard student={student} />
          <OutreachPriorityCard student={student} />
          <Suspense fallback={<div className="h-40 animate-pulse rounded-lg border border-border bg-card" />}>
            <SummaryCard studentId={student.student_id} />
          </Suspense>
          <DataNotesCard issues={student.data_issues} />
        </aside>
      </div>
    </div>
  )
}

async function Timeline({
  student,
  advisor,
  sheetStudent,
}: {
  student: Student
  advisor: string | null
  sheetStudent: React.ComponentProps<typeof LogContactButton>["student"]
}) {
  const notes = await getNotes(student.student_id)
  if (notes.length === 0) {
    return (
      <EmptyState
        icon={NotebookPen}
        title="No advising contacts on record"
        description={`Log the first contact with ${student.first_name} to start the timeline.`}
        action={<LogContactButton student={sheetStudent} selectedAdvisor={advisor} variant="outline" />}
      />
    )
  }
  return <ContactTimeline notes={notes} />
}

async function SummaryCard({ studentId }: { studentId: string }) {
  const summary = AI_SUMMARIES_CONFIGURED ? await getNotesSummary(studentId) : null
  return <AiSummaryCard configured={AI_SUMMARIES_CONFIGURED} summary={summary} />
}
