"use client"

import { useRef } from "react"
import { useRouter } from "next/navigation"
import { SearchX, TriangleAlert } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { EmptyState } from "@/components/shared/page-header"
import { SortHeader } from "@/components/shared/sort-header"
import { RiskBadge } from "@/components/shared/risk-badge"
import { LastContact } from "@/components/shared/contact-recency"
import { useSearchParamUpdater } from "@/hooks/use-search-param-updater"
import type { SortDirection, Student, StudentSortKey } from "@/lib/types"
import { fullName } from "@/lib/format"

const COLUMNS: { key: StudentSortKey; label: string; numeric?: boolean }[] = [
  { key: "student_id", label: "Student ID" },
  { key: "name", label: "Name" },
  { key: "major", label: "Major" },
  { key: "class_year", label: "Class year" },
  { key: "credits", label: "Credits", numeric: true },
  { key: "gpa", label: "GPA", numeric: true },
  { key: "advisor", label: "Advisor" },
  { key: "last_contact", label: "Last contact" },
  { key: "risk", label: "Risk" },
]

export function DirectoryTable({
  students,
  sort,
  dir,
}: {
  students: Student[]
  sort: StudentSortKey
  dir: SortDirection
}) {
  const router = useRouter()
  const { update } = useSearchParamUpdater()
  const bodyRef = useRef<HTMLTableSectionElement>(null)

  function onSort(key: StudentSortKey) {
    const nextDir: SortDirection = sort === key && dir === "asc" ? "desc" : "asc"
    update({ sort: key, dir: nextDir }, { resetPage: true })
  }

  function focusRow(index: number) {
    const rows = bodyRef.current?.querySelectorAll<HTMLTableRowElement>("tr")
    if (!rows?.length) return
    const target = rows[Math.max(0, Math.min(rows.length - 1, index))]
    rows.forEach((r) => (r.tabIndex = r === target ? 0 : -1))
    target.focus()
  }

  function onRowKeyDown(event: React.KeyboardEvent<HTMLTableRowElement>, index: number, id: string) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault()
        focusRow(index + 1)
        break
      case "ArrowUp":
        event.preventDefault()
        focusRow(index - 1)
        break
      case "Home":
        event.preventDefault()
        focusRow(0)
        break
      case "End":
        event.preventDefault()
        focusRow(Number.MAX_SAFE_INTEGER)
        break
      case "Enter":
        event.preventDefault()
        router.push(`/students/${id}`)
        break
    }
  }

  if (students.length === 0) {
    return (
      <EmptyState
        icon={SearchX}
        title="No students match these filters"
        description="Try a different search term or clear the filters."
      />
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] border-collapse text-sm">
        <caption className="sr-only">
          Student directory. Use the arrow keys to move between rows and Enter to open a student.
        </caption>
        <thead className="bg-cloud text-left text-[13px] text-navy">
          <tr>
            {COLUMNS.map((c) => (
              <SortHeader
                key={c.key}
                label={c.label}
                numeric={c.numeric}
                active={sort === c.key}
                dir={dir}
                nextDir={sort === c.key && dir === "asc" ? "desc" : "asc"}
                onSort={() => onSort(c.key)}
              />
            ))}
          </tr>
        </thead>
        <tbody ref={bodyRef}>
          {students.map((s, i) => (
            <tr
              key={s.student_id}
              tabIndex={i === 0 ? 0 : -1}
              aria-label={`${fullName(s)}, ${s.student_id}`}
              onClick={() => router.push(`/students/${s.student_id}`)}
              onKeyDown={(e) => onRowKeyDown(e, i, s.student_id)}
              onFocus={(e) => {
                if (e.target === e.currentTarget) {
                  bodyRef.current?.querySelectorAll("tr").forEach((r) => (r.tabIndex = r === e.currentTarget ? 0 : -1))
                }
              }}
              className="cursor-pointer border-t border-border hover:bg-muted focus-visible:bg-cloud/60"
            >
              <td className="px-2.5 py-2 font-mono text-[13px] tabular-nums whitespace-nowrap">
                <span className="inline-flex items-center gap-1.5">
                  {s.student_id}
                  {s.possible_duplicates.length > 0 && (
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <span
                            className="inline-flex text-amber"
                            role="img"
                            aria-label={`Possibly the same person as ${s.possible_duplicates.map((d) => `${d.student_id} ${d.name}`).join(", ")}`}
                          />
                        }
                      >
                        <TriangleAlert className="size-3.5" aria-hidden="true" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-72">
                        Possibly the same person as{" "}
                        {s.possible_duplicates.map((d) => `${d.student_id} ${d.name}`).join(", ")}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </span>
              </td>
              <td className="px-2.5 py-2 font-medium whitespace-nowrap text-navy">
                {s.last_name}, {s.first_name}
              </td>
              <td className="px-2.5 py-2">
                <span className="block max-w-40 truncate" title={s.major}>
                  {s.major}
                </span>
              </td>
              <td className="px-2.5 py-2">{s.class_year}</td>
              <td className="px-2.5 py-2 text-right tabular-nums">{s.credits_earned}</td>
              <td className="px-2.5 py-2 text-right tabular-nums">
                {s.gpa === null ? (
                  <span className="text-muted-foreground" aria-label="GPA missing">
                    —
                  </span>
                ) : (
                  s.gpa.toFixed(2)
                )}
              </td>
              <td className="px-2.5 py-2 whitespace-nowrap">{s.advisor}</td>
              <td className="px-2.5 py-2 whitespace-nowrap">
                <LastContact date={s.last_contact_date} days={s.days_since_contact} />
              </td>
              <td className="px-2.5 py-2">
                <RiskBadge risk={s.risk_flag} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
