"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { TriangleAlert } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePicker } from "@/components/shared/date-picker"
import { TODAY_ISO } from "@/lib/config"
import { CONTACT_TYPES } from "@/lib/import/fields"
import { findSensitiveTerms } from "@/lib/import/text"
import { fullName } from "@/lib/format"
import { NOTE_MAX_LENGTH, validateNoteInput } from "@/lib/validation"
import type { ContactPreference, NewNoteInput, NoteFieldErrors } from "@/lib/types"
import { cn } from "@/lib/utils"

export interface LogContactStudent {
  student_id: string
  first_name: string
  last_name: string
  advisor: string
  contact_preference?: ContactPreference | null
}

const TYPE_ITEMS = Object.fromEntries(CONTACT_TYPES.map((t) => [t, t])) as Record<string, string>

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} className="text-[13px] font-medium text-signal">
      {message}
    </p>
  )
}

export function LogContactForm({
  student,
  advisor,
  onDirtyChange,
  onCancel,
  onSaved,
}: {
  student: LogContactStudent
  advisor: string
  onDirtyChange: (dirty: boolean) => void
  onCancel: () => void
  onSaved: () => void
}) {
  const router = useRouter()
  const preferred = student.contact_preference?.channel
  const [values, setValues] = useState<NewNoteInput>({
    contact_date: TODAY_ISO,
    contact_type: preferred === "Phone" || preferred === "Email" ? preferred : "Email",
    advisor,
    note_text: "",
    follow_up_date: null,
    is_sensitive: false,
  })
  const [errors, setErrors] = useState<NoteFieldErrors>({})
  const [pending, startTransition] = useTransition()

  function update<K extends keyof NewNoteInput>(key: K, value: NewNoteInput[K]) {
    setValues((v) => ({ ...v, [key]: value }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
    onDirtyChange(true)
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const clientErrors = validateNoteInput(values)
    if (Object.keys(clientErrors).length) {
      setErrors(clientErrors)
      form.querySelector<HTMLElement>(`#${Object.keys(clientErrors)[0]}`)?.focus()
      return
    }
    startTransition(async () => {
      const response = await fetch(`/api/students/${encodeURIComponent(student.student_id)}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
      if (response.status === 201) {
        toast.success(`Contact logged for ${fullName(student)}`)
        onSaved()
        router.refresh()
        return
      }
      const body = (await response.json().catch(() => null)) as { error?: { message?: string; fields?: NoteFieldErrors } } | null
      if (body?.error?.fields) setErrors(body.error.fields)
      toast.error(body?.error?.message ?? "The contact couldn't be saved. Try again.")
    })
  }

  // D19: warn, don't block, when the channel goes against what the student asked for.
  const conflictsWithPreference =
    preferred && (values.contact_type === "Phone" || values.contact_type === "Email") && values.contact_type !== preferred
  // D18: suggest marking the note sensitive; the advisor decides.
  const sensitiveTerms = values.is_sensitive ? [] : findSensitiveTerms(values.note_text)

  return (
    <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contact_date">Contact date</Label>
            <DatePicker
              id="contact_date"
              value={values.contact_date}
              onChange={(v) => update("contact_date", v ?? "")}
              maxDate={TODAY_ISO}
              invalid={Boolean(errors.contact_date)}
              describedBy={errors.contact_date ? "contact_date-error" : undefined}
            />
            <FieldError id="contact_date-error" message={errors.contact_date} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contact_type">Contact type</Label>
            <Select items={TYPE_ITEMS} value={values.contact_type} onValueChange={(v) => v && update("contact_type", v)}>
              <SelectTrigger
                id="contact_type"
                className="w-full bg-card"
                aria-invalid={Boolean(errors.contact_type) || undefined}
                aria-describedby={conflictsWithPreference ? "preference-warning" : undefined}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTACT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError id="contact_type-error" message={errors.contact_type} />
          </div>
        </div>

        {conflictsWithPreference && (
          <p
            id="preference-warning"
            role="status"
            className="flex gap-2 rounded-md border border-amber/50 bg-caliche/60 p-3 text-[13px] leading-relaxed"
          >
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-brick" aria-hidden="true" />
            <span>
              {student.first_name} asked to be contacted by <strong>{preferred?.toLowerCase()}</strong> only: &ldquo;
              {student.contact_preference?.text}&rdquo;
            </span>
          </p>
        )}

        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <Label htmlFor="note_text">
              Note <span className="font-normal text-muted-foreground">(required)</span>
            </Label>
            <span
              id="note-count"
              className={cn(
                "text-[13px] tabular-nums",
                values.note_text.length > NOTE_MAX_LENGTH ? "font-medium text-signal" : "text-muted-foreground",
              )}
            >
              {values.note_text.length.toLocaleString()}/{NOTE_MAX_LENGTH.toLocaleString()}
            </span>
          </div>
          <Textarea
            id="note_text"
            value={values.note_text}
            onChange={(e) => update("note_text", e.target.value)}
            rows={8}
            placeholder="What was discussed, and what happens next"
            aria-invalid={Boolean(errors.note_text) || undefined}
            aria-describedby={cn("note-count", errors.note_text && "note_text-error")}
            required
            className="min-h-40 bg-card leading-relaxed"
          />
          <FieldError id="note_text-error" message={errors.note_text} />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-start gap-2">
            <Checkbox
              id="is_sensitive"
              checked={values.is_sensitive}
              onCheckedChange={(checked) => update("is_sensitive", checked === true)}
              aria-describedby="is_sensitive-help"
              className="mt-0.5"
            />
            <div className="flex flex-col gap-0.5">
              <Label htmlFor="is_sensitive">Sensitive note</Label>
              <p id="is_sensitive-help" className="text-[13px] text-muted-foreground">
                Collapsed in the timeline until someone chooses to read it, and left out of summaries.
              </p>
            </div>
          </div>
          {sensitiveTerms.length > 0 && (
            <p role="status" className="text-[13px] text-brick">
              This mentions {sensitiveTerms.map((t) => t.label).join(", ")}. Consider marking it sensitive.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="follow_up_date">
            Follow-up date <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <DatePicker
            id="follow_up_date"
            value={values.follow_up_date}
            onChange={(v) => update("follow_up_date", v)}
            minDate={values.contact_date || undefined}
            placeholder="No follow-up"
            clearable
            invalid={Boolean(errors.follow_up_date)}
            describedBy={errors.follow_up_date ? "follow_up_date-error" : undefined}
          />
          <FieldError id="follow_up_date-error" message={errors.follow_up_date} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="advisor">Advisor</Label>
          <Input id="advisor" value={values.advisor} readOnly aria-readonly="true" className="bg-muted text-foreground" />
          <p className="text-[13px] text-muted-foreground">Set from the Advisor selection in the top bar.</p>
          <FieldError id="advisor-error" message={errors.advisor} />
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-border bg-card p-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" variant="signal" disabled={pending}>
          {pending ? "Saving…" : "Save contact"}
        </Button>
      </div>
    </form>
  )
}
