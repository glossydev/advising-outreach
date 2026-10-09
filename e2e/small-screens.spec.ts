import { expect, reloadSampleData, test } from "./fixtures"

/*
 * The phone layouts: lists become cards with a "Sort by" control, panels take the full width, and
 * the column matches stack. responsive.spec.ts checks that nothing overflows; this checks the
 * layouts work.
 */

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

test.beforeAll(async ({ request }) => {
  await reloadSampleData(request)
})

test("the queue is a list of cards, sortable from a menu", async ({ page }) => {
  await page.goto("/")
  await expect(page.locator("table")).toBeHidden()
  // Direct children only: each card's reason chips are a list of their own.
  const cards = page.getByRole("list", { name: "Students ranked for outreach" }).locator(":scope > li")
  await expect(cards).toHaveCount(50)
  await expect(cards.first()).toContainText("Rank 1")
  await expect(cards.first()).toContainText("Mateo Alvarez")
  await expect(cards.first()).toContainText("Never contacted")
  await expect(cards.first()).toContainText("High risk flag")

  await page.getByRole("combobox", { name: "Sort by" }).click()
  await page.getByRole("option", { name: "Name" }).click()
  await expect(page).toHaveURL(/sort=name/)
  await expect(cards.first()).toContainText("Fatima Al-Sayed")
  await page.getByRole("button", { name: /Reverse the order/ }).click()
  await expect(page).toHaveURL(/dir=desc/)
  await expect(cards.first()).toContainText("Henry Zhao")
})

test("Log contact from a card opens a full-width panel", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("button", { name: "Log contact for Mateo Alvarez" }).click()
  const panel = page.getByRole("dialog", { name: "Log contact" })
  await expect(panel).toBeVisible()
  expect((await panel.boundingBox())?.width).toBeCloseTo(390, 0)
})

test("the Students list is cards that open the student", async ({ page }) => {
  await page.goto("/students?q=okonkwo")
  const cards = page.getByRole("list", { name: "Students" }).locator(":scope > li")
  await expect(cards).toHaveCount(2)
  await expect(cards.first()).toContainText("Possibly the same person as S1050 Gracie Okonkwo")
  await cards.first().getByRole("link").click()
  await expect(page).toHaveURL(/\/students\/S1021$/)
})

test("the column matches stack, each with its own labels", async ({ page }) => {
  await page.goto("/import")
  await page.getByRole("button", { name: "Use the sample students.csv" }).click()
  const matches = page.getByRole("list", { name: /How the file's columns were matched/ })
  await expect(matches.getByText("How it was matched").first()).toBeVisible()
  await expect(matches.getByText("Sample values").first()).toBeVisible()
})
