import { mkdirSync } from "node:fs"
import { expect, test as plain, type Page } from "@playwright/test"
import { reloadSampleData, WELCOME_KEY } from "./fixtures"

/*
 * Walks every screen, dialog and state of the app, saving screenshots for the help pages
 * (public/help/screens/). Doubles as a sweep for problems: any browser error along the way fails it.
 *
 *   npm run docs:screenshots
 */

const OUT = "public/help/screens"
mkdirSync(OUT, { recursive: true })

const MESSY_STUDENTS = [
  "Student ID,First Name,Surname,Email,Program,Class Standing,credits,GPA,Advisor,Last Contacted,Risk,Notes",
  "S2001,Ana,Ruiz,ana.ruiz@example.edu,Biology,Junior,64,3.1,Reyes,Sep 30 2026,low,transfer student",
  "S2002,Ben,Ortiz,ben.ortiz@example,Chemistry,Junior,48,4.3,Okafor,03/04/2026,Severe,",
  "S1001,Maya,Patel,maya.patel@example.edu,Chemistry,Sophomore,48,3.62,Okafor,2026-09-18,Low,changed major",
].join("\n")

interface ShotOptions {
  /** The whole page, not just the window. */
  tall?: boolean
  /** Only this element. */
  clip?: string
  /** Keep the confirmation toast in the picture (otherwise wait for it to go). */
  keepToasts?: boolean
  /** Cover this element, e.g. a field holding an SSN-shaped test value (D17: never displayed). */
  mask?: string
}

/** Waits for animations, toasts and the network to settle, then saves a JPEG. */
async function shot(page: Page, name: string, options: ShotOptions = {}) {
  await page.waitForLoadState("networkidle")
  if (!options.keepToasts) {
    // A toast under the pointer stays up (Sonner pauses it on hover), and Save is right where toasts appear.
    await page.mouse.move(1, 1)
    await expect(page.locator("[data-sonner-toast]")).toHaveCount(0, { timeout: 10_000 })
  }
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running"))
  const path = `${OUT}/${name}.jpg`
  const settings = {
    path,
    type: "jpeg" as const,
    quality: 82,
    ...(options.mask ? { mask: [page.locator(options.mask)], maskColor: "#DCE3EC" } : {}),
  }
  if (options.clip) {
    await page.locator(options.clip).first().screenshot(settings)
  } else if (options.tall) {
    // Grow the window to the page's height rather than using fullPage, so the fixed sidebar spans it too.
    const viewport = page.viewportSize()!
    const height = await page.evaluate(() => document.documentElement.scrollHeight)
    await page.setViewportSize({ width: viewport.width, height })
    await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running"))
    await page.screenshot(settings)
    await page.setViewportSize(viewport)
  } else {
    await page.screenshot(settings)
  }
}

function watchErrors(page: Page, errors: string[]) {
  page.on("pageerror", (e) => errors.push(`${page.url()} pageerror: ${e.message}`))
  page.on("console", (m) => {
    if (m.type() !== "error") return
    // The not-found page is meant to answer 404, and Chrome logs that.
    if (page.url().endsWith("/students/S9999") && m.text().includes("status of 404")) return
    errors.push(`${page.url()} console: ${m.text().slice(0, 300)}`)
  })
}

plain.describe.configure({ mode: "serial" })

