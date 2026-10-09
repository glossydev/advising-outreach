import { mkdirSync } from "node:fs"
import path from "node:path"
import { expect, test, type Browser, type Page } from "@playwright/test"
import { reloadSampleData, WELCOME_KEY } from "./fixtures"

/*
 * Every page and dialog at phone, tablet and in-between widths, including one pixel either side of
 * each layout breakpoint (sm 640, md 768, lg 1024, xl 1280). Fails on layout faults a person would
 * notice: the page scrolling sideways, something running off the screen, or text spilling out of a
 * button or badge. Tables that scroll sideways inside their own box are allowed.
 *
 *   npm run test:e2e         a few key widths, as part of the e2e run
 *   npm run test:responsive  every width, with a screenshot of each in test-results/responsive-screens/
 */

const SHOTS_DIR = path.join("test-results", "responsive-screens")

const ALL_VIEWPORTS = [
  { width: 320, height: 568 }, // smallest phones (iPhone SE 1st gen)
  { width: 360, height: 740 }, // common Android
  { width: 390, height: 844 }, // iPhone 14
  { width: 430, height: 932 }, // large phones
  { width: 540, height: 720 }, // foldables, small landscape
  { width: 639, height: 900 }, // just below sm
  { width: 640, height: 900 }, // sm
  { width: 767, height: 1024 }, // just below md: still the phone layout
  { width: 768, height: 1024 }, // md: sidebar appears (iPad mini portrait)
  { width: 820, height: 1180 }, // iPad Air portrait
  { width: 912, height: 1368 }, // Surface Pro portrait
  { width: 1023, height: 768 }, // just below lg
  { width: 1024, height: 768 }, // lg (iPad landscape)
  { width: 1180, height: 820 }, // iPad Air landscape
  { width: 1279, height: 800 }, // just below xl
]
const KEY_WIDTHS = [320, 768, 1024]

/** Layout faults on the current screen, in words. */
async function layoutProblems(page: Page): Promise<string[]> {
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running"))
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth
    const problems = new Set<string>()
    if (document.documentElement.scrollWidth > vw + 1) {
      problems.add(`the page scrolls sideways (${document.documentElement.scrollWidth}px wide in ${vw}px)`)
    }
    const describe = (el: Element) => {
      const slot = el.getAttribute("data-slot")
      const label = el.getAttribute("aria-label")
      const text = (label ?? el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 50)
      return `<${el.tagName.toLowerCase()}${slot ? ` ${slot}` : ""}> "${text}"`
    }
    // Inside a box that scrolls or clips sideways (a wide table, a truncated cell), running past the
    // screen edge is by design. Follows the containing blocks as the browser does: an absolutely
    // positioned element (such as screen-reader-only text) isn't clipped by a scroll box between it
    // and its positioned ancestor, so it can stretch the page even from inside a table.
    const insideClippingBox = (el: Element) => {
      let mode = getComputedStyle(el).position
      if (mode === "fixed") return false
      for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) {
        const s = getComputedStyle(e)
        if (mode === "absolute" && s.position === "static") continue
        if (s.overflowX !== "visible") return true
        mode = s.position
        if (mode === "fixed") return false
      }
      return false
    }
    for (const el of document.querySelectorAll("body *")) {
      const style = getComputedStyle(el)
      if (style.visibility === "hidden" || style.display === "contents") continue
      const r = el.getBoundingClientRect()
      if (r.width === 0 && r.height === 0) continue
      // A panel or box that scrolls sideways (a sheet whose buttons are too wide, say) is a fault
      // unless what it scrolls is a table.
      if (
        (style.overflowX === "auto" || style.overflowX === "scroll") &&
        el.scrollWidth > el.clientWidth + 1 &&
        !el.querySelector("table")
      ) {
        problems.add(`scrolls sideways (${el.scrollWidth}px in ${el.clientWidth}px): ${describe(el)}`)
      }
      if ((r.right > vw + 1 || r.left < -1) && !insideClippingBox(el)) {
        problems.add(`off the screen (${Math.round(r.left)}–${Math.round(r.right)} of ${vw}): ${describe(el)}`)
      }
      if (
        el.matches("button, a, label, [data-slot=badge], [role=radio], [role=tab]") &&
        style.overflowX === "visible" &&
        el.scrollWidth > el.clientWidth + 2 &&
        el.clientWidth > 0
      ) {
        problems.add(`text spills out of its box (${el.scrollWidth}px in ${el.clientWidth}px): ${describe(el)}`)
      }
    }
    return [...problems].slice(0, 8)
  })
}

