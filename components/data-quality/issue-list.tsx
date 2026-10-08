"use client"

import Link from "next/link"
import { CircleCheck } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { EmptyState } from "@/components/shared/page-header"
import type { Severity } from "@/lib/import/types"
import type { RuleSummary } from "@/lib/types"
import { cn } from "@/lib/utils"

const SEVERITY_STYLES: Record<Severity, string> = {
  error: "border-signal bg-signal text-signal-foreground",
  warning: "border-brick/40 bg-caliche text-brick",
  info: "border-azurite/40 bg-rain/20 text-azurite",
}

const SEVERITY_LABELS: Record<Severity, string> = { error: "Blocking", warning: "Warning", info: "Info" }

const RESOLUTION_LABELS: Record<string, string> = {
  accepted_suggestion: "suggested fix accepted",
  edited: "corrected by hand",
  kept_as_is: "kept as it was",
  excluded_row: "row left out",
  info: "noted",
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[12px] font-medium", SEVERITY_STYLES[severity])}>
      {SEVERITY_LABELS[severity]}
    </span>
  )
}

function RecordLink({ id, studentIds }: { id: string; studentIds: Set<string> }) {
  return studentIds.has(id) ? (
    <Link
      href={`/students/${id}`}
      className="inline-flex rounded border border-azurite/30 bg-cloud px-1.5 py-0.5 font-mono text-[12px] text-azurite no-underline! hover:bg-rain/30"
    >
      {id}
    </Link>
  ) : (
    <span className="inline-flex rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[12px] text-muted-foreground">{id}</span>
  )
}

export function IssueList({ rules, studentIds }: { rules: RuleSummary[]; studentIds: string[] }) {
  const known = new Set(studentIds)
  if (rules.length === 0) {
    return <EmptyState icon={CircleCheck} title="Nothing flagged" description="The imports so far found no problems in the data." />
  }

  return (
    <Accordion multiple className="px-4">
      {rules.map((r) => (
        <AccordionItem key={r.rule} value={r.rule} className="border-border">
          <AccordionTrigger className="items-center gap-3 py-3 hover:no-underline">
            <span className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-medium text-navy">{r.title}</span>
              <SeverityBadge severity={r.severity} />
              <span className="text-[13px] font-normal text-muted-foreground tabular-nums">
                {r.count} {r.count === 1 ? "record" : "records"}
              </span>
              {r.decision && (
                <code className="font-mono text-[12px] font-normal text-muted-foreground">
                  {r.decision} · {r.rule}
                </code>
              )}
            </span>
          </AccordionTrigger>
          <AccordionContent className="flex flex-col gap-3 pb-4 [&_p:not(:last-child)]:mb-0">
            <p className="text-[13px] text-muted-foreground">
              {Object.entries(r.resolutions)
                .map(([resolution, n]) => `${n} ${RESOLUTION_LABELS[resolution] ?? resolution}`)
                .join(" · ")}
            </p>
            <ul className="flex flex-col gap-2">
              {r.examples.map((e, i) => (
                <li key={i} className="flex flex-col gap-1 rounded-md border border-border bg-muted/40 p-3">
                  <p className="leading-relaxed text-foreground">
                    {e.record_id && <span className="mr-2 font-mono text-[12px] text-muted-foreground">{e.record_id}</span>}
                    {e.message}
                  </p>
                  {e.original_value !== null && e.final_value !== null && e.original_value !== e.final_value && (
                    <p className="text-[13px] break-words text-muted-foreground">
                      <span className="font-mono">{JSON.stringify(e.original_value)}</span> →{" "}
                      <span className="font-mono">{JSON.stringify(e.final_value)}</span>
                    </p>
                  )}
                </li>
              ))}
            </ul>
            {r.records.length > 0 && (
              <div className="flex flex-col gap-1">
                <span className="text-[13px] text-muted-foreground">Records ({r.records.length})</span>
                <ul className="flex flex-wrap gap-1.5">
                  {r.records.map((id) => (
                    <li key={id}>
                      <RecordLink id={id} studentIds={known} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
