"use client"

import { useId } from "react"
import { ArrowDown, ArrowUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { SortDirection } from "@/lib/types"

/**
 * Sorting for card layouts, where there are no column headings to click: a "Sort by" choice and a
 * button to reverse the order. Choosing a new column passes no direction, so the caller can use
 * that column's natural one.
 */
export function SortSelect<K extends string>({
  options,
  sort,
  dir,
  onSort,
}: {
  options: readonly { key: K; label: string }[]
  sort: K
  dir: SortDirection
  onSort: (key: K, dir?: SortDirection) => void
}) {
  const id = useId()
  const items = Object.fromEntries(options.map((o) => [o.key, o.label]))
  const Icon = dir === "asc" ? ArrowUp : ArrowDown
  return (
    <div className="flex items-end gap-2">
      <div className="flex flex-col gap-1">
        <label htmlFor={id} className="text-[13px] font-medium text-muted-foreground">
          Sort by
        </label>
        <Select items={items} value={sort} onValueChange={(v) => v && v !== sort && onSort(v as K)}>
          <SelectTrigger id={id} className="min-w-40 bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.key} value={o.key}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button
        variant="outline"
        size="icon"
        className="bg-card"
        aria-label={`${dir === "asc" ? "Ascending" : "Descending"}. Reverse the order.`}
        onClick={() => onSort(sort, dir === "asc" ? "desc" : "asc")}
      >
        <Icon aria-hidden="true" />
      </Button>
    </div>
  )
}
