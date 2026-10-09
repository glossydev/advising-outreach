"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Info } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePicker } from "@/components/shared/date-picker"
import { TODAY_ISO } from "@/lib/config"
import { preferenceHeading } from "@/lib/contact-preference"
import { daysBetween } from "@/lib/import/dates"
import { CONTACT_TYPES } from "@/lib/import/fields"
import { extractContactPreference, findSensitiveTerms } from "@/lib/import/text"
import { formatDate, fullName } from "@/lib/format"
import { NOTE_MAX_LENGTH, validateNoteInput } from "@/lib/validation"
import type { ContactPreference, FollowUp, NewNoteInput, NoteFieldErrors } from "@/lib/types"
import { cn } from "@/lib/utils"

export interface LogContactStudent {
  student_id: string
  first_name: string
  last_name: string
  advisor: string
  contact_preference?: ContactPreference | null
  open_follow_ups?: FollowUp[]
}

const TYPE_ITEMS = Object.fromEntries(CONTACT_TYPES.map((t) => [t, t])) as Record<string, string>

/** How close to a follow-up's date a contact has to be for "completes it" to start ticked (P8). */
const COMPLETES_WITHIN_DAYS = 2

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
  advisorIsAssigned = false,
  onDirtyChange,
  onCancel,
  onSaved,
}: {
  student: LogContactStudent
  advisor: string
  /** True when no advisor is chosen in the top bar, so the student's own advisor is used. */
  advisorIsAssigned?: boolean
  onDirtyChange: (dirty: boolean) => void
  onCancel: () => void
  onSaved: () => void
}) {
  const router = useRouter()
  // No default contact type: it records how this contact happened, so the advisor says which (P6).
  const [values, setValues] = useState<NewNoteInput>({
    contact_date: TODAY_ISO,
    contact_type: "",
    advisor,
    note_text: "",
    follow_up_date: null,
    is_sensitive: false,
  })
  const [errors, setErrors] = useState<NoteFieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  /** Follow-ups the advisor ticked or unticked; the rest follow the default. */
  const [completeChoices, setCompleteChoices] = useState<Record<string, boolean>>({})
  const [savePreference, setSavePreference] = useState(false)
  const [pending, startTransition] = useTransition()

  const openFollowUps = student.open_follow_ups ?? []
  const completes = (f: FollowUp) =>
    completeChoices[f.note_id] ?? (Boolean(values.contact_date) && daysBetween(values.contact_date, f.date) <= COMPLETES_WITHIN_DAYS)
  // D19, P9: a preference stated in this note can be saved on the student's record, if the advisor says so.
  const stated = extractContactPreference(values.note_text)
  const current = student.contact_preference ?? null
  // D18: suggest marking the note sensitive; the advisor decides.
  const sensitiveTerms = values.is_sensitive ? [] : findSensitiveTerms(values.note_text)

  function update<K extends keyof NewNoteInput>(key: K, value: NewNoteInput[K]) {
    setValues((v) => ({ ...v, [key]: value }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
    onDirtyChange(true)
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    setFormError(null)
    const clientErrors = validateNoteInput(values)
    if (Object.keys(clientErrors).length) {
      setErrors(clientErrors)
      form.querySelector<HTMLElement>(`#${Object.keys(clientErrors)[0]}`)?.focus()
      return
    }
    const payload: NewNoteInput = {
      ...values,
      completes_follow_ups: openFollowUps.filter(completes).map((f) => f.note_id),
      save_preference: Boolean(stated) && savePreference,
    }
    startTransition(async () => {
      // A failed request leaves the form as it was: the note is never lost to a network error.
      let response: Response
      try {
        response = await fetch(`/api/students/${encodeURIComponent(student.student_id)}/notes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      } catch {
        setFormError("Couldn't reach the server, so the contact wasn't saved. Your note is still here: check your connection and try again.")
        return
      }
      if (response.status === 201) {
        toast.success(`Contact logged for ${fullName(student)}`)
        onSaved()
        router.refresh()
        return
      }
      const body = (await response.json().catch(() => null)) as { error?: { message?: string; fields?: NoteFieldErrors } } | null
      if (body?.error?.fields) setErrors(body.error.fields)
      setFormError(body?.error?.message ?? `The contact couldn't be saved (error ${response.status}). Your note is still here; try again.`)
    })
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4">
        {current && (
          <div className="flex gap-2 rounded-md border border-azurite/30 bg-cloud p-3 text-[13px] leading-relaxed">
            <Info className="mt-0.5 size-4 shrink-0 text-azurite" aria-hidden="true" />
            <p>
              <span className="font-medium text-navy">Contact preference: {preferenceHeading(current)}.</span>
              {current.details && <> &ldquo;{current.details}&rdquo;</>}
            </p>
          </div>
        )}

        <div className="grid gap-3 min-[400px]:grid-cols-2">
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
            <Select items={TYPE_ITEMS} value={values.contact_type || null} onValueChange={(v) => v && update("contact_type", v as string)}>
              <SelectTrigger
                id="contact_type"
                className="w-full bg-card"
                aria-invalid={Boolean(errors.contact_type) || undefined}
                aria-describedby={errors.contact_type ? "contact_type-error" : undefined}
              >
                <SelectValue placeholder="How it happened" />
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

        {stated && (
          <div className="flex items-start gap-2 rounded-md border border-border bg-muted/40 p-3">
            <Checkbox
              id="save_preference"
              checked={savePreference}
              onCheckedChange={(checked) => {
                setSavePreference(checked === true)
                onDirtyChange(true)
              }}
              aria-describedby="save_preference-help"
              className="mt-0.5"
            />
            <div className="flex flex-col gap-0.5">
              <Label htmlFor="save_preference">
                Save as {student.first_name}&apos;s contact preference: {preferenceHeading(stated)}
              </Label>
              <p id="save_preference-help" className="text-[13px] text-muted-foreground">
                This note reads like a contact preference.
                {current
                  ? ` It would replace the current one (${preferenceHeading(current)}${current.stated_on ? `, from ${formatDate(current.stated_on)}` : ""}).`
                  : " It would show in Before you reach out and here."}
              </p>
            </div>
          </div>
        )}

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

        {openFollowUps.length > 0 && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1.5 text-sm font-medium">Open follow-ups</legend>
            {openFollowUps.map((f) => {
              const id = `completes-${f.note_id}`
              return (
                <div key={f.note_id} className="flex items-start gap-2">
                  <Checkbox
                    id={id}
                    checked={completes(f)}
                    onCheckedChange={(checked) => {
                      setCompleteChoices((c) => ({ ...c, [f.note_id]: checked === true }))
                      onDirtyChange(true)
                    }}
                    className="mt-0.5"
                  />
                  <Label htmlFor={id} className="font-normal">
                    This contact completes the follow-up due {formatDate(f.date)} (set in {f.note_id})
                  </Label>
                </div>
              )
            })}
            <p className="text-[13px] text-muted-foreground">
              Ticked when this contact is within {COMPLETES_WITHIN_DAYS} days of the follow-up date or after it. Untick it if this
              contact was about something else.
            </p>
          </fieldset>
        )}

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
          <p className="text-[13px] text-muted-foreground">
            {advisorIsAssigned
              ? `${student.first_name}'s assigned advisor. Choose your name under Advisor in the top bar to log contacts as yourself.`
              : "Set from the Advisor selection in the top bar."}
          </p>
          <FieldError id="advisor-error" message={errors.advisor} />
        </div>
      </div>

      {formError && (
        <p role="alert" className="mx-4 mb-0 rounded-md border border-signal/40 bg-signal/5 p-3 text-[13px] font-medium text-signal">
          {formError}
        </p>
      )}
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
