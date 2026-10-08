"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useTransition } from "react"

/** Merges updates into the current URL search params. Empty values remove the key. */
export function useSearchParamUpdater() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  const update = useCallback(
    (updates: Record<string, string | string[] | null | undefined>, { resetPage = true } = {}) => {
      const next = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        const serialized = Array.isArray(value) ? value.join(",") : value
        if (serialized) next.set(key, serialized)
        else next.delete(key)
      }
      if (resetPage && !("page" in updates)) next.delete("page")
      const qs = next.toString()
      startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }))
    },
    [pathname, router, searchParams],
  )

  const clear = useCallback(() => {
    startTransition(() => router.replace(pathname, { scroll: false }))
  }, [pathname, router])

  return { update, clear, pending, searchParams }
}
