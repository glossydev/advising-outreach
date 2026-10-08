import type { Metadata } from "next"
import { PageHeader } from "@/components/shared/page-header"
import { StatTile, StatTileGrid } from "@/components/shared/stat-tile"
import { IssueList } from "@/components/data-quality/issue-list"
import { getDataQualityReport, getStudentIndex } from "@/lib/data"
import type { ImportSummaryRow } from "@/lib/types"

export const metadata: Metadata = { title: "Data Quality" }

const SOURCE_LABELS: Record<ImportSummaryRow["source_kind"], string> = {
  seed: "Sample data, loaded at setup",
  sample: "Sample file",
  upload: "Uploaded file",
}

const timestamp = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" })

export default async function DataQualityPage() {
  const [report, index] = await Promise.all([getDataQualityReport(), getStudentIndex()])
  const { totals } = report

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Data Quality"
        description="Every import, what the import rules found in the files, and what was done about each problem. The source files are never changed."
      />

      <StatTileGrid label="Import results">
        <StatTile label="Suggested fixes accepted" value={totals.fixes_accepted} subtext="Converted dates, removed SSNs, and more" />
        <StatTile label="Kept as they were" value={totals.kept_as_is} subtext="Warnings reviewed and left alone" />
        <StatTile label="Rows left out" value={totals.rows_excluded} subtext="Excluded from an import" tone={totals.rows_excluded ? "brick" : "default"} />
        <StatTile label="Noted" value={totals.info} subtext="Information only, nothing to fix" tone="azurite" />
      </StatTileGrid>

      <section aria-labelledby="imports-heading" className="rounded-lg border border-border bg-card">
        <h2 id="imports-heading" className="border-b border-border px-4 py-3 font-semibold text-navy">
          Import history
        </h2>
        {report.imports.length === 0 ? (
          <p className="px-4 py-6 text-muted-foreground">No imports yet. The database is empty.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <caption className="sr-only">Imports, newest first</caption>
              <thead className="bg-cloud text-left text-[13px] text-navy">
                <tr>
                  <th scope="col" className="px-4 py-2 font-semibold">When</th>
                  <th scope="col" className="px-4 py-2 font-semibold">File</th>
                  <th scope="col" className="px-4 py-2 font-semibold">Source</th>
                  <th scope="col" className="px-4 py-2 text-right font-semibold">Added</th>
                  <th scope="col" className="px-4 py-2 text-right font-semibold">Updated</th>
                  <th scope="col" className="px-4 py-2 text-right font-semibold">Unchanged</th>
                  <th scope="col" className="px-4 py-2 text-right font-semibold">Left out</th>
                </tr>
              </thead>
              <tbody>
                {report.imports.map((i) => (
                  <tr key={i.import_id} className="border-t border-border">
                    <td className="px-4 py-2 whitespace-nowrap tabular-nums">{timestamp.format(new Date(i.created_at))}</td>
                    <td className="px-4 py-2">
                      <span className="font-mono text-[13px]">{i.source_name}</span>
                      <span className="text-muted-foreground"> · {i.kind === "students" ? "Students" : "Contact notes"}</span>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{SOURCE_LABELS[i.source_kind] ?? i.source_kind}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{i.rows_added}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{i.rows_updated}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{i.rows_unchanged}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{i.rows_excluded}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="issues-heading" className="rounded-lg border border-border bg-card">
        <h2 id="issues-heading" className="border-b border-border px-4 py-3 font-semibold text-navy">
          What the import rules found
        </h2>
        <IssueList rules={report.rules} studentIds={index.map((s) => s.student_id)} />
      </section>
    </div>
  )
}
