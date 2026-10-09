"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookOpen, ExternalLink, FileUp, ListOrdered, ShieldCheck, Users } from "lucide-react"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { href: "/", label: "Outreach Queue", icon: ListOrdered, match: (p: string) => p === "/" },
  { href: "/students", label: "Students", icon: Users, match: (p: string) => p.startsWith("/students") },
  { href: "/import", label: "Import", icon: FileUp, match: (p: string) => p.startsWith("/import") },
  { href: "/data-quality", label: "Data Quality", icon: ShieldCheck, match: (p: string) => p.startsWith("/data-quality") },
]

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <ul className="flex flex-col gap-0.5">
      {NAV_ITEMS.map(({ href, label, icon: Icon, match }) => {
        const active = match(pathname)
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 border-l-[3px] py-2 pr-3 pl-[17px] text-sm text-white/85 transition-colors hover:bg-arroyo/40 hover:text-white",
                active ? "border-signal bg-azurite font-medium text-white" : "border-transparent",
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              {label}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

/** Opens the help pages in a new tab, so an import or a half-written note isn't lost. */
export function HelpLink({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link
      href="/help"
      target="_blank"
      onClick={onNavigate}
      className="flex items-center gap-2.5 py-2 pr-3 pl-5 text-sm text-white/85 transition-colors hover:bg-arroyo/40 hover:text-white"
    >
      <BookOpen className="size-4 shrink-0" aria-hidden="true" />
      Help &amp; documentation
      <ExternalLink className="size-3.5 shrink-0 text-white/60" aria-hidden="true" />
      <span className="sr-only">(opens in a new tab)</span>
    </Link>
  )
}
