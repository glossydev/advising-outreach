"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Pencil, Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PREFERENCE_DETAILS_MAX, validatePreferenceInput } from "@/lib/contact-preference"
import type { ContactPreference, ContactPreferenceErrors, ContactPreferenceInput, PreferredChannel } from "@/lib/types"

const ANY = "any"
const CHANNEL_ITEMS: Record<string, string> = { [ANY]: "No particular channel", Phone: "Phone", Email: "Email", Text: "Text" }

/**
 * Adds, changes or removes a student's contact preference (P9). Saved through the API, which runs
 * the same checks; a failed request keeps what was typed and says so.
 */
export function ContactPreferenceEditor({
  studentId,
  firstName,
  preference,
}: {
  studentId: string
  firstName: string
  preference: ContactPreference | null
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState<ContactPreferenceInput>({ channel: null, only: false, details: "" })
  const [errors, setErrors] = useState<ContactPreferenceErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function start() {
    setValues({ channel: preference?.channel ?? null, only: preference?.only ?? false, details: preference?.details ?? "" })
    setErrors({})
    setFormError(null)
    setOpen(true)
  }

  function send(method: "PUT" | "DELETE") {
    setFormError(null)
    startTransition(async () => {
      let response: Response
      try {
        response = await fetch(`/api/students/${encodeURIComponent(studentId)}/contact-preference`, {
          method,
          headers: method === "PUT" ? { "Content-Type": "application/json" } : undefined,
          body: method === "PUT" ? JSON.stringify(values) : undefined,
        })
      } catch {
        setFormError("Couldn't reach the server, so nothing was saved. Check your connection and try again.")
        return
      }
      if (response.ok) {
        toast.success(method === "PUT" ? "Contact preference saved" : "Contact preference removed")
        setOpen(false)
        router.refresh()
        return
      }
      const body = (await response.json().catch(() => null)) as { error?: { message?: string; fields?: ContactPreferenceErrors } } | null
      if (body?.error?.fields) setErrors(body.error.fields)
      setFormError(body?.error?.message ?? `Nothing was saved (error ${response.status}). Try again.`)
    })
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    const clientErrors = validatePreferenceInput(values)
    setErrors(clientErrors)
    if (Object.keys(clientErrors).length === 0) send("PUT")
  }

  return (
    <>
      {preference ? (
        <Button variant="link" size="sm" className="h-auto px-0 text-[13px] text-azurite" onClick={start}>
          <Pencil aria-hidden="true" />
          Edit<span className="sr-only"> contact preference</span>
        </Button>
      ) : (
        <Button variant="outline" size="sm" className="self-start bg-card" onClick={start}>
          <Plus aria-hidden="true" />
          Add a contact preference
        </Button>
      )}
      <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-navy">Contact preference</DialogTitle>
              <DialogDescription>
                How {firstName} wants to be contacted. Shown in Before you reach out and in the Log contact form.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="preference-channel">Preferred channel</Label>
              <Select
                items={CHANNEL_ITEMS}
                value={values.channel ?? ANY}
                onValueChange={(v) => {
                  const channel = !v || v === ANY ? null : (v as PreferredChannel)
                  setValues((s) => ({ ...s, channel, only: channel ? s.only : false }))
                }}
              >
                <SelectTrigger id="preference-channel" className="w-full bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CHANNEL_ITEMS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                id="preference-only"
                checked={values.only}
                disabled={!values.channel}
                onCheckedChange={(checked) => setValues((s) => ({ ...s, only: checked === true }))}
                aria-describedby="preference-only-help"
                className="mt-0.5"
              />
              <div className="flex flex-col gap-0.5">
                <Label htmlFor="preference-only">Only this way</Label>
                <p id="preference-only-help" className="text-[13px] text-muted-foreground">
                  Tick if {firstName} asked not to be contacted any other way. Leave it for a preference.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="preference-details">
                Details <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="preference-details"
                value={values.details}
                onChange={(e) => setValues((s) => ({ ...s, details: e.target.value }))}
                rows={3}
                maxLength={PREFERENCE_DETAILS_MAX + 100}
                placeholder="For example: best reached after 5 pm"
                aria-invalid={Boolean(errors.details) || undefined}
                aria-describedby={errors.details ? "preference-details-error" : undefined}
                className="bg-card"
              />
              {errors.details && (
                <p id="preference-details-error" className="text-[13px] font-medium text-signal">
                  {errors.details}
                </p>
              )}
            </div>

            {formError && (
              <p role="alert" className="rounded-md border border-signal/40 bg-signal/5 p-3 text-[13px] font-medium text-signal">
                {formError}
              </p>
            )}

            <DialogFooter className="items-center sm:justify-between">
              {preference ? (
                <Button type="button" variant="outline" className="bg-card text-signal" disabled={pending} onClick={() => send("DELETE")}>
                  Remove preference
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="bg-card" disabled={pending} onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="signal" disabled={pending}>
                  {pending ? "Saving…" : "Save"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
