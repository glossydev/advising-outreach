"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

/** Returns to the list the advisor came from, falling back to the directory on a direct visit. */
export function BackLink() {
  const router = useRouter()
  return (
    <Link
      href="/students"
      onClick={(e) => {
        const cameFromApp = document.referrer && new URL(document.referrer).origin === window.location.origin
        if (cameFromApp && window.history.length > 1) {
          e.preventDefault()
          router.back()
        }
      }}
      className="inline-flex items-center gap-1 self-start rounded text-[13px] font-medium text-azurite hover:underline"
    >
      <ArrowLeft className="size-3.5" aria-hidden="true" />
      Back to list
    </Link>
  )
}
