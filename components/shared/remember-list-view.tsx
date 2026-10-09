"use client"

import { useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"

export const LAST_LIST_KEY = "advising-outreach.last-list"

export interface RememberedList {
  href: string
  label: string
}

/**
 * Records the list page this tab was last on, filters, sort and page included, so "Back to" on a
 * student's page returns to exactly that view. Client-side navigation doesn't update
 * document.referrer, so the browser can't be asked instead.
 */
export function RememberListView({ label }: { label: string }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  useEffect(() => {
    const query = searchParams.toString()
    try {
      window.sessionStorage.setItem(LAST_LIST_KEY, JSON.stringify({ href: query ? `${pathname}?${query}` : pathname, label }))
    } catch {
      // storage blocked: the back link falls back to the Students page
    }
  }, [pathname, searchParams, label])
  return null
}

export function readRememberedList(raw: string | null): RememberedList | null {
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as Partial<RememberedList>
    // Only paths inside this app, never a full URL.
    if (typeof value.href !== "string" || !value.href.startsWith("/") || value.href.startsWith("//")) return null
    return { href: value.href, label: typeof value.label === "string" ? value.label : "list" }
  } catch {
    return null
  }
}
