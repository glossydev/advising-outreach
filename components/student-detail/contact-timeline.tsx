"use client"

import { useState } from "react"
import { Check, ChevronDown, Lock, Mail, Phone, Users, Video } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ContactNote, ContactType } from "@/lib/types"
import { formatDate, isBeforeToday } from "@/lib/format"
import { cn } from "@/lib/utils"

const TYPE_ICONS: Record<ContactType, React.ComponentType<{ className?: string }>> = {
  Phone: Phone,
  Email: Mail,
  "In person": Users,
  Zoom: Video,
}

const VISIBLE_COUNT = 3

function FollowUpChip({ date, doneBy }: { date: string; doneBy: string | null }) {
  const overdue = isBeforeToday(date)
  if (doneBy) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-1.5 py-0.5 text-[12px] font-medium text-muted-foreground">
        <Check className="size-3.5" aria-hidden="true" />
        Follow-up for {formatDate(date)} done in {doneBy}
      </span>
    )
  }
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[12px] font-medium",
        overdue ? "border-signal bg-signal text-signal-foreground" : "border-azurite/40 bg-rain/20 text-azurite",
      )}
    >
      {overdue ? "Overdue: follow up by " : "Follow up by "}
      {formatDate(date)}
    </span>
  )
}

/** D18: a sensitive note stays collapsed until someone chooses to read it. Its follow-up date still shows. */
function NoteBody({ note }: { note: ContactNote }) {
  const [revealed, setRevealed] = useState(false)
  const bodyId = `note-${note.note_id}-body`
  if (!note.is_sensitive) return <p className="leading-relaxed whitespace-pre-line text-foreground text-pretty">{note.note_text}</p>
  if (!revealed) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-md border border-dashed border-shade/40 bg-muted/60 px-3 py-2">
        <p className="flex flex-1 items-center gap-2 text-[13px] text-muted-foreground">
          <Lock className="size-4 shrink-0" aria-hidden="true" />
          Sensitive note: hidden because it contains personal information.
        </p>
        <Button variant="outline" size="sm" className="bg-card" aria-expanded={false} onClick={() => setRevealed(true)}>
          Show note
        </Button>
      </div>
    )
  }
  return (
    <div id={bodyId} className="flex flex-col gap-2 rounded-md border border-shade/30 bg-muted/40 px-3 py-2">
      <p className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
        <Lock className="size-3.5" aria-hidden="true" /> Sensitive
      </p>
      <p className="leading-relaxed whitespace-pre-line text-foreground text-pretty">{note.note_text}</p>
      <Button variant="link" size="sm" className="self-start px-0 text-azurite" aria-expanded={true} onClick={() => setRevealed(false)}>
        Hide note
      </Button>
    </div>
  )
}

function TimelineEntry({ note, last }: { note: ContactNote; last: boolean }) {
  const Icon = TYPE_ICONS[note.contact_type] ?? Users
  return (
    <li className="relative flex gap-3">
      <div className="flex flex-col items-center">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-shade/30 bg-card text-shade">
          <Icon className="size-3.5" aria-hidden="true" />
        </span>
        {!last && <span className="w-px flex-1 bg-border" aria-hidden="true" />}
      </div>
      <article className={cn("flex min-w-0 flex-1 flex-col gap-1.5", !last && "pb-5")}>
        <header className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-muted-foreground">
          <time dateTime={note.contact_date} className="font-medium text-foreground tabular-nums">
            {formatDate(note.contact_date)}
          </time>
          <span aria-hidden="true">·</span>
          <span>{note.contact_type}</span>
          <span aria-hidden="true">·</span>
          <span>{note.advisor}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono text-[12px]">{note.note_id}</span>
        </header>
        <NoteBody note={note} />
        {note.follow_up_date && (
          <div>
            <FollowUpChip date={note.follow_up_date} doneBy={note.follow_up_done_by} />
          </div>
        )}
      </article>
    </li>
  )
}

export function ContactTimeline({ notes }: { notes: ContactNote[] }) {
  const [expanded, setExpanded] = useState(false)
  const hiddenCount = Math.max(0, notes.length - VISIBLE_COUNT)
  const visible = expanded ? notes : notes.slice(0, VISIBLE_COUNT)

  return (
    <div className="flex flex-col gap-3">
      <ol id="contact-timeline" className="flex flex-col">
        {visible.map((note, i) => (
          <TimelineEntry key={note.note_id} note={note} last={i === visible.length - 1} />
        ))}
      </ol>
      {hiddenCount > 0 && (
        <Button
          variant="outline"
          size="sm"
          className="self-start bg-card"
          aria-expanded={expanded}
          aria-controls="contact-timeline"
          onClick={() => setExpanded((v) => !v)}
        >
          <ChevronDown className={cn("transition-transform", expanded && "rotate-180")} aria-hidden="true" />
          {expanded ? "Show fewer" : `Show ${hiddenCount} earlier contact${hiddenCount === 1 ? "" : "s"}`}
        </Button>
      )}
    </div>
  )
}
