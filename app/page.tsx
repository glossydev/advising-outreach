import { Suspense } from "react"
import { PageHeader } from "@/components/shared/page-header"
import { StatTile, StatTileGrid } from "@/components/shared/stat-tile"
import { QueueFilters } from "@/components/queue/queue-filters"
import { QueueTable } from "@/components/queue/queue-table"
import { QueueTableSkeleton } from "@/components/queue/queue-skeleton"
import { getAdvisors, getOutreachQueue, getOutreachStats } from "@/lib/data"
import { getSelectedAdvisor } from "@/lib/advisor"
import { OVERDUE_DAYS } from "@/lib/config"
import { parseQueueParams, type SearchParams } from "@/lib/search-params"

export default async function OutreachQueuePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const [params, advisor, advisors] = await Promise.all([searchParams, getSelectedAdvisor(), getAdvisors()])
  const filters = parseQueueParams(params)
  const stats = await getOutreachStats(advisor)
  const scope = advisor ?? "all advisors"

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Outreach Queue" description={`Who to reach out to today, ranked by outreach score for ${scope}.`} />

      <StatTileGrid label="Outreach summary">
        <StatTile label="Students assigned" value={stats.assigned} subtext={advisor ? `Assigned to ${advisor}` : "Across all advisors"} />
        <StatTile
          label="Overdue"
          value={stats.overdue}
          subtext={`No contact in ${OVERDUE_DAYS}+ days, or never`}
          tone={stats.overdue > 0 ? "signal" : "default"}
        />
        <StatTile
          label="High risk"
          value={stats.high_risk}
          subtext="Flagged high in the source data"
          tone={stats.high_risk > 0 ? "signal" : "default"}
        />
        <StatTile label="Contacted this week" value={stats.contacted_this_week} subtext="Contact logged in the last 7 days" />
      </StatTileGrid>

      <section aria-labelledby="queue-heading" className="rounded-lg border border-border bg-card">
        <h2 id="queue-heading" className="sr-only">
          Ranked outreach queue
        </h2>
        <QueueFilters
          advisors={advisors}
          selectedAdvisor={advisor}
          risks={filters.risks ?? []}
          classYears={filters.class_years ?? []}
          minDays={filters.min_days}
        />
        <Suspense key={JSON.stringify({ filters, advisor })} fallback={<QueueTableSkeleton />}>
          <QueueResults filters={{ ...filters, advisor }} />
        </Suspense>
      </section>
    </div>
  )
}

async function QueueResults({ filters }: { filters: Parameters<typeof getOutreachQueue>[0] & { advisor: string | null } }) {
  const students = await getOutreachQueue(filters)
  return <QueueTable students={students} selectedAdvisor={filters.advisor} />
}
