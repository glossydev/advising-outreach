"use client"

import { useId, useOptimistic, useTransition } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { setAdvisorAction } from "@/app/actions"
import { ALL_ADVISORS } from "@/lib/config"
import { cn } from "@/lib/utils"

export function AdvisorSelect({
  advisors,
  selectedAdvisor,
  label = "Advisor",
  hideLabel = false,
  className,
}: {
  advisors: string[]
  selectedAdvisor: string | null
  label?: string
  hideLabel?: boolean
  className?: string
}) {
  const id = useId()
  const [pending, startTransition] = useTransition()
  const [value, setOptimistic] = useOptimistic(selectedAdvisor ?? ALL_ADVISORS)
  const items = { [ALL_ADVISORS]: "All advisors", ...Object.fromEntries(advisors.map((a) => [a, a])) }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <label htmlFor={id} className={cn("text-[13px] font-medium text-muted-foreground", hideLabel && "sr-only")}>
        {label}
      </label>
      <Select
        items={items}
        value={value}
        onValueChange={(next) => {
          if (!next) return
          startTransition(async () => {
            setOptimistic(next)
            await setAdvisorAction(next)
          })
        }}
      >
        <SelectTrigger id={id} className="min-w-44 bg-card" aria-busy={pending}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_ADVISORS}>All advisors</SelectItem>
          {advisors.map((advisor) => (
            <SelectItem key={advisor} value={advisor}>
              {advisor}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
