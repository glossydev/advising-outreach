"use client"

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import type { SortDirection } from "@/lib/types"
import { cn } from "@/lib/utils"

const word = (dir: SortDirection) => (dir === "asc" ? "ascending" : "descending")

/** A sortable column heading: a button that says how the column is sorted and what a click will do. */
export function SortHeader({
  label,
  active,
  dir,
  nextDir,
  onSort,
  numeric = false,
  className,
}: {
  label: string
  active: boolean
  dir: SortDirection
  /** The direction a click sorts in. */
  nextDir: SortDirection
  onSort: () => void
  numeric?: boolean
  className?: string
}) {
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown
  return (
    <th
      scope="col"
      aria-sort={active ? word(dir) : "none"}
      className={cn("px-2.5 py-1.5 font-semibold whitespace-nowrap", numeric && "text-right", className)}
    >
      <button
        type="button"
        onClick={onSort}
        aria-label={`${label}${active ? `, sorted ${word(dir)}` : ""}. Sort ${word(nextDir)}.`}
        className={cn("-mx-1.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-navy/5", numeric && "flex-row-reverse")}
      >
        {label}
        <Icon className={cn("size-3.5", active ? "text-navy" : "text-muted-foreground")} aria-hidden="true" />
      </button>
    </th>
  )
}
