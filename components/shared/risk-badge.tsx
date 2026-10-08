import { CircleAlert, CircleCheck, CircleHelp, TriangleAlert } from "lucide-react"
import type { RiskFlag } from "@/lib/types"
import { cn } from "@/lib/utils"

export const RISK_LABELS: Record<RiskFlag, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
  unknown: "Unknown",
}

const RISK_STYLES: Record<RiskFlag, { icon: typeof TriangleAlert; className: string }> = {
  high: { icon: TriangleAlert, className: "border-signal bg-signal text-signal-foreground" },
  medium: { icon: CircleAlert, className: "border-brick bg-card text-brick" },
  low: { icon: CircleCheck, className: "border-saguaro bg-card text-saguaro-strong" },
  unknown: { icon: CircleHelp, className: "border-input bg-card text-muted-foreground" },
}

export function RiskBadge({ risk, className }: { risk: RiskFlag; className?: string }) {
  const { icon: Icon, className: tone } = RISK_STYLES[risk]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[12px] font-medium whitespace-nowrap",
        tone,
        className,
      )}
    >
      <Icon className="size-3" aria-hidden="true" />
      {RISK_LABELS[risk]}
      {risk !== "unknown" && <span className="sr-only"> risk</span>}
    </span>
  )
}
