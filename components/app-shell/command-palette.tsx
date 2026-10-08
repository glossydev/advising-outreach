"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Search, UserRound } from "lucide-react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import type { StudentIndexEntry } from "@/lib/types"

export function CommandPalette({ students }: { students: StudentIndexEntry[] }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search students by name, ID, or email"
        aria-keyshortcuts="Control+K"
        className="flex h-8 w-full max-w-md items-center gap-2 rounded-md border border-input bg-card px-2.5 text-left text-[13px] text-muted-foreground transition-colors hover:border-arroyo"
      >
        <Search className="size-4 shrink-0" aria-hidden="true" />
        <span className="flex-1 truncate">Search students by name, ID, or email</span>
        <kbd className="hidden rounded border border-border bg-muted px-1.5 font-mono text-[11px] text-muted-foreground sm:inline">
          Ctrl K
        </kbd>
      </button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search students"
        description="Search students by name, ID, or email"
        className="shadow-xl sm:max-w-lg"
      >
        <CommandInput placeholder="Name, student ID, or email…" />
        <CommandList>
          <CommandEmpty>No matching students.</CommandEmpty>
          <CommandGroup heading="Students">
            {students.map((s) => (
              <CommandItem
                key={s.student_id}
                value={`${s.name} ${s.student_id} ${s.email}`}
                onSelect={() => {
                  setOpen(false)
                  router.push(`/students/${s.student_id}`)
                }}
              >
                <UserRound className="text-muted-foreground" aria-hidden="true" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">{s.name}</span>
                  <span className="truncate text-[12px] text-muted-foreground">
                    {s.student_id} · {s.email}
                  </span>
                </span>
                <span className="hidden text-[12px] text-muted-foreground sm:inline">{s.advisor}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
