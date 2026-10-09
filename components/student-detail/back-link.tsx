"use client"

import { useSyncExternalStore } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { LAST_LIST_KEY, readRememberedList } from "@/components/shared/remember-list-view"

const noSubscription = () => () => {}

function readStorage(): string | null {
  try {
    return window.sessionStorage.getItem(LAST_LIST_KEY)
  } catch {
    return null
  }
}

/**
 * Returns to the list this tab came from (the queue or the directory), with its filters, sort and
 * page. Falls back to the directory on a direct visit.
 */
export function BackLink() {
  const list = readRememberedList(useSyncExternalStore(noSubscription, readStorage, () => null))
  return (
    <Link
      href={list?.href ?? "/students"}
      className="inline-flex items-center gap-1 self-start rounded text-[13px] font-medium text-azurite hover:underline"
    >
      <ArrowLeft className="size-3.5" aria-hidden="true" />
      Back to {list?.label ?? "Students"}
    </Link>
  )
}
