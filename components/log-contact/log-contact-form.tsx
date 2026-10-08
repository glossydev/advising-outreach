"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePicker } from "@/components/shared/date-picker"
import { logContactAction } from "@/app/actions"
import { SUMMARY_MAX_LENGTH, TODAY_ISO } from "@/lib/config"
import { METHOD_LABELS, fullName } from "@/lib/format"
import { validateNoteInput } from "@/lib/validation"
import type { ContactMethod, NewNoteInput, NoteFieldErrors } from "@/lib/types"
import { cn } from "@/lib/utils"

export interface LogContactStudent {
  student_id: string
  first_name: string
  last_name: string
  advisor: string
}

const METHOD_ITEMS = METHOD_LABELS as Record<ContactMethod, string>

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
  const [values, setValues] = useState<NewNoteInput>({
    student_id: student.student_id,
    contact_date: TODAY_ISO,
    method: "email",
    advisor,
    summary: "",
    body: "",
    follow_up_date: null,
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
    const clientErrors = validateNoteInput(values)
    if (Object.keys(clientErrors).length) {
      setErrors(clientErrors)
      const first = Object.keys(clientErrors)[0]
      event.currentTarget.querySelector<HTMLElement>(`#${first}`)?.focus()
      return
    }
    startTransition(async () => {
      const result = await logContactAction(values)
      if (!result.ok) {
        setErrors(result.errors)
        return
      }
      toast.success(`Contact logged for ${fullName(student)}`)
      onSaved()
    })
  }

  const summaryLength = values.summary.length
  const overLimit = summaryLength > SUMMARY_MAX_LENGTH

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
            <Label htmlFor="method">Method</Label>
            <Select
              items={METHOD_ITEMS}
              value={values.method}
              onValueChange={(v) => v && update("method", v as ContactMethod)}
            >
              <SelectTrigger
                id="method"
                data-field="method"
                className="w-full bg-card"
                aria-invalid={Boolean(errors.method) || undefined}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(METHOD_ITEMS) as ContactMethod[]).map((m) => (
                  <SelectItem key={m} value={m}>
                    {METHOD_ITEMS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError id="method-error" message={errors.method} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <Label htmlFor="summary">
              Summary <span className="font-normal text-muted-foreground">(required)</span>
            </Label>
            <span
              id="summary-count"
              className={cn("text-[13px] tabular-nums", overLimit ? "font-medium text-signal" : "text-muted-foreground")}
            >
              {summaryLength}/{SUMMARY_MAX_LENGTH}
            </span>
          </div>
          <Input
            id="summary"
            data-field="summary"
            value={values.summary}
            onChange={(e) => update("summary", e.target.value)}
            placeholder="One line, e.g. Discussed spring registration plan"
            aria-invalid={Boolean(errors.summary) || undefined}
            aria-describedby={cn("summary-count", errors.summary && "summary-error")}
            required
            className="bg-card"
          />
          <FieldError id="summary-error" message={errors.summary} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="body">
            Notes <span className="font-normal text-muted-foreground">(required)</span>
          </Label>
          <Textarea
            id="body"
            data-field="body"
            value={values.body}
            onChange={(e) => update("body", e.target.value)}
            rows={7}
            aria-invalid={Boolean(errors.body) || undefined}
            aria-describedby={errors.body ? "body-error" : undefined}
            required
            className="min-h-36 bg-card leading-relaxed"
          />
          <FieldError id="body-error" message={errors.body} />
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
          <FieldError id="advisor-error" message={errors.advisor ?? errors.student_id} />
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
