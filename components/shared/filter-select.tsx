"use client"

import { useId } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

export interface FilterOption {
  value: string
  label: string
}

function FilterLabel({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <label htmlFor={id} className="text-[13px] font-medium text-muted-foreground">
      {children}
    </label>
  )
}

export function MultiFilterSelect({
  label,
  options,
  value,
  onChange,
  allLabel = "All",
  className,
}: {
  label: string
  options: FilterOption[]
  value: string[]
  onChange: (value: string[]) => void
  allLabel?: string
  className?: string
}) {
  const id = useId()
  const labelFor = (v: string) => options.find((o) => o.value === v)?.label ?? v

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <FilterLabel id={id}>{label}</FilterLabel>
      <Select multiple value={value} onValueChange={(next) => onChange((next as string[]) ?? [])}>
        <SelectTrigger id={id} className="w-full min-w-36 bg-card">
          <SelectValue>
            {(selected: string[]) =>
              !selected?.length ? (
                <span className="text-muted-foreground">{allLabel}</span>
              ) : selected.length === 1 ? (
                labelFor(selected[0])
              ) : (
                `${selected.length} selected`
              )
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function SingleFilterSelect({
  label,
  options,
  value,
  onChange,
  className,
}: {
  label: string
  options: FilterOption[]
  value: string
  onChange: (value: string) => void
  className?: string
}) {
  const id = useId()
  const items = Object.fromEntries(options.map((o) => [o.value, o.label]))

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <FilterLabel id={id}>{label}</FilterLabel>
      <Select items={items} value={value} onValueChange={(next) => next && onChange(next as string)}>
        <SelectTrigger id={id} className="w-full min-w-36 bg-card">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