interface Scenario {
  name: string
  /** Opens the screen. The welcome dialog is already dismissed unless `firstVisit`. */
  open: (page: Page, width: number) => Promise<void>
  firstVisit?: boolean
  /** A dialog or panel over the page: the screenshot shows the screen, not the whole page. */
  overlay?: boolean
  /** Only check where this holds (for example, the phone menu only exists below md). */
  when?: (width: number) => boolean
}

const visit = (url: string) => async (page: Page) => {
  await page.goto(url)
  await page.waitForLoadState("networkidle")
}

const MESSY_STUDENTS = [
  "Student ID,First Name,Surname,Email,Program,Class Standing,credits,GPA,Advisor,Last Contacted,Risk,Notes",
  "S2001,Ana,Ruiz,ana.ruiz@example.edu,Biology,Junior,64,3.1,Reyes,Sep 30 2026,low,transfer student",
  "S2002,Ben,Ortiz,ben.ortiz@example,Chemistry,Junior,48,4.3,Okafor,03/04/2026,Severe,",
].join("\n")

async function openLogContact(page: Page, studentId: string) {
  await page.goto(`/students/${studentId}`)
  await page.getByRole("button", { name: "Log contact" }).first().click()
  await expect(page.getByRole("dialog", { name: "Log contact" })).toBeVisible()
}

