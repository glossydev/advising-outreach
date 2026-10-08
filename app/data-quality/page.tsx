import type { Metadata } from "next"
import { PageHeader } from "@/components/shared/page-header"
import { StatTile, StatTileGrid } from "@/components/shared/stat-tile"
import { ImportCard } from "@/components/data-quality/import-card"
import { IssueList } from "@/components/data-quality/issue-list"
import { getDataQualityReport, getStudentIndex } from "@/lib/data"
import { formatDate } from "@/lib/format"
import type { IssueSeverity } from "@/lib/types"

export const metadata: Metadata = { title: "Data Quality" }

export default async function DataQualityPage() {
  const [{ summary, issues }, index] = await Promise.all([getDataQualityReport(), getStudentIndex()])

  const counts: Record<IssueSeverity, { issues: number; records: number }> = {
    error: { issues: 0, records: 0 },
    warning: { issues: 0, records: 0 },
    info: { issues: 0, records: 0 },
  }
  for (const issue of issues) {
    counts[issue.severity].issues += 1
    counts[issue.severity].records += issue.affected_ids.length
  }

  const source = summary.source === "seed" ? "sample data" : "uploaded files"
  const summaryLine = `Last import (${source}, ${formatDate(summary.imported_at.slice(0, 10))}): ${summary.student_count} students, ${summary.note_count} notes, ${summary.issue_count} issues`

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Data Quality"
        description="What the source spreadsheets looked like and what the import decided about each problem."
      />
      <ImportCard summaryLine={summaryLine} />

      <StatTileGrid label="Issues by severity">
        <StatTile
          label="Errors"
          value={counts.error.issues}
          subtext={`${counts.error.records} affected records`}
          tone={counts.error.issues > 0 ? "signal" : "default"}
        />
        <StatTile label="Warnings" value={counts.warning.issues} subtext={`${counts.warning.records} affected records`} tone="brick" />
        <StatTile label="Info" value={counts.info.issues} subtext={`${counts.info.records} affected records`} tone="azurite" />
      </StatTileGrid>

      <section aria-labelledby="issues-heading" className="rounded-lg border border-border bg-card">
        <h2 id="issues-heading" className="border-b border-border px-4 py-3 font-semibold text-navy">
          Issues by rule
        </h2>
        <IssueList issues={issues} studentIds={index.map((s) => s.student_id)} />
      </section>
    </div>
  )
}
