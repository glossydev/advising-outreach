import Link from "next/link"
import { CircleCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { RULE_TITLES } from "@/lib/import/rule-titles"
import { KIND_LABELS, type CommitResult } from "./shared"

export function DoneStep({ result, fileName, onAgain }: { result: CommitResult; fileName: string; onAgain: () => void }) {
  const fixes = Object.entries(result.fixesByRule).filter(([rule]) => rule !== "id_already_imported")
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <CircleCheck className="mt-0.5 size-6 shrink-0 text-saguaro-strong" aria-hidden="true" />
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-navy">Imported {fileName}</h2>
          <p className="text-muted-foreground">
            {KIND_LABELS[result.kind]}: {result.added} added, {result.updated} updated, {result.unchanged} already up to date,{" "}
            {result.excluded} left out.
          </p>
        </div>
      </div>

      {fixes.length > 0 && (
        <section aria-labelledby="fixes-heading" className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
          <h3 id="fixes-heading" className="text-[13px] font-semibold tracking-wide text-navy uppercase">
            Recorded in the fix history
          </h3>
          <ul className="flex flex-col gap-1">
            {fixes.map(([rule, n]) => (
              <li key={rule} className="flex justify-between gap-3">
                <span>{RULE_TITLES[rule as keyof typeof RULE_TITLES]?.title ?? rule}</span>
                <span className="tabular-nums text-muted-foreground">{n}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant="signal" nativeButton={false} render={<Link href="/" />}>
          Go to the outreach queue
        </Button>
        <Button variant="outline" className="bg-card" nativeButton={false} render={<Link href="/data-quality" />}>
          See the Data Quality report
        </Button>
        <Button variant="outline" className="bg-card" onClick={onAgain}>
          Import another file
        </Button>
      </div>
    </div>
  )
}