const SCENARIOS: Scenario[] = [
  { name: "queue", open: visit("/") },
  { name: "queue sorted by follow-up", open: visit("/?sort=follow_up") },
  { name: "students", open: visit("/students") },
  { name: "students filtered", open: visit("/students?risk=High&last_contact=30") },
  { name: "student with preference", open: visit("/students/S1002") },
  { name: "student with sensitive note and follow-up", open: visit("/students/S1037") },
  { name: "student with duplicate banner", open: visit("/students/S1021") },
  { name: "student never contacted", open: visit("/students/S1018") },
  { name: "student not found", open: visit("/students/S9999") },
  { name: "import", open: visit("/import") },
  { name: "data quality", open: visit("/data-quality") },
  { name: "help", open: visit("/help") },
  {
    name: "welcome dialog",
    firstVisit: true,
    overlay: true,
    open: async (page) => {
      await visit("/")(page)
      // It opens at the top, title showing, even where it's taller than the screen.
      await expect(page.getByRole("heading", { name: "Welcome to Advising Outreach" })).toBeInViewport()
    },
  },
  {
    name: "phone menu",
    overlay: true,
    when: (w) => w < 768,
    open: async (page) => {
      await visit("/")(page)
      await page.getByRole("button", { name: "Open navigation" }).click()
      await expect(page.getByRole("dialog")).toBeVisible()
    },
  },
  {
    name: "student search",
    overlay: true,
    open: async (page) => {
      await visit("/")(page)
      await page.getByRole("button", { name: /Search students/ }).click()
      await page.getByPlaceholder("Name, student ID, or email…").fill("okonkwo")
    },
  },
  {
    name: "log contact with follow-up and preference",
    overlay: true,
    open: async (page) => {
      await openLogContact(page, "S1037")
      await page.getByRole("dialog", { name: "Log contact" }).getByRole("textbox", { name: /^Note/ }).fill("Student prefers texts for reminders.")
    },
  },
  {
    name: "log contact errors",
    overlay: true,
    open: async (page) => {
      await openLogContact(page, "S1002")
      await page.getByRole("dialog", { name: "Log contact" }).getByRole("button", { name: "Save contact" }).click()
      await expect(page.getByText("Write what was discussed.")).toBeVisible()
    },
  },
  {
    name: "discard confirm",
    overlay: true,
    open: async (page) => {
      await openLogContact(page, "S1001")
      await page.getByRole("dialog", { name: "Log contact" }).getByRole("textbox", { name: /^Note/ }).fill("Draft")
      await page.getByRole("button", { name: "Cancel" }).click()
      await expect(page.getByRole("alertdialog")).toBeVisible()
    },
  },
  {
    name: "preference editor",
    overlay: true,
    open: async (page) => {
      await visit("/students/S1002")(page)
      await page.getByRole("button", { name: "Edit contact preference" }).click()
      await expect(page.getByRole("dialog", { name: "Contact preference" })).toBeVisible()
    },
  },
  {
    name: "import columns, renamed headers",
    open: async (page) => {
      await visit("/import")(page)
      await page.getByRole("radio", { name: /Students/ }).click()
      await page.locator('input[type="file"]').setInputFiles({ name: "advisor-export.csv", mimeType: "text/csv", buffer: Buffer.from(MESSY_STUDENTS) })
      await expect(page.getByText("Known alternative name").first()).toBeVisible()
    },
  },
  {
    name: "import review",
    open: async (page) => {
      await visit("/import")(page)
      await page.getByRole("button", { name: "Use the sample contact_notes.csv" }).click()
      await page.getByRole("button", { name: "Continue to review" }).click()
      await expect(page.getByRole("button", { name: /^Review row 42/ })).toBeVisible()
    },
  },
  {
    name: "import row editor",
    overlay: true,
    open: async (page) => {
      await visit("/import")(page)
      await page.getByRole("button", { name: "Use the sample contact_notes.csv" }).click()
      await page.getByRole("button", { name: "Continue to review" }).click()
      await page.getByRole("button", { name: /^Review row 42/ }).click()
      await expect(page.getByRole("dialog", { name: /Row 42/ })).toBeVisible()
    },
  },
  {
    name: "data quality rule open",
    open: async (page) => {
      await visit("/data-quality")(page)
      await page.getByRole("button", { name: /Social Security number in a note/ }).click()
    },
  },
  {
    name: "help search and contents",
    open: async (page, width) => {
      await visit("/help")(page)
      await page.getByRole("searchbox", { name: "Search the help" }).fill("follow-up")
      if (width < 1024) await page.getByRole("button", { name: "Contents" }).click()
    },
  },
]

async function newPage(browser: Browser, viewport: { width: number; height: number }, firstVisit = false) {
  const touch = viewport.width < 1024
  const context = await browser.newContext({ viewport, isMobile: touch, hasTouch: touch, deviceScaleFactor: touch ? 2 : 1 })
  if (!firstVisit) await context.addInitScript((key) => window.localStorage.setItem(key, "1"), WELCOME_KEY)
  return { context, page: await context.newPage() }
}

test.beforeAll(async ({ request }) => {
  await reloadSampleData(request)
})

for (const scenario of SCENARIOS) {
  test(`fits every screen: ${scenario.name}`, async ({ browser }) => {
    const full = test.info().project.name === "responsive"
    test.setTimeout(full ? 240_000 : 60_000)
    const viewports = full ? ALL_VIEWPORTS : ALL_VIEWPORTS.filter((v) => KEY_WIDTHS.includes(v.width))
    const found: string[] = []
    for (const viewport of viewports) {
      if (scenario.when && !scenario.when(viewport.width)) continue
      const { context, page } = await newPage(browser, viewport, scenario.firstVisit)
      try {
        await scenario.open(page, viewport.width)
        for (const p of await layoutProblems(page)) found.push(`${viewport.width}px: ${p}`)
        if (full) {
          const dir = path.join(SHOTS_DIR, scenario.name.replace(/[^a-z0-9]+/gi, "-"))
          mkdirSync(dir, { recursive: true })
          await page.screenshot({
            path: path.join(dir, `${String(viewport.width).padStart(4, "0")}.png`),
            fullPage: !scenario.overlay,
            scale: "css",
          })
        }
      } finally {
        await context.close()
      }
    }
    expect(found, scenario.name).toEqual([])
  })
}
