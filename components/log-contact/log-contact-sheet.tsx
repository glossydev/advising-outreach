"use client"

import { useRef, useState } from "react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { fullName } from "@/lib/format"
import { LogContactForm, type LogContactStudent } from "./log-contact-form"

export function LogContactSheet({
  student,
  open,
  onOpenChange,
  selectedAdvisor,
  finalFocus,
}: {
  student: LogContactStudent | null
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedAdvisor: string | null
  finalFocus?: React.RefObject<HTMLElement | null>
}) {
  const dirtyRef = useRef(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  function requestClose() {
    if (dirtyRef.current) setConfirmOpen(true)
    else onOpenChange(false)
  }

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (next) onOpenChange(true)
          else requestClose()
        }}
      >
        <SheetContent
          side="right"
          finalFocus={finalFocus}
          // The sheet's own widths are set under data-[side=right]:, so overrides must be too: full width on phones.
          className="gap-0 shadow-xl data-[side=right]:w-full data-[side=right]:sm:max-w-md"
        >
          {student && (
            <>
              <SheetHeader className="border-b border-border">
                <SheetTitle className="text-lg font-semibold text-navy">Log contact</SheetTitle>
                <SheetDescription>
                  {fullName(student)} · <span className="font-mono">{student.student_id}</span>
                </SheetDescription>
              </SheetHeader>
              <LogContactForm
                key={student.student_id}
                student={student}
                advisor={selectedAdvisor ?? student.advisor}
                advisorIsAssigned={!selectedAdvisor}
                onDirtyChange={(dirty) => {
                  dirtyRef.current = dirty
                }}
                onCancel={requestClose}
                onSaved={() => {
                  dirtyRef.current = false
                  onOpenChange(false)
                }}
              />
            </>
          )}
        </SheetContent>
      </Sheet>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard this contact?</AlertDialogTitle>
            <AlertDialogDescription>The note you started will not be saved.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              className="bg-signal text-signal-foreground hover:bg-signal/90"
              onClick={() => {
                dirtyRef.current = false
                setConfirmOpen(false)
                onOpenChange(false)
              }}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
