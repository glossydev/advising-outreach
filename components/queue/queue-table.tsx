"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { CircleCheck, MessageSquarePlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/shared/page-header"
import { RiskBadge } from "@/components/shared/risk-badge"
import { LastContact } from "@/components/shared/contact-recency"
import { ReasonChips, ScoreBar } from "@/components/shared/score-bar"
import { SortHeader } from "@/components/shared/sort-header"
import { StudentCell } from "@/components/shared/student-cell"
import { LogContactSheet } from "@/components/log-contact/log-contact-sheet"
import { useSearchParamUpdater } from "@/hooks/use-search-param-updater"
import { QUEUE_SORT_DEFAULT_DIR } from "@/lib/search-params"
import type { FollowUp, QueueSortKey, QueueStudent, SortDirection, Student } from "@/lib/types"
import { describeFollowUp, formatDate, fullName } from "@/lib/format"
import { cn } from "@/lib/utils"

const SORTABLE: { key: QueueSortKey; label: string }[] = [
  { key: "rank", label: "Rank" },
  { key: "name", label: "Student" },
  { key: "risk", label: "Risk" },
  { key: "last_contact", label: "Last contact" },
  { key: "follow_up", label: "Follow-up" },
  { key: "score", label: "Score" },
]

const SORT_DESCRIPTIONS: Record<QueueSortKey, string> = {
  rank: "outreach rank",
  name: "student name",
  risk: "risk flag",
  last_contact: "last contact date",
  follow_up: "follow-up date",
  score: "outreach score",
}

/** The soonest open follow-up (P8): red when due or overdue, brick in the two days before. */
function FollowUpCell({ followUps }: { followUps: FollowUp[] }) {
  const next = followUps[0]
  if (!next) {
    return (
      <>
        <span aria-hidden="true" className="text-muted-foreground">
          —
        </span>
        <span className="sr-only">None</span>
      </>
    )
  }
  const { text, tone } = describeFollowUp(next.date)
  return (
    <span className="flex flex-col leading-tight">
      <span className="tabular-nums">{formatDate(next.date)}</span>
      <span
        className={cn(
          "text-[13px]",
          tone === "due" ? "font-medium text-signal" : tone === "soon" ? "font-medium text-brick" : "text-muted-foreground",
        )}
      >
        {text}
        {followUps.length > 1 && ` (+${followUps.length - 1} more)`}
      </span>
    </span>
  )
}

export function QueueTable({
  students,
  selectedAdvisor,
  sort = "rank",
  dir = "asc",
}: {
  students: QueueStudent[]
  selectedAdvisor: string | null
  sort?: QueueSortKey
  dir?: SortDirection
}) {
  const router = useRouter()
  const { update } = useSearchParamUpdater()
  const [active, setActive] = useState<Student | null>(null)
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLElement | null>(null)

  if (students.length === 0) {
    return (
      <EmptyState
        icon={CircleCheck}
        title="Everyone in this view has been contacted recently"
        description="Loosen the filters or switch advisors to see more students."
      />
    )
  }

  const nextDir = (key: QueueSortKey): SortDirection =>
    key === sort ? (dir === "asc" ? "desc" : "asc") : QUEUE_SORT_DEFAULT_DIR[key]

  // Default order and direction stay out of the URL, so the plain queue keeps a plain address.
  function onSort(key: QueueSortKey) {
    const next = nextDir(key)
    update(
      { sort: key === "rank" && next === "asc" ? null : key, dir: next === QUEUE_SORT_DEFAULT_DIR[key] ? null : next },
      { resetPage: false },
    )
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <caption className="sr-only">
            Students ranked for outreach: follow-ups due today or overdue first, then students never contacted, then by outreach
            score. Sorted by {SORT_DESCRIPTIONS[sort]}, {dir === "asc" ? "ascending" : "descending"}. The rank stays the outreach
            order.
          </caption>
          <thead className="bg-cloud text-left text-[13px] text-navy">
            <tr>
              {SORTABLE.map((c) => (
                <SortHeader
                  key={c.key}
                  label={c.label}
                  numeric={c.key === "rank"}
                  active={sort === c.key}
                  dir={dir}
                  nextDir={nextDir(c.key)}
                  onSort={() => onSort(c.key)}
                  className="px-2"
                />
              ))}
              <th scope="col" className="px-2 py-2 font-semibold">
                Reasons
              </th>
              <th scope="col" className="px-2 py-2 text-right font-semibold">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr
                key={s.student_id}
                onClick={() => router.push(`/students/${s.student_id}`)}
                className="cursor-pointer border-t border-border align-middle hover:bg-muted"
              >
                <td className="px-2 py-2 text-right font-medium tabular-nums text-muted-foreground">{s.rank}</td>
                <td className="px-2 py-2">
                  <div className="max-w-44">
                    <StudentCell student={s} />
                  </div>
                </td>
                <td className="px-2 py-2">
                  <RiskBadge risk={s.risk_flag} />
                </td>
                <td className="px-2 py-2 whitespace-nowrap">
                  <LastContact date={s.last_contact_date} days={s.days_since_contact} />
                </td>
                <td className="px-2 py-2 whitespace-nowrap">
                  <FollowUpCell followUps={s.open_follow_ups} />
                </td>
                <td className="px-2 py-2">
                  <ScoreBar score={s.outreach_score} />
                </td>
                <td className="px-2 py-2">
                  {/* Capped so the chips wrap instead of pushing Log contact off the edge at laptop widths. */}
                  <div className="max-w-44">
                    <ReasonChips reasons={s.outreach_reasons.map((r) => r.text)} />
                  </div>
                </td>
                <td className="px-2 py-2 text-right whitespace-nowrap">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-card"
                    aria-label={`Log contact for ${fullName(s)}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      triggerRef.current = e.currentTarget
                      setActive(s)
                      setOpen(true)
                    }}
                  >
                    <MessageSquarePlus aria-hidden="true" />
                    Log contact
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <LogContactSheet
        student={active}
        open={open}
        onOpenChange={setOpen}
        selectedAdvisor={selectedAdvisor}
        finalFocus={triggerRef}
      />
    </>
  )
}
