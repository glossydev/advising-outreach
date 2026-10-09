import Link from "next/link"
import {
  CalendarClock,
  Hourglass,
  Lock,
  Mail,
  MessageCircleWarning,
  MessageSquareText,
  Phone,
  SearchCheck,
  Smartphone,
  TriangleAlert,
  UserRoundX,
  Users,
} from "lucide-react"
import { DaysSince } from "@/components/shared/contact-recency"
import { preferenceHeading } from "@/lib/contact-preference"
import type { ContactNote, ContactPreference, Student, StudentDataNote } from "@/lib/types"
import { NO_CONTACT_LABEL, describeFollowUp, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import { ContactPreferenceEditor } from "./contact-preference-editor"

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
    ["Credits earned", <span key="c" className="tabular-nums">{student.credits_earned}</span>],
    [
      "GPA",
      student.gpa === null ? (
        <span key="g" className="text-muted-foreground">
          — <span className="sr-only">not on record</span>
        </span>
      ) : (
        <span key="g" className="tabular-nums">{student.gpa.toFixed(2)}</span>
      ),
    ],
    ["Advisor", student.advisor],
    [
      "Last contact",
      student.last_contact_date ? (
        <span key="l" className="flex flex-col items-end leading-tight">
          {formatDate(student.last_contact_date)}
          <span className="text-[12px] text-muted-foreground">
            {student.last_contact_source === "spreadsheet" ? "from the spreadsheet (no note)" : "from the newest note"}
          </span>
        </span>
      ) : (
        <span key="l" className="font-medium text-signal">{NO_CONTACT_LABEL}</span>
      ),
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
        <ul className="flex flex-col gap-1">
          {student.outreach_reasons.map((r) => (
            <li key={r.rule + r.text} className="flex items-baseline justify-between gap-3 leading-relaxed">
              <span>{r.text}</span>
              <span className="shrink-0 text-[13px] tabular-nums text-muted-foreground">+{r.points}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">Nothing raises this student&apos;s priority right now.</p>
      )}
      <p className="text-[13px] leading-relaxed text-muted-foreground">
        Points for time since contact, the risk flag, GPA, credits, follow-ups and unanswered outreach, capped at 100.
        {student.follow_up_due && " A follow-up due today or overdue puts the student at the top of the queue."}
        {student.no_contact_on_record && " Students never contacted come next in the queue, after follow-ups that are due."} Not a
        prediction.
      </p>
    </DetailCard>
  )
}

function Item({ icon: Icon, tone = "default", children }: { icon: typeof Phone; tone?: "default" | "warn"; children: React.ReactNode }) {
  return (
    <li className="flex gap-2 leading-relaxed">
      <Icon className={cn("mt-1 size-4 shrink-0", tone === "warn" ? "text-signal" : "text-azurite")} aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </li>
  )
}

const CHANNEL_ICONS = { Phone, Email: Mail, Text: Smartphone } as const

/** Where a preference came from, in a few words. */
export function preferenceSource(pref: ContactPreference): string {
  const when = pref.stated_on ? formatDate(pref.stated_on) : null
  if (pref.source_note_id) return `From note ${pref.source_note_id}${when ? `, ${when}` : ""}`
  return `Entered on the student's page${when ? `, ${when}` : ""}`
}

/**
 * The things worth knowing before contacting this student: their contact preference (P9), an
 * unanswered outreach (D25), every open follow-up (P8), sensitive notes (D18) and where the
 * last-contact date comes from (D22, D24).
 */
export function BeforeYouReachOutCard({ student, notes }: { student: Student; notes: ContactNote[] }) {
  const pref = student.contact_preference
  const waiting = student.outreach_reasons.find((r) => r.rule === "waiting_on_student")
  const sensitive = notes.filter((n) => n.is_sensitive).length
  const items: React.ReactNode[] = []

  if (pref) {
    items.push(
      <Item key="pref" icon={pref.channel ? CHANNEL_ICONS[pref.channel] : MessageSquareText} tone="warn">
        <p className="font-medium text-navy">{preferenceHeading(pref)}</p>
        {pref.details && <p className="text-[13px] text-muted-foreground">&ldquo;{pref.details}&rdquo;</p>}
        <p className="flex flex-wrap items-center gap-x-2 text-[12px] text-muted-foreground">
          {preferenceSource(pref)}
          <ContactPreferenceEditor studentId={student.student_id} firstName={student.first_name} preference={pref} />
        </p>
      </Item>,
    )
  }
  if (student.no_contact_on_record) {
    items.push(
      <Item key="none" icon={UserRoundX} tone="warn">
        Never contacted. This would be the first outreach.
      </Item>,
    )
  }
  if (waiting) items.push(<Item key="wait" icon={Hourglass} tone="warn">{waiting.text}.</Item>)
  for (const f of student.open_follow_ups) {
    const { text, tone } = describeFollowUp(f.date)
    items.push(
      <Item key={`fu-${f.note_id}`} icon={CalendarClock} tone={tone === "later" ? "default" : "warn"}>
        <p className={cn(tone !== "later" && "font-medium text-navy")}>
          Follow-up {formatDate(f.date)}: {text.charAt(0).toLowerCase() + text.slice(1)}.
        </p>
        <p className="text-[12px] text-muted-foreground">Set in note {f.note_id}. Logging a contact can mark it done.</p>
      </Item>,
    )
  }
  if (student.last_contact_source === "spreadsheet" && student.last_contact_date) {
    items.push(
      <Item key="sheet" icon={MessageCircleWarning}>
        The last contact ({formatDate(student.last_contact_date)}) is from the spreadsheet; no note was written for it.
      </Item>,
    )
  }
  if (sensitive > 0) {
    items.push(
      <Item key="sens" icon={Lock}>
        {sensitive === 1 ? "One note is" : `${sensitive} notes are`} marked sensitive and collapsed in the timeline.
      </Item>,
    )
  }

  return (
    <DetailCard title="Before you reach out" titleId="reach-out-heading">
      {items.length > 0 ? (
        <ul className="flex flex-col gap-3">{items}</ul>
      ) : (
        <p className="flex gap-2 text-muted-foreground">
          <SearchCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          No contact preference, open follow-ups or unanswered outreach on record.
        </p>
      )}
      {!pref && <ContactPreferenceEditor studentId={student.student_id} firstName={student.first_name} preference={null} />}
    </DetailCard>
  )
}

export function DataNotesCard({ notes }: { notes: StudentDataNote[] }) {
  if (notes.length === 0) return null
  return (
    <DetailCard title="Data notes" titleId="data-notes-heading" className="border-l-4 border-l-amber">
      <p className="text-[13px] leading-relaxed text-muted-foreground">What the import found in this student&apos;s data, and what was done.</p>
      <ul className="flex flex-col gap-2.5">
        {notes.map((n, i) => (
          <li key={`${n.rule}-${n.record_id}-${i}`} className="flex gap-2 leading-relaxed">
            <TriangleAlert className="mt-1 size-4 shrink-0 text-amber" aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-medium text-navy">{n.title}</p>
              <p className="text-[13px] break-words">{n.message}</p>
              <p className="text-[12px] text-muted-foreground">{n.resolution}</p>
            </div>
          </li>
        ))}
      </ul>
    </DetailCard>
  )
}

/** D15: shown on both students' pages. Never merged automatically. */
export function DuplicateBanner({ student }: { student: Student }) {
  if (student.possible_duplicates.length === 0) return null
  return (
    <div role="note" className="flex gap-3 rounded-lg border border-amber/50 bg-caliche/60 p-4">
      <Users className="mt-0.5 size-5 shrink-0 text-brick" aria-hidden="true" />
      <div className="flex flex-col gap-1 leading-relaxed">
        <p className="font-medium text-navy">
          Possibly the same person as{" "}
          {student.possible_duplicates.map((d, i) => (
            <span key={d.student_id}>
              {i > 0 && ", "}
              <Link href={`/students/${d.student_id}`} className="text-azurite underline underline-offset-2 hover:text-navy">
                {d.name} ({d.student_id})
              </Link>
            </span>
          ))}
        </p>
        <p className="text-[13px] text-muted-foreground">
          Linked during import: similar name, same major or class year, different ID, email and advisor. Check before contacting
          both, and confirm with the registrar before treating them as one student.
        </p>
      </div>
    </div>
  )
}
