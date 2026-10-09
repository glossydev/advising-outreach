import { expect, reloadSampleData, test } from "./fixtures"

/* Required: list, search and filter students. */

test.beforeAll(async ({ request }) => {
  await reloadSampleData(request)
})

test("lists every student, 25 to a page", async ({ page }) => {
  await page.goto("/students")
  await expect(page.getByRole("heading", { name: "Students", level: 1 })).toBeVisible()
  await expect(page.locator("table tbody tr")).toHaveCount(25)
  await expect(page.getByText("50 of 50 students")).toBeVisible()
  await page.getByRole("link", { name: "Next page" }).click()
  await expect(page).toHaveURL(/page=2/)
  await expect(page.locator("table tbody tr")).toHaveCount(25)
})

test("searches by name, ID or email", async ({ page }) => {
  await page.goto("/students")
  await page.getByRole("searchbox", { name: "Search" }).fill("okonkwo")
  await expect(page).toHaveURL(/q=okonkwo/)
  const rows = page.locator("table tbody tr")
  await expect(rows).toHaveCount(2)
  await expect(rows.nth(0)).toContainText("Okonkwo, Grace")
  await expect(rows.nth(1)).toContainText("Okonkwo, Gracie")

  await page.getByRole("searchbox", { name: "Search" }).fill("S1037")
  await expect(rows).toHaveCount(1)
  await expect(rows.first()).toContainText("Vargas, Camila")
})

test("filters by risk flag and by never contacted", async ({ page }) => {
  await page.goto("/students")
  await page.getByRole("combobox", { name: "Risk flag" }).click()
  await page.getByRole("option", { name: "High" }).click()
  await page.keyboard.press("Escape")
  await expect(page).toHaveURL(/risk=High/)
  await expect(page.locator("table tbody tr")).toHaveCount(10)
  await expect(page.getByText("10 of 50 students")).toBeVisible()

  await page.getByRole("combobox", { name: "Last contact" }).click()
  await page.getByRole("option", { name: "Never contacted" }).click()
  await expect(page.locator("table tbody tr")).toHaveCount(1) // S1018: High risk and never contacted

  await page.getByRole("button", { name: "Clear filters" }).click()
  await expect(page.getByText("50 of 50 students")).toBeVisible()
})

test("shows a friendly message when nothing matches", async ({ page }) => {
  await page.goto("/students?q=nobody-by-this-name")
  await expect(page.getByText("No students match these filters")).toBeVisible()
})

test("finds a student from anywhere with Ctrl+K", async ({ page }) => {
  await page.goto("/data-quality")
  const input = page.getByPlaceholder("Name, student ID, or email…")
  // The shortcut works once the page's scripts have loaded; retry until then.
  await expect(async () => {
    await page.keyboard.press("Control+k")
    await expect(input).toBeVisible({ timeout: 1000 })
  }).toPass({ timeout: 10_000 })
  await input.fill("Whitfield")
  await page.getByRole("option", { name: /Jordan Whitfield/ }).click()
  await expect(page).toHaveURL(/\/students\/S1002$/)
})
