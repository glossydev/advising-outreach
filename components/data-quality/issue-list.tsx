"use client"

import Link from "next/link"
import { CircleCheck } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { EmptyState } from "@/components/shared/page-header"
import type { DataQualityIssue, IssueSeverity } from "@/lib/types"
import { cn } from "@/lib/utils"

const SEVERITY_ORDER: Record<IssueSeverity, number> = { error: 0, warning: 1, info: 2 }

const SEVERITY_STYLES: Record<IssueSeverity, string> = {
  error: "border-signal bg-signal text-signal-foreground",
  warning: "border-brick/40 bg-caliche text-brick",
  info: "border-azurite/40 bg-rain/20 text-azurite",
}

export function SeverityBadge({ severity }: { severity: IssueSeverity }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[12px] font-medium capitalize",
        SEVERITY_STYLES[severity],
      )}
    >
      {severity}
    </span>
  )
}

interface RuleGroup {
  rule: string
  severity: IssueSeverity
  issues: DataQualityIssue[]
  affected: number
}

function groupByRule(issues: DataQualityIssue[]): RuleGroup[] {
  const groups = new Map<string, RuleGroup>()
  for (const issue of issues) {
    const g = groups.get(issue.rule) ?? { rule: issue.rule, severity: issue.severity, issues: [], affected: 0 }
    g.issues.push(issue)
    g.affected += issue.affected_ids.length
    if (SEVERITY_ORDER[issue.severity] < SEVERITY_ORDER[g.severity]) g.severity = issue.severity
    groups.set(issue.rule, g)
  }
  return [...groups.values()].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || b.affected - a.affected,
  )
}

function AffectedIds({ ids, studentIds }: { ids: string[]; studentIds: Set<string> }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {ids.map((id) => (
        <li key={id}>
          {studentIds.has(id) ? (
            <Link
              href={`/students/${id}`}
              className="inline-flex rounded border border-azurite/30 bg-cloud px-1.5 py-0.5 font-mono text-[12px] text-azurite no-underline! hover:bg-rain/30"
            >
              {id}
            </Link>
          ) : (
            <span className="inline-flex rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[12px] text-muted-foreground">
              {id}
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}

export function IssueList({ issues, studentIds }: { issues: DataQualityIssue[]; studentIds: string[] }) {
  const groups = groupByRule(issues)
  const known = new Set(studentIds)

  if (groups.length === 0) {
    return <EmptyState icon={CircleCheck} title="No data quality issues" description="The last import was clean." />
  }

  return (
    <Accordion multiple className="px-4">
      {groups.map((g) => (
        <AccordionItem key={g.rule} value={g.rule} className="border-border">
          <AccordionTrigger className="items-center gap-3 py-3 hover:no-underline">
            <span className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-1">
              <code className="font-mono text-[13px] font-semibold text-navy">{g.rule}</code>
              <SeverityBadge severity={g.severity} />
              <span className="text-[13px] font-normal text-muted-foreground tabular-nums">
                {g.affected} affected
              </span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="flex flex-col gap-4 pb-4 [&_p:not(:last-child)]:mb-0">
            {g.issues.map((issue, i) => (
              <div key={i} className="flex flex-col gap-2 rounded-md border border-border bg-muted/40 p-3">
                <p className="leading-relaxed text-foreground">{issue.description}</p>
                <p className="leading-relaxed">
                  <span className="font-medium text-navy">Resolution: </span>
                  {issue.resolution}
                </p>
                <div className="flex flex-col gap-1">
                  <span className="text-[13px] text-muted-foreground">
                    Affected IDs ({issue.affected_ids.length})
                  </span>
                  <AffectedIds ids={issue.affected_ids} studentIds={known} />
                </div>
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
