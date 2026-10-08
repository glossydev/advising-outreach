"use client"

import { useState } from "react"
import { ChevronDown, CircleEllipsis, Mail, MessageSquare, Phone, Users, Video } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ContactMethod, ContactNote } from "@/lib/types"
import { METHOD_LABELS, formatDate, isBeforeToday } from "@/lib/format"
import { cn } from "@/lib/utils"

const METHOD_ICONS: Record<ContactMethod, React.ComponentType<{ className?: string }>> = {
  email: Mail,
  phone: Phone,
  in_person: Users,
  video: Video,
  text: MessageSquare,
  other: CircleEllipsis,
}

const VISIBLE_COUNT = 3

function FollowUpChip({ date }: { date: string }) {
  const overdue = isBeforeToday(date)
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

function TimelineEntry({ note, last }: { note: ContactNote; last: boolean }) {
  const Icon = METHOD_ICONS[note.method]
  return (
    <li className="relative flex gap-3">
      <div className="flex flex-col items-center">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-shade/30 bg-card text-shade">
          <Icon className="size-3.5" aria-hidden="true" />
        </span>
        {!last && <span className="w-px flex-1 bg-border" aria-hidden="true" />}
      </div>
      <article className={cn("flex min-w-0 flex-1 flex-col gap-1", !last && "pb-5")}>
        <header className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-muted-foreground">
          <time dateTime={note.contact_date} className="font-medium text-foreground tabular-nums">
            {formatDate(note.contact_date)}
          </time>
          <span aria-hidden="true">·</span>
          <span>{METHOD_LABELS[note.method]}</span>
          <span aria-hidden="true">·</span>
          <span>{note.advisor}</span>
        </header>
        <h3 className="font-medium text-navy text-pretty">{note.summary}</h3>
        <p className="leading-relaxed whitespace-pre-line text-foreground text-pretty">{note.body}</p>
        {note.follow_up_date && (
          <div className="pt-1">
            <FollowUpChip date={note.follow_up_date} />
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
