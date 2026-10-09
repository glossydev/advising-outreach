import { SSN_PATTERN, expect, reloadSampleData, test } from "./fixtures"

/* Required: open a student's detail. Plus the data decisions it surfaces. */

test.beforeAll(async ({ request }) => {
  await reloadSampleData(request)
})

test("opens from the directory and shows the student, their history and why they rank", async ({ page }) => {
  await page.goto("/students?q=Whitfield")
  await page.locator("table tbody tr").first().click()
  await expect(page).toHaveURL(/\/students\/S1002$/)
  await expect(page.getByRole("heading", { name: "Jordan Whitfield", level: 1 })).toBeVisible()

  const timeline = page.getByRole("region", { name: "Contact timeline" })
  await expect(timeline.getByRole("listitem")).toHaveCount(3)
  await expect(page.getByRole("region", { name: "Outreach priority" })).toContainText("Waiting on a reply since Jun 2")
  // D19: the phone-only preference from note N001 is on the record.
  await expect(page.getByRole("region", { name: "Before you reach out" })).toContainText("Contact by phone only")
})

test("keeps a sensitive note collapsed until someone chooses to read it (D18), with no SSN (D17)", async ({ page }) => {
  await page.goto("/students/S1037")
  const timeline = page.getByRole("region", { name: "Contact timeline" })
  await expect(timeline).toContainText("Sensitive note: hidden")
  await expect(timeline).not.toContainText("counselor")
  await expect(timeline).toContainText("Follow up by Oct 15, 2026")

  await timeline.getByRole("button", { name: "Show note" }).click()
  await expect(timeline).toContainText("counselor")
  await expect(timeline).toContainText("[SSN removed]")
  expect(await page.locator("body").innerText()).not.toMatch(SSN_PATTERN)
})

test("flags a possible duplicate on both students' pages (D15)", async ({ page }) => {
  await page.goto("/students/S1021")
  await expect(page.getByRole("note")).toContainText("Possibly the same person as Gracie Okonkwo (S1050)")
  await page.getByRole("link", { name: "Gracie Okonkwo (S1050)" }).click()
  await expect(page).toHaveURL(/\/students\/S1050$/)
  await expect(page.getByRole("note")).toContainText("Grace Okonkwo (S1021)")
})

test("shows what the import changed in the student's data", async ({ page }) => {
  await page.goto("/students/S1003")
  await expect(page.getByRole("region", { name: "Data notes" })).toContainText('Last contact date: "Aug 25, 2026" → "2026-08-25"')
})

test("says so when a student doesn't exist", async ({ page }) => {
  await page.goto("/students/S9999")
  await expect(page.getByText("Student not found")).toBeVisible()
})
