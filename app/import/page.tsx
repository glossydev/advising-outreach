import type { Metadata } from "next"
import { Info } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { ImportWizard } from "@/components/import/import-wizard"
import { getRecordCounts } from "@/lib/data"
import { prototypeToolsEnabled } from "@/lib/services/prototype"

export const metadata: Metadata = { title: "Import" }

export default async function ImportPage() {
  const counts = await getRecordCounts()
  const prototypeTools = prototypeToolsEnabled()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Import data"
        description="Bring in students or contact notes from a spreadsheet. The import flags anything it can't use as is, explains why, and suggests a fix. You decide."
      />

      {/* DECISIONS P1: say how import treats existing data, and how to start clean. */}
      <section aria-labelledby="how-import-works" className="flex gap-3 rounded-lg border border-azurite/30 bg-cloud p-4">
        <Info className="mt-0.5 size-5 shrink-0 text-azurite" aria-hidden="true" />
        <div className="flex flex-col gap-1.5 leading-relaxed">
          <h2 id="how-import-works" className="font-semibold text-navy">
            How importing works
          </h2>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-[13px]">
            <li>
              <strong>Adds and updates, never deletes.</strong> Students already in the database are matched by student ID and updated;
              new ones are added. Notes already imported are skipped.
            </li>
            <li>The file you choose is never changed, and every fix you accept is recorded on the Data Quality page.</li>
            <li>
              <strong>Want a clean import?</strong>{" "}
              {prototypeTools
                ? "Use “Reset the database to empty” in the prototype tools first"
                : "Ask whoever runs this deployment to reset the database"}
              {" "}(locally: <code className="font-mono text-[12px]">npm run db:reset</code>).
            </li>
          </ul>
          <p className="text-[13px] text-muted-foreground">
            In the database now: {counts.students} student{counts.students === 1 ? "" : "s"}, {counts.notes} note
            {counts.notes === 1 ? "" : "s"}.
          </p>
        </div>
      </section>

      <ImportWizard studentCount={counts.students} prototypeTools={prototypeTools} />
    </div>
  )
}
