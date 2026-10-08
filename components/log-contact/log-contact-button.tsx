"use client"

import { useRef, useState } from "react"
import { MessageSquarePlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LogContactSheet } from "./log-contact-sheet"
import type { LogContactStudent } from "./log-contact-form"

export function LogContactButton({
  student,
  selectedAdvisor,
  variant = "signal",
}: {
  student: LogContactStudent
  selectedAdvisor: string | null
  variant?: "signal" | "outline"
}) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  return (
    <>
      <Button
        ref={triggerRef}
        variant={variant}
        className={variant === "outline" ? "bg-card" : undefined}
        onClick={() => setOpen(true)}
      >
        <MessageSquarePlus aria-hidden="true" />
        Log contact
      </Button>
      <LogContactSheet
        student={student}
        open={open}
        onOpenChange={setOpen}
        selectedAdvisor={selectedAdvisor}
        finalFocus={triggerRef}
      />
    </>
  )
}
