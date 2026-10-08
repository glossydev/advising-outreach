import { CalendarDays } from "lucide-react"
import type { StudentIndexEntry } from "@/lib/types"
import { formatDate } from "@/lib/format"
import { TODAY_ISO } from "@/lib/config"
import { AdvisorSelect } from "./advisor-select"
import { CommandPalette } from "./command-palette"
import { MobileNav } from "./mobile-nav"

export function TopBar({
  advisors,
  selectedAdvisor,
  students,
}: {
  advisors: string[]
  selectedAdvisor: string | null
  students: StudentIndexEntry[]
}) {
  return (
    <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-border bg-card px-6 py-2.5">
      <MobileNav />
      <div className="min-w-48 flex-1">
        <CommandPalette students={students} />
      </div>
      <AdvisorSelect advisors={advisors} selectedAdvisor={selectedAdvisor} />
      <p className="flex items-center gap-1.5 rounded-full border border-border bg-cloud px-2.5 py-1 text-[13px] font-medium text-navy tabular-nums">
        <CalendarDays className="size-3.5" aria-hidden="true" />
        Today: {formatDate(TODAY_ISO)}
      </p>
    </header>
  )
}
