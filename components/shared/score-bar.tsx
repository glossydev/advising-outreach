import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export function ScoreBar({ score, className }: { score: number; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-1.5 w-12 overflow-hidden rounded-full bg-cloud" aria-hidden="true">
        <div className="h-full rounded-full bg-azurite" style={{ width: `${Math.min(100, Math.max(0, score))}%` }} />
      </div>
      <span className="w-7 text-right font-medium tabular-nums text-navy">
        {score}
        <span className="sr-only"> out of 100</span>
      </span>
    </div>
  )
}

export function ReasonChips({ reasons, max = 3 }: { reasons: string[]; max?: number }) {
  if (reasons.length === 0) return <span className="text-[13px] text-muted-foreground">No flags</span>
  const shown = reasons.slice(0, max)
  const hidden = reasons.slice(max)
  return (
    <ul className="flex flex-wrap gap-1">
      {shown.map((r) => (
        <li
          key={r}
          className="rounded-md border border-border bg-card px-1.5 py-0.5 text-[12px] text-foreground"
        >
          {r}
        </li>
      ))}
      {hidden.length > 0 && (
        <li>
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  onClick={(e) => e.stopPropagation()}
                  className="rounded-md border border-border bg-cloud px-1.5 py-0.5 text-[12px] font-medium text-navy"
                />
              }
            >
              +{hidden.length}
              <span className="sr-only"> more: {hidden.join(", ")}</span>
            </TooltipTrigger>
            <TooltipContent>
              <ul className="flex flex-col gap-0.5">
                {hidden.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </TooltipContent>
          </Tooltip>
        </li>
      )}
    </ul>
  )
}
