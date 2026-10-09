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
  // D19, P9: the phone-only preference from note N001 is on the record.
  const card = page.getByRole("region", { name: "Before you reach out" })
  await expect(card).toContainText("Phone only")
  await expect(card).toContainText("From note N001, Jan 22, 2026")
})

test("adds, edits and removes a contact preference (P9)", async ({ page }) => {
  await page.goto("/students/S1001")
  const card = page.getByRole("region", { name: "Before you reach out" })
  await card.getByRole("button", { name: "Add a contact preference" }).click()
  const editor = page.getByRole("dialog", { name: "Contact preference" })
  await editor.getByRole("button", { name: "Save" }).click()
  await expect(editor.getByText("Choose a channel or describe the preference.")).toBeVisible()

  await editor.getByRole("combobox", { name: "Preferred channel" }).click()
  await page.getByRole("option", { name: "Text" }).click()
  await editor.getByRole("checkbox", { name: "Only this way" }).check()
  await editor.getByRole("textbox", { name: /Details/ }).fill("After 5 pm on weekdays.")
  await editor.getByRole("button", { name: "Save" }).click()
  await expect(card).toContainText("Text only")
  await expect(card).toContainText("After 5 pm on weekdays.")
  await expect(card).toContainText("Entered on the student's page, Oct 5, 2026")

  await card.getByRole("button", { name: "Edit contact preference" }).click()
  await editor.getByRole("button", { name: "Remove preference" }).click()
  await expect(card).not.toContainText("Text only")
  await expect(card.getByRole("button", { name: "Add a contact preference" })).toBeVisible()
})

test("Back to returns to the list as it was, filters and sort included", async ({ page }) => {
  await page.goto("/students?q=okonkwo&risk=Medium")
  await page.locator("table tbody tr").first().click()
  await expect(page).toHaveURL(/\/students\/S1021$/)
  await page.getByRole("link", { name: "Back to Students" }).click()
  await expect(page).toHaveURL(/\/students\?q=okonkwo&risk=Medium$/)

  await page.goto("/?sort=name")
  await page.locator("table tbody tr").first().click()
  await page.getByRole("link", { name: "Back to Outreach Queue" }).click()
  await expect(page).toHaveURL(/\/\?sort=name$/)
})

test("keeps a sensitive note collapsed until someone chooses to read it (D18), with no SSN (D17)", async ({ page }) => {
  await page.goto("/students/S1037")
  const timeline = page.getByRole("region", { name: "Contact timeline" })
  await expect(timeline).toContainText("Sensitive note: hidden")
  await expect(timeline).not.toContainText("counselor")
  await expect(timeline).toContainText("Follow up by Oct 15, 2026")
  await expect(page.getByRole("region", { name: "Before you reach out" })).toContainText("Follow-up Oct 15, 2026: due in 10 days.")

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
