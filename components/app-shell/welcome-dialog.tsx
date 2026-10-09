"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { CircleHelp, FileUp, GraduationCap, ListOrdered, ShieldCheck, UserRound, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { TODAY_ISO } from "@/lib/config"
import { formatDate } from "@/lib/format"

const STORAGE_KEY = "advising-outreach.welcome-dismissed"
const OPEN_EVENT = "advising-outreach:open-welcome"

/*
 * "Don't show this again" lives in this browser only: there are no user accounts (DECISIONS P4).
 * Closing without ticking it keeps the dialog away for the rest of this visit (the tab's session).
 */
function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1" || window.sessionStorage.getItem(STORAGE_KEY) === "1"
  } catch {
    return false
  }
}
function readDismissedForever(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1"
  } catch {
    return false
  }
}
function writeDismissed(forever: boolean) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, "1")
    if (forever) window.localStorage.setItem(STORAGE_KEY, "1")
    else window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage blocked (private window, policy): the dialog just shows again on the next page load.
  }
}
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange)
  return () => window.removeEventListener("storage", onChange)
}

const FEATURES = [
  { icon: ListOrdered, title: "Outreach Queue", text: "Who to contact today, ranked. Follow-ups that are due come first, then students never contacted, and every score shows its reasons." },
  { icon: Users, title: "Students", text: "Search and filter the whole caseload by advisor, major, class year, risk and last contact." },
  { icon: UserRound, title: "Student pages", text: "Contact history, what to know before reaching out, and Log contact to record a new one." },
  { icon: FileUp, title: "Import", text: "Bring in a spreadsheet. Problems are flagged and explained, with a suggested fix you can accept." },
  { icon: ShieldCheck, title: "Data Quality", text: "Every import, what it found in the data, and what was done about it." },
]

/** First-visit welcome (DECISIONS P4). Reopened from the help button in the top bar. */
export function WelcomeDialog({ logoSrc }: { logoSrc: string | null }) {
  // Server snapshot says "dismissed", so nothing renders until the browser has checked storage.
  const dismissed = useSyncExternalStore(subscribe, readDismissed, () => true)
  const [closed, setClosed] = useState(false)
  const [reopened, setReopened] = useState(false)
  const [dontShow, setDontShow] = useState(false)
  const popupRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function reopen() {
      setDontShow(readDismissedForever())
      setReopened(true)
      setClosed(false)
    }
    window.addEventListener(OPEN_EVENT, reopen)
    return () => window.removeEventListener(OPEN_EVENT, reopen)
  }, [])

  const open = reopened || (!dismissed && !closed)

  function close() {
    writeDismissed(dontShow)
    setClosed(true)
    setReopened(false)
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      {/*
        Focus starts on the dialog itself. By default it would go to the first link, near the bottom, and on a short
        phone the dialog would open scrolled past its title.
      */}
      <DialogContent ref={popupRef} initialFocus={popupRef} className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader className="flex-row items-center gap-4">
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element -- a small static SVG; next/image adds nothing here
            <img src={logoSrc} alt="University of Arizona" className="h-12 w-auto shrink-0" />
          ) : (
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-navy text-white">
              <GraduationCap className="size-6" aria-hidden="true" />
            </span>
          )}
          <div className="flex flex-col gap-1">
            <DialogTitle className="text-xl font-semibold text-navy">Welcome to Advising Outreach</DialogTitle>
            <DialogDescription className="text-[13px] leading-relaxed">
              A tool for an advising office: see which students to reach out to next and why, read what was discussed last time,
              and log new contacts.
            </DialogDescription>
          </div>
        </DialogHeader>

        <section aria-labelledby="welcome-features" className="flex flex-col gap-2">
          <h3 id="welcome-features" className="text-[13px] font-semibold tracking-wide text-navy uppercase">
            What&apos;s here
          </h3>
          <ul className="grid gap-3 sm:grid-cols-2">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-2.5">
                <Icon className="mt-0.5 size-4 shrink-0 text-azurite" aria-hidden="true" />
                <span className="flex flex-col">
                  <span className="font-medium text-navy">{title}</span>
                  <span className="text-[13px] leading-relaxed text-muted-foreground">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="welcome-start" className="flex flex-col gap-2 rounded-lg bg-cloud p-3">
          <h3 id="welcome-start" className="text-[13px] font-semibold tracking-wide text-navy uppercase">
            Getting started
          </h3>
          <ol className="flex list-decimal flex-col gap-1 pl-5 text-[13px] leading-relaxed">
            <li>Choose your name under <strong>Advisor</strong> at the top to see just your caseload.</li>
            <li>Start at the top of the <strong>Outreach Queue</strong>; the reasons say why each student is there.</li>
            <li>Open a student, read <strong>Before you reach out</strong>, then use <strong>Log contact</strong>.</li>
          </ol>
        </section>

        <p className="text-[12px] leading-relaxed text-muted-foreground">
          A prototype built for an interview exercise. All student data is fictional, and &ldquo;today&rdquo; is fixed at{" "}
          {formatDate(TODAY_ISO)}, as in the brief.
          {logoSrc && " The University of Arizona Block A is a trademark of the University of Arizona."} Reopen this any time from
          the <CircleHelp className="inline size-3.5 align-[-2px]" aria-label="help" /> button at the top. Step-by-step guides
          for every screen are in{" "}
          <a href="/help" target="_blank" className="text-azurite underline underline-offset-2 hover:text-navy">
            Help &amp; documentation<span className="sr-only"> (opens in a new tab)</span>
          </a>
          .
        </p>

        <DialogFooter className="items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Checkbox id="welcome-dont-show" checked={dontShow} onCheckedChange={(checked) => setDontShow(checked === true)} />
            <Label htmlFor="welcome-dont-show" className="font-normal">
              Don&apos;t show this again
            </Label>
          </div>
          <Button variant="signal" onClick={close}>
            Get started
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Top-bar button that reopens the welcome dialog. */
export function HelpButton() {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="About this app"
      title="About this app"
      onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}
    >
      <CircleHelp aria-hidden="true" />
    </Button>
  )
}
