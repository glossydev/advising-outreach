import { Sparkles, TriangleAlert } from "lucide-react"
import { DaysSince } from "@/components/shared/contact-recency"
import type { NotesSummary, Student } from "@/lib/types"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"

export function DetailCard({
  title,
  children,
  className,
  titleId,
}: {
  title: string
  children: React.ReactNode
  className?: string
  titleId: string
}) {
  return (
    <section aria-labelledby={titleId} className={cn("flex flex-col gap-3 rounded-lg border border-border bg-card p-4", className)}>
      <h2 id={titleId} className="text-[13px] font-semibold tracking-wide text-navy uppercase">
        {title}
      </h2>
      {children}
    </section>
  )
}

export function AtAGlanceCard({ student }: { student: Student }) {
  const rows: [string, React.ReactNode][] = [
    ["Major", student.major],
    ["Class year", student.class_year],
    ["Credits", <span key="c" className="tabular-nums">{student.credits}</span>],
    [
      "GPA",
      student.gpa === null ? (
        <span key="g" className="text-muted-foreground">
          — <span className="sr-only">missing</span>
        </span>
      ) : (
        <span key="g" className="tabular-nums">{student.gpa.toFixed(2)}</span>
      ),
    ],
    ["Advisor", student.advisor],
    [
      "Last contact",
      student.last_contact_date ? formatDate(student.last_contact_date) : <span key="l" className="font-medium text-signal">Never</span>,
    ],
    ["Days since contact", <DaysSince key="d" days={student.days_since_contact} />],
  ]
  return (
    <DetailCard title="At a glance" titleId="glance-heading">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-[13px] text-muted-foreground">{label}</dt>
            <dd className="text-right text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
    </DetailCard>
  )
}

export function OutreachPriorityCard({ student }: { student: Student }) {
  return (
    <DetailCard title="Outreach priority" titleId="priority-heading">
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <span className="text-3xl leading-none font-semibold tabular-nums text-navy">
            {student.outreach_score}
            <span className="text-sm font-normal text-muted-foreground"> / 100</span>
          </span>
          <span className="text-[13px] text-muted-foreground">Rule-based score</span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-cloud"
          role="meter"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={student.outreach_score}
          aria-label="Outreach score"
        >
          <div className="h-full rounded-full bg-azurite" style={{ width: `${student.outreach_score}%` }} />
        </div>
      </div>
      {student.outreach_reasons.length > 0 ? (
        <ul className="flex list-disc flex-col gap-1 pl-5 leading-relaxed marker:text-azurite">
          {student.outreach_reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">No outreach rules triggered.</p>
      )}
      <p className="text-[13px] leading-relaxed text-muted-foreground">
        Computed from contact recency, GPA, credits, and the risk flag. Not a prediction.
      </p>
    </DetailCard>
  )
}

export function AiSummaryCard({ configured, summary }: { configured: boolean; summary: NotesSummary | null }) {
  return (
    <DetailCard title="Summary of past notes" titleId="summary-heading">
      {!configured ? (
        <div className="flex items-start gap-2 rounded-md bg-muted p-3 text-muted-foreground">
          <Sparkles className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p className="leading-relaxed">
            AI summaries are not configured. Set <code className="font-mono text-[13px] text-foreground">ANTHROPIC_API_KEY</code> to
            enable.
          </p>
        </div>
      ) : !summary ? (
        <p className="text-muted-foreground">No notes to summarize yet.</p>
      ) : (
        <>
          <p className="leading-relaxed text-pretty">{summary.summary}</p>
          <figure className="flex flex-col gap-1">
            <figcaption className="text-[13px] font-medium text-muted-foreground">Suggested opening</figcaption>
            <blockquote className="border-l-2 border-azurite bg-cloud/60 px-3 py-2 leading-relaxed text-navy italic">
              {summary.suggested_opening}
            </blockquote>
          </figure>
          <p className="text-[13px] text-muted-foreground">Generated draft. Review before sending.</p>
        </>
      )}
    </DetailCard>
  )
}

export function DataNotesCard({ issues }: { issues: string[] }) {
  if (issues.length === 0) return null
  return (
    <DetailCard title="Data notes" titleId="data-notes-heading" className="border-l-4 border-l-amber">
      <ul className="flex flex-col gap-1.5">
        {issues.map((issue) => (
          <li key={issue} className="flex gap-2 leading-relaxed">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber" aria-hidden="true" />
            {issue}
          </li>
        ))}
      </ul>
    </DetailCard>
  )
}