plain("walk every screen and capture it for the help pages", async ({ browser, request }) => {
  plain.setTimeout(240_000)
  await reloadSampleData(request)
  const errors: string[] = []

  // ---- First visit ----
  const fresh = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const first = await fresh.newPage()
  watchErrors(first, errors)
  await first.goto("/")
  await expect(first.getByRole("dialog", { name: "Welcome to Advising Outreach" })).toBeVisible()
  await shot(first, "welcome")
  await fresh.close()

  // ---- Everything else, with the welcome dialog dismissed ----
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  await context.addInitScript((key) => window.localStorage.setItem(key, "1"), WELCOME_KEY)
  const page = await context.newPage()
  watchErrors(page, errors)

  // Outreach queue
  await page.goto("/")
  await shot(page, "queue")
  await shot(page, "sidebar", { clip: "aside" })
  await page.getByRole("combobox", { name: "Risk flag" }).click()
  await shot(page, "queue-filter-open")
  await page.getByRole("option", { name: "High" }).click()
  await page.keyboard.press("Escape")
  await expect(page).toHaveURL(/risk=High/)
  await shot(page, "queue-filtered")
  await page.locator("header").getByRole("combobox", { name: "Advisor" }).click()
  await page.getByRole("option", { name: "Okafor" }).click()
  await expect(page.getByLabel("Outreach summary")).toContainText("Assigned to Okafor")
  await page.goto("/")
  await shot(page, "queue-advisor")
  // Back to all advisors for the rest of the walk.
  await page.locator("header").getByRole("combobox", { name: "Advisor" }).click()
  await page.getByRole("option", { name: "All advisors" }).click()
  await expect(page.getByLabel("Outreach summary")).toContainText("Across all advisors")
  await page.goto("/?sort=follow_up")
  await expect(page.locator("table tbody tr").first()).toContainText("Due in 10 days")
  await shot(page, "queue-sorted")
  // A follow-up due today goes to the very top (P8). Logged through the API, then undone.
  const logged = await request.post("/api/students/S1001/notes", {
    data: {
      contact_date: "2026-09-28",
      contact_type: "Email",
      advisor: "Okafor",
      note_text: "Will check in on the transfer credit next week.",
      follow_up_date: "2026-10-05",
    },
  })
  expect(logged.status()).toBe(201)
  await page.goto("/")
  await expect(page.locator("table tbody tr").first()).toContainText("Due today")
  await shot(page, "queue-follow-up-due")
  await reloadSampleData(request)

  // Search from anywhere
  const palette = page.getByPlaceholder("Name, student ID, or email…")
  await expect(async () => {
    await page.keyboard.press("Control+k")
    await expect(palette).toBeVisible({ timeout: 1000 })
  }).toPass({ timeout: 10_000 })
  await palette.fill("okonkwo")
  await shot(page, "search")
  await page.keyboard.press("Escape")

  // Students
  await page.goto("/students")
  await shot(page, "students")
  await page.goto("/students?risk=High&last_contact=30")
  await shot(page, "students-filtered")
  await page.goto("/students?q=okonkwo")
  await page.getByRole("img", { name: /Possibly the same person/ }).first().hover()
  await shot(page, "students-duplicate-icon")
  await page.goto("/students?q=nobody")
  await shot(page, "students-no-match")

  // A student's page
  await page.goto("/students/S1002")
  await shot(page, "student", { tall: true })
  await shot(page, "card-before-you-reach-out", { clip: 'section[aria-labelledby="reach-out-heading"]' })
  await shot(page, "card-outreach-priority", { clip: 'section[aria-labelledby="priority-heading"]' })
  await shot(page, "card-at-a-glance", { clip: 'section[aria-labelledby="glance-heading"]' })
  await page.goto("/students/S1037")
  await shot(page, "student-sensitive")
  await page.getByRole("button", { name: "Show note" }).click()
  await shot(page, "student-sensitive-revealed")
  await page.goto("/students/S1021")
  await shot(page, "student-duplicate")
  await page.goto("/students/S1018")
  await shot(page, "student-never-contacted")
  await page.goto("/students/S1003")
  await shot(page, "card-data-notes", { clip: 'section[aria-labelledby="data-notes-heading"]' })
  await page.goto("/students/S9999")
  await shot(page, "student-not-found")

  // Contact preference editor (P9)
  await page.goto("/students/S1002")
  await page.getByRole("button", { name: "Edit contact preference" }).click()
  await expect(page.getByRole("dialog", { name: "Contact preference" })).toBeVisible()
  await shot(page, "preference-editor")
  await page.keyboard.press("Escape")

  // Logging a contact
  await page.goto("/students/S1002")
  await page.getByRole("button", { name: "Log contact" }).first().click()
  const form = page.getByRole("dialog", { name: "Log contact" })
  await expect(form).toBeVisible()
  await shot(page, "log-contact")
  await form.getByRole("combobox", { name: "Contact type" }).click()
  await page.getByRole("option", { name: "Email" }).click()
  await form.getByRole("textbox", { name: /^Note/ }).fill("Student mentioned feeling anxious about midterms; her SSN is 123-45-6789 for the aid form.")
  await form.getByRole("button", { name: "Save contact" }).click()
  await expect(form.getByText("This looks like a Social Security number")).toBeVisible()
  await shot(page, "log-contact-checks", { mask: "textarea" })
  await form.getByRole("button", { name: "Cancel" }).click()
  await shot(page, "log-contact-discard", { mask: "textarea" })
  await page.getByRole("button", { name: "Discard" }).click()
  await page.getByRole("button", { name: "Log contact" }).first().click()
  await form.getByRole("combobox", { name: "Contact type" }).click()
  await page.getByRole("option", { name: "Phone" }).click()
  await form.getByRole("textbox", { name: /^Note/ }).fill("Called as requested. Set up tutoring for Accounting II; will check in after the first session.")
  await form.getByRole("button", { name: "Save contact" }).click()
  await expect(page.getByText("Contact logged for Jordan Whitfield")).toBeVisible()
  await shot(page, "log-contact-saved", { keepToasts: true })

  // An open follow-up and a stated preference in the same contact (P8, P9)
  await page.goto("/students/S1037")
  await page.getByRole("button", { name: "Log contact" }).first().click()
  await form.getByRole("combobox", { name: "Contact type" }).click()
  await page.getByRole("option", { name: "In person" }).click()
  await form.getByRole("textbox", { name: /^Note/ }).fill("FAFSA verification submitted together. Student prefers texts for reminders.")
  await form.getByRole("checkbox", { name: /completes the follow-up/ }).check()
  await form.getByRole("checkbox", { name: /Save as Camila's contact preference/ }).check()
  await form.getByText("Open follow-ups").scrollIntoViewIfNeeded()
  await shot(page, "log-contact-follow-up")
  await form.getByRole("button", { name: "Save contact" }).click()
  await expect(page.getByText("Contact logged for Camila Vargas")).toBeVisible()
  await shot(page, "timeline-follow-up-done", { clip: "#contact-timeline" })
  await reloadSampleData(request)

  // Data quality
  await page.goto("/data-quality")
  await shot(page, "data-quality")
  await page.getByRole("button", { name: /Social Security number in a note/ }).click()
  await shot(page, "data-quality-rule", {
    clip: '[data-slot="accordion-item"]:has-text("Social Security number in a note")',
  })

  // Import: start, reset, empty states
  await page.goto("/import")
  await shot(page, "import", { tall: true })
  await page.getByRole("button", { name: "Reset the database to empty" }).click()
  await shot(page, "import-reset-confirm")
  await page.getByRole("button", { name: "Empty the database" }).click()
  await expect(page.getByText("In the database now: 0 students, 0 notes.")).toBeVisible()
  await page.goto("/")
  await shot(page, "empty-queue")

  // Import: the sample students
  await page.goto("/import")
  await page.getByRole("button", { name: "Use the sample students.csv" }).click()
  await expect(page.getByText("All 11 columns matched exactly")).toBeVisible()
  await shot(page, "import-columns")
  await page.getByRole("button", { name: "Continue to review" }).click()
  await shot(page, "import-review")
  await page.getByRole("button", { name: /^Review row 51/ }).click()
  await expect(page.getByRole("dialog", { name: /Row 51/ })).toBeVisible()
  await shot(page, "import-row-duplicate")
  await page.keyboard.press("Escape")
  await page.getByRole("combobox", { name: "Issue type" }).click()
  await expect(page.getByRole("listbox")).toBeVisible()
  await page.getByRole("option", { name: /Date not in YYYY-MM-DD format/ }).click()
  await expect(page.getByRole("button", { name: /Apply the suggested fix to all/ })).toBeVisible()
  await shot(page, "import-rule-filter")
  await page.getByRole("button", { name: "Accept all suggested fixes" }).click()
  await page.getByRole("tab", { name: /All rows/ }).click()
  await shot(page, "import-review-fixed")
  await page.getByRole("button", { name: "Import 50 rows" }).click()
  await shot(page, "import-confirm")
  await page.getByRole("alertdialog").getByRole("button", { name: "Import" }).click()
  await expect(page.getByText("Students: 50 added")).toBeVisible()
  await shot(page, "import-done", { keepToasts: true })

  // Import: the sample notes, including the SSN note
  await page.getByRole("button", { name: "Import another file" }).click()
  await page.getByRole("button", { name: "Use the sample contact_notes.csv" }).click()
  await page.getByRole("button", { name: "Continue to review" }).click()
  await shot(page, "import-notes-review")
  await page.getByRole("button", { name: /^Review row 42/ }).click()
  await expect(page.getByRole("dialog", { name: /Row 42/ })).toBeVisible()
  await shot(page, "import-row-ssn")
  await page.keyboard.press("Escape")
  await page.getByRole("button", { name: "Accept all suggested fixes" }).click()
  await page.getByRole("button", { name: "Import 57 rows" }).click()
  await page.getByRole("alertdialog").getByRole("button", { name: "Import" }).click()
  await expect(page.getByText("Contact notes: 57 added")).toBeVisible()

  // Import: a messy upload with renamed headers
  await page.getByRole("button", { name: "Import another file" }).click()
  await page.getByRole("radio", { name: /Students/ }).click()
  await page.locator('input[type="file"]').setInputFiles({ name: "advisor-export.csv", mimeType: "text/csv", buffer: Buffer.from(MESSY_STUDENTS) })
  await expect(page.getByText("Known alternative name").first()).toBeVisible()
  await shot(page, "import-columns-renamed", { tall: true })
  await page.getByRole("button", { name: "Continue to review" }).click()
  await page.getByRole("button", { name: /^Review row 3/ }).click()
  await expect(page.getByRole("dialog", { name: /Row 3/ })).toBeVisible()
  await shot(page, "import-row-problems")
  await page.keyboard.press("Escape")

  // Small screens
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/")
  // The cards, with Sort by above them, rather than the tiles at the top of the page.
  await page.getByRole("combobox", { name: "Sort by" }).scrollIntoViewIfNeeded()
  await page.evaluate(() => window.scrollBy(0, -16))
  await shot(page, "mobile-queue")
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.getByRole("button", { name: "Open navigation" }).click()
  await shot(page, "mobile-nav")
  await page.keyboard.press("Escape")
  await page.goto("/students/S1002")
  await shot(page, "mobile-student")
  await page.setViewportSize({ width: 1024, height: 768 })
  await page.goto("/students/S1002")
  await page.getByRole("region", { name: "Before you reach out" }).scrollIntoViewIfNeeded()
  await shot(page, "tablet-student")

  await context.close()
  await reloadSampleData(request)
  expect(errors, "browser errors during the walkthrough").toEqual([])
})
