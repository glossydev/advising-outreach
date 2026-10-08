"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { CircleCheck, MessageSquarePlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/shared/page-header"
import { RiskBadge } from "@/components/shared/risk-badge"
import { LastContact } from "@/components/shared/contact-recency"
import { ReasonChips, ScoreBar } from "@/components/shared/score-bar"
import { StudentCell } from "@/components/shared/student-cell"
import { LogContactSheet } from "@/components/log-contact/log-contact-sheet"
import type { Student } from "@/lib/types"
import { fullName } from "@/lib/format"

export function QueueTable({ students, selectedAdvisor }: { students: Student[]; selectedAdvisor: string | null }) {
  const router = useRouter()
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

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[840px] border-collapse text-sm">
          <caption className="sr-only">
            Students ranked for outreach: no contact on record first, then by outreach score, highest first
          </caption>
          <thead className="bg-cloud text-left text-[13px] text-navy">
            <tr>
              <th scope="col" className="w-12 px-3 py-2 text-right font-semibold">
                Rank
              </th>
              <th scope="col" className="px-3 py-2 font-semibold">
                Student
              </th>
              <th scope="col" className="px-3 py-2 font-semibold">
                Risk
              </th>
              <th scope="col" className="px-3 py-2 font-semibold">
                Last contact
              </th>
              <th scope="col" className="px-3 py-2 font-semibold">
                Score
              </th>
              <th scope="col" className="px-3 py-2 font-semibold">
                Reasons
              </th>
              <th scope="col" className="px-3 py-2 text-right font-semibold">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, i) => (
              <tr
                key={s.student_id}
                onClick={() => router.push(`/students/${s.student_id}`)}
                className="cursor-pointer border-t border-border align-middle hover:bg-muted"
              >
                <td className="px-3 py-2 text-right font-medium tabular-nums text-muted-foreground">{i + 1}</td>
                <td className="max-w-64 px-3 py-2">
                  <StudentCell student={s} />
                </td>
                <td className="px-3 py-2">
                  <RiskBadge risk={s.risk_flag} />
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <LastContact date={s.last_contact_date} days={s.days_since_contact} />
                </td>
                <td className="px-3 py-2">
                  <ScoreBar score={s.outreach_score} />
                </td>
                <td className="px-3 py-2">
                  <ReasonChips reasons={s.outreach_reasons.map((r) => r.text)} />
                </td>
                <td className="px-3 py-2 text-right">
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
