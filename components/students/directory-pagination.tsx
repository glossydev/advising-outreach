import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import type { SearchParams } from "@/lib/search-params"
import { cn } from "@/lib/utils"

function hrefFor(params: SearchParams, page: number) {
  const next = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (k === "page" || v === undefined) continue
    next.set(k, Array.isArray(v) ? v[0] : v)
  }
  if (page > 1) next.set("page", String(page))
  const qs = next.toString()
  return qs ? `/students?${qs}` : "/students"
}

function PageLink({
  disabled,
  href,
  label,
  children,
}: {
  disabled: boolean
  href: string
  label: string
  children: React.ReactNode
}) {
  const className = cn(buttonVariants({ variant: "outline", size: "sm" }), "bg-card")
  if (disabled)
    return (
      <span aria-disabled="true" className={cn(className, "pointer-events-none opacity-50")}>
        {children}
      </span>
    )
  return (
    <Link href={href} aria-label={label} className={className} scroll={false}>
      {children}
    </Link>
  )
}

export function DirectoryPagination({
  params,
  page,
  pageCount,
  shown,
  total,
  overall,
  rangeStart,
}: {
  params: SearchParams
  page: number
  pageCount: number
  shown: number
  total: number
  overall: number
  rangeStart: number
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-[13px]">
      <p className="text-muted-foreground" aria-live="polite">
        <span className="font-medium tabular-nums text-foreground">{total}</span> of{" "}
        <span className="tabular-nums">{overall}</span> students
        {total > shown && (
          <span className="tabular-nums">
            {" "}
            · showing {rangeStart}–{rangeStart + shown - 1}
          </span>
        )}
      </p>
      {pageCount > 1 && (
        <nav aria-label="Pagination" className="flex items-center gap-2">
          <PageLink disabled={page <= 1} href={hrefFor(params, page - 1)} label="Previous page">
            <ChevronLeft aria-hidden="true" />
            Previous
          </PageLink>
          <span className="tabular-nums text-muted-foreground">
            Page {page} of {pageCount}
          </span>
          <PageLink disabled={page >= pageCount} href={hrefFor(params, page + 1)} label="Next page">
            Next
            <ChevronRight aria-hidden="true" />
          </PageLink>
        </nav>
      )}
    </div>
  )
}
