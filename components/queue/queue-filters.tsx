"use client"

import { AdvisorSelect } from "@/components/app-shell/advisor-select"
import { MultiFilterSelect, SingleFilterSelect } from "@/components/shared/filter-select"
import { RISK_LABELS } from "@/components/shared/risk-badge"
import { Button } from "@/components/ui/button"
import { useSearchParamUpdater } from "@/hooks/use-search-param-updater"
import { CLASS_YEARS, MIN_DAY_OPTIONS, RISK_FLAGS } from "@/lib/search-params"

const RISK_OPTIONS = RISK_FLAGS.map((r) => ({ value: r, label: RISK_LABELS[r] }))
const YEAR_OPTIONS = CLASS_YEARS.map((y) => ({ value: y, label: y }))
const DAY_OPTIONS = [
  { value: "0", label: "Any" },
  ...MIN_DAY_OPTIONS.map((d) => ({ value: String(d), label: `${d}+ days` })),
]

export function QueueFilters({
  advisors,
  selectedAdvisor,
  risks,
  classYears,
  minDays,
}: {
  advisors: string[]
  selectedAdvisor: string | null
  risks: string[]
  classYears: string[]
  minDays?: number
}) {
  const { update, clear, pending } = useSearchParamUpdater()
  const hasFilters = risks.length > 0 || classYears.length > 0 || Boolean(minDays)

  return (
    <div
      role="group"
      aria-label="Queue filters"
      aria-busy={pending}
      className="flex flex-wrap items-end gap-3 border-b border-border p-4"
    >
      <AdvisorSelect
        advisors={advisors}
        selectedAdvisor={selectedAdvisor}
        className="flex-col items-start gap-1"
      />
      <MultiFilterSelect
        label="Risk flag"
        options={RISK_OPTIONS}
        value={risks}
        onChange={(v) => update({ risk: v })}
        allLabel="All risks"
      />
      <SingleFilterSelect
        label="Min. days since contact"
        options={DAY_OPTIONS}
        value={String(minDays ?? 0)}
        onChange={(v) => update({ min_days: v === "0" ? null : v })}
      />
      <MultiFilterSelect
        label="Class year"
        options={YEAR_OPTIONS}
        value={classYears}
        onChange={(v) => update({ year: v })}
        allLabel="All years"
      />
      {hasFilters && (
        <Button variant="link" className="px-1 text-azurite" onClick={clear}>
          Clear filters
        </Button>
      )}
    </div>
  )
}
