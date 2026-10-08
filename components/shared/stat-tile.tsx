import { cn } from "@/lib/utils"

export function StatTile({
  label,
  value,
  subtext,
  tone = "default",
}: {
  label: string
  value: number
  subtext: string
  tone?: "default" | "signal" | "brick" | "azurite"
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-4">
      <dt className="text-[13px] font-medium text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "text-3xl leading-none font-semibold tabular-nums",
          tone === "signal" && "text-signal",
          tone === "brick" && "text-brick",
          tone === "azurite" && "text-azurite",
          tone === "default" && "text-navy",
        )}
      >
        {value}
      </dd>
      <dd className="text-[13px] text-muted-foreground">{subtext}</dd>
    </div>
  )
}

export function StatTileGrid({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <dl aria-label={label} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {children}
    </dl>
  )
}
