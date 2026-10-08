"use client"

import { useEffect, useId, useState } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { MultiFilterSelect, SingleFilterSelect } from "@/components/shared/filter-select"
import { RISK_LABELS } from "@/components/shared/risk-badge"
import { useSearchParamUpdater } from "@/hooks/use-search-param-updater"
import { ALL_ADVISORS } from "@/lib/config"
import { CLASS_YEARS, RISK_FLAGS } from "@/lib/search-params"
import type { LastContactFilter } from "@/lib/types"

const RISK_OPTIONS = RISK_FLAGS.map((r) => ({ value: r, label: RISK_LABELS[r] }))
const YEAR_OPTIONS = CLASS_YEARS.map((y) => ({ value: y, label: y }))
const LAST_CONTACT_OPTIONS: { value: LastContactFilter; label: string }[] = [
  { value: "any", label: "Any" },
  { value: "30", label: "30+ days" },
  { value: "60", label: "60+ days" },
  { value: "90", label: "90+ days" },
  { value: "never", label: "Never" },
]

export function DirectoryToolbar({
  advisors,
  majors,
  advisor,
  q,
  major,
  classYears,
  risks,
  lastContact,
  hasFilters,
}: {
  advisors: string[]
  majors: string[]
  advisor: string
  q: string
  major?: string
  classYears: string[]
  risks: string[]
  lastContact: LastContactFilter
  hasFilters: boolean
}) {
  const { update, clear, pending } = useSearchParamUpdater()
  const searchId = useId()
  const [query, setQuery] = useState(q)

  useEffect(() => {
    if (query === q) return
    const timer = setTimeout(() => update({ q: query.trim() }), 250)
    return () => clearTimeout(timer)
  }, [query, q, update])

  return (
    <div
      role="search"
      aria-label="Filter students"
      aria-busy={pending}
      className="flex flex-wrap items-end gap-3 border-b border-border p-4"
    >
      <div className="flex min-w-60 flex-1 flex-col gap-1">
        <label htmlFor={searchId} className="text-[13px] font-medium text-muted-foreground">
          Search
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, ID, or email"
            className="bg-card pl-8"
          />
        </div>
      </div>
      <SingleFilterSelect
        label="Advisor"
        options={[{ value: ALL_ADVISORS, label: "All advisors" }, ...advisors.map((a) => ({ value: a, label: a }))]}
        value={advisor}
        onChange={(v) => update({ advisor: v })}
      />
      <SingleFilterSelect
        label="Major"
        options={[{ value: "", label: "All majors" }, ...majors.map((m) => ({ value: m, label: m }))]}
        value={major ?? ""}
        onChange={(v) => update({ major: v })}
      />
      <MultiFilterSelect
        label="Class year"
        options={YEAR_OPTIONS}
        value={classYears}
        onChange={(v) => update({ year: v })}
        allLabel="All years"
      />
      <MultiFilterSelect
        label="Risk flag"
        options={RISK_OPTIONS}
        value={risks}
        onChange={(v) => update({ risk: v })}
        allLabel="All risks"
      />
      <SingleFilterSelect
        label="Last contact"
        options={LAST_CONTACT_OPTIONS}
        value={lastContact}
        onChange={(v) => update({ last_contact: v === "any" ? null : v })}
      />
      {hasFilters && (
        <Button
          variant="link"
          className="px-1 text-azurite"
          onClick={() => {
            setQuery("")
            clear()
          }}
        >
          Clear filters
        </Button>
      )}
    </div>
  )
}
