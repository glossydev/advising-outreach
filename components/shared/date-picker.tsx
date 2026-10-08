"use client"

import { useState } from "react"
import { CalendarDays, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"

function isoToLocalDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d)
}

function localDateToIso(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function DatePicker({
  id,
  value,
  onChange,
  maxDate,
  minDate,
  placeholder = "Pick a date",
  clearable = false,
  invalid,
  describedBy,
}: {
  id: string
  value: string | null
  onChange: (value: string | null) => void
  maxDate?: string
  minDate?: string
  placeholder?: string
  clearable?: boolean
  invalid?: boolean
  describedBy?: string
}) {
  const [open, setOpen] = useState(false)
  const selected = value ? isoToLocalDate(value) : undefined
  const disabled = [
    ...(maxDate ? [{ after: isoToLocalDate(maxDate) }] : []),
    ...(minDate ? [{ before: isoToLocalDate(minDate) }] : []),
  ]

  return (
    <div className="flex items-center gap-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              id={id}
              variant="outline"
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
              className={cn("flex-1 justify-start bg-card font-normal tabular-nums", !value && "text-muted-foreground")}
            />
          }
        >
          <CalendarDays aria-hidden="true" />
          {value ? formatDate(value) : placeholder}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={selected ?? (maxDate ? isoToLocalDate(maxDate) : undefined)}
            disabled={disabled}
            onSelect={(date) => {
              onChange(date ? localDateToIso(date) : null)
              setOpen(false)
            }}
          />
        </PopoverContent>
      </Popover>
      {clearable && value && (
        <Button type="button" variant="ghost" size="icon" aria-label="Clear date" onClick={() => onChange(null)}>
          <X aria-hidden="true" />
        </Button>
      )}
    </div>
  )
}
