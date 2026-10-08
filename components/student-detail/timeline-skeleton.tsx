import { Skeleton } from "@/components/ui/skeleton"

export function TimelineSkeleton() {
  return (
    <div role="status" aria-label="Loading contact timeline" className="flex flex-col gap-5">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="size-7 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  )
}
