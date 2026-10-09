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
    // No follow-up: a dash, read out as "None".
    await expect(rows.nth(i).locator("td").nth(4)).toHaveText("—None")
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

test("sorts by rank, student, risk, last contact, follow-up or score, and each row keeps its rank", async ({ page }) => {
  await page.goto("/")
  const rows = page.locator("table tbody tr")
  const rankOf = async (i: number) => (await rows.nth(i).locator("td").first().innerText()).trim()

  await page.getByRole("button", { name: /^Student\. Sort ascending/ }).click()
  await expect(page).toHaveURL(/sort=name/)
  await expect(rows.first()).toContainText("Fatima Al-Sayed")
  expect(await rankOf(0)).not.toBe("1")
  await expect(page.getByRole("columnheader", { name: /Student/ })).toHaveAttribute("aria-sort", "ascending")

  await page.getByRole("button", { name: /^Score\. Sort descending/ }).click()
  await expect(page).toHaveURL(/sort=score/)
  await expect(rows.first()).toContainText("90")

  await page.getByRole("button", { name: /^Follow-up\. Sort ascending/ }).click()
  await expect(rows.first()).toContainText("Camila Vargas")
  await expect(rows.first()).toContainText("Due in 10 days")

  await page.getByRole("button", { name: /^Rank\. Sort ascending/ }).click()
  await expect(page).not.toHaveURL(/sort=/)
  expect(await rankOf(0)).toBe("1")
  await expect(rows.first()).toContainText("S1018")
})

test("puts a student whose follow-up is due today at the very top (P8)", async ({ page, request }) => {
  const response = await request.post("/api/students/S1001/notes", {
    data: {
      contact_date: "2026-09-28",
      contact_type: "Email",
      advisor: "Okafor",
      note_text: "Will check in on the transfer credit next week.",
      follow_up_date: "2026-10-05",
    },
  })
  expect(response.status()).toBe(201)
  await page.goto("/")
  const first = page.locator("table tbody tr").first()
  await expect(first).toContainText("Maya Patel")
  await expect(first).toContainText("Due today")
  await expect(first).toContainText("Follow-up due today")
  await reloadSampleData(request)
})
