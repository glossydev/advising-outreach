import AxeBuilder from "@axe-core/playwright"
import { test as plain, type Page } from "@playwright/test"
import { expect, reloadSampleData, test } from "./fixtures"

/*
 * axe on every page and every dialog state. Anything worse than "minor" fails the test; minor
 * findings are printed so they can be judged by a person.
 */

async function audit(page: Page, label: string) {
  // Measure the settled page: a panel still fading in would fail contrast checks it passes at rest.
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running"))
  const results = await new AxeBuilder({ page }).analyze()
  const minor = results.violations.filter((v) => v.impact === "minor")
  if (minor.length) console.log(`[${label}] minor: ${minor.map((v) => `${v.id} (${v.nodes.length})`).join(", ")}`)
  const serious = results.violations
    .filter((v) => v.impact !== "minor")
    .map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 3).map((n) => n.target.join(" ")) }))
  expect(serious, label).toEqual([])
}

test.beforeAll(async ({ request }) => {
  await reloadSampleData(request)
})

for (const [path, label] of [
  ["/", "outreach queue"],
  ["/students", "students"],
  ["/students?risk=High&last_contact=none", "students, filtered"],
  ["/students/S1002", "student with a contact preference"],
  ["/students/S1021", "student with a possible duplicate"],
  ["/students/S1018", "student never contacted"],
  ["/students/S9999", "student not found"],
  ["/import", "import"],
  ["/data-quality", "data quality"],
  ["/help", "help"],
] as const) {
  test(`page: ${label}`, async ({ page }) => {
    await page.goto(path)
    await audit(page, label)
  })
}

test("state: sensitive note revealed", async ({ page }) => {
  await page.goto("/students/S1037")
  await page.getByRole("button", { name: "Show note" }).click()
  await audit(page, "sensitive note revealed")
})

test("state: log-contact panel, with a warning showing", async ({ page }) => {
  await page.goto("/students/S1002")
  await page.getByRole("button", { name: "Log contact" }).first().click()
  const form = page.getByRole("dialog", { name: "Log contact" })
  await form.getByRole("combobox", { name: "Contact type" }).click()
  await page.getByRole("option", { name: "Email" }).click()
  await form.getByRole("button", { name: "Save contact" }).click() // empty note: shows a field error too
  await expect(form.getByText("Write what was discussed.")).toBeVisible()
  await audit(page, "log-contact panel")
})

test("state: Ctrl+K search", async ({ page }) => {
  await page.goto("/")
  const input = page.getByPlaceholder("Name, student ID, or email…")
  await expect(async () => {
    await page.keyboard.press("Control+k")
    await expect(input).toBeVisible({ timeout: 1000 })
  }).toPass({ timeout: 10_000 })
  await input.fill("ok")
  await audit(page, "Ctrl+K search")
})

test("state: import column step, review step and row editor", async ({ page }) => {
  await page.goto("/import")
  await page.getByRole("button", { name: "Use the sample contact_notes.csv" }).click()
  await expect(page.getByText("All 6 columns matched exactly")).toBeVisible()
  await audit(page, "import: columns")
  await page.getByRole("button", { name: "Continue to review" }).click()
  await audit(page, "import: review")
  await page.getByRole("button", { name: /^Review row 42/ }).click()
  await expect(page.getByRole("dialog", { name: /Row 42/ })).toBeVisible()
  await audit(page, "import: row editor")
})

test("state: data quality rule expanded", async ({ page }) => {
  await page.goto("/data-quality")
  await page.getByRole("button", { name: /Date not in YYYY-MM-DD format/ }).click()
  await audit(page, "data quality: rule expanded")
})

test("state: help search with results highlighted", async ({ page }) => {
  await page.goto("/help")
  await page.getByRole("searchbox", { name: "Search the help" }).fill("sensitive")
  await expect(page.getByText(/\d+ topics? match/)).toBeVisible()
  await audit(page, "help search")
})

test("state: help on a phone, contents open", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/help")
  await page.getByRole("button", { name: "Contents" }).click()
  await audit(page, "help on a phone")
})

plain("state: welcome dialog", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByRole("dialog", { name: "Welcome to Advising Outreach" })).toBeVisible()
  await audit(page, "welcome dialog")
})
