import { expect, reloadSampleData, test } from "./fixtures"

/* Required: the "smart" feature, the ranked outreach queue. */

test.beforeAll(async ({ request }) => {
  await reloadSampleData(request)
})

test("ranks never-contacted students first, then by score, with reasons", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByRole("heading", { name: "Outreach Queue", exact: true })).toBeVisible()

  const rows = page.locator("table tbody tr")
  await expect(rows).toHaveCount(50)
  // D24: the three students with no contact on record lead, S1018 (High risk) first.
  for (const [i, id] of ["S1018", "S1006", "S1040"].entries()) {
    await expect(rows.nth(i)).toContainText(id)
    await expect(rows.nth(i)).toContainText("Never contacted")
  }
  // Then the highest scores, each with its reasons.
  await expect(rows.nth(3)).toContainText("90")
  await expect(rows.nth(3)).toContainText("High risk flag")
})

test("summarizes the caseload in four tiles", async ({ page }) => {
  await page.goto("/")
  const tiles = page.getByLabel("Outreach summary")
  await expect(tiles).toContainText("Students assigned50")
  await expect(tiles).toContainText("Overdue29")
  await expect(tiles).toContainText("High risk10")
  await expect(tiles).toContainText("Contacted this week2")
})

test("filters the queue by risk and narrows to one advisor's caseload", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("combobox", { name: "Risk flag" }).click()
  await page.getByRole("option", { name: "High" }).click()
  await page.keyboard.press("Escape")
  await expect(page).toHaveURL(/risk=High/)
  const rows = page.locator("table tbody tr")
  await expect(rows).toHaveCount(10)
  for (const row of await rows.all()) await expect(row).toContainText("High")

  await page.goto("/?risk=High&min_days=90")
  await expect(rows.first()).toContainText("Never contacted")
})

test("opens the log-contact panel straight from the queue", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("button", { name: "Log contact for Mateo Alvarez" }).click()
  await expect(page.getByRole("dialog", { name: "Log contact" })).toBeVisible()
  await expect(page.getByRole("dialog")).toContainText("S1018")
})
