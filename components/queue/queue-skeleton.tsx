import { Skeleton } from "@/components/ui/skeleton"

export function TableSkeleton({ rows = 10, columns = 6, label }: { rows?: number; columns?: number; label: string }) {
  return (
    <div role="status" aria-label={label} className="flex flex-col">
      <div className="flex gap-4 bg-cloud px-3 py-2.5">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1 bg-navy/10" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 border-t border-border px-3 py-3">
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton key={c} className={c === 1 ? "h-7 flex-[2]" : "h-4 flex-1"} />
          ))}
        </div>
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  )
}

export function QueueTableSkeleton() {
  return <TableSkeleton label="Loading outreach queue" columns={7} />
}
