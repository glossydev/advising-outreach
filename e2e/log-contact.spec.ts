import { expect, reloadSampleData, test } from "./fixtures"

/* Required: log a new contact note, and see it appear. */

test.beforeEach(async ({ request }) => {
  await reloadSampleData(request)
})

test("logs a contact; it appears in the timeline and the score updates", async ({ page }) => {
  await page.goto("/students/S1002")
  await expect(page.getByRole("region", { name: "Outreach priority" })).toContainText("90")

  await page.getByRole("button", { name: "Log contact" }).first().click()
  const form = page.getByRole("dialog", { name: "Log contact" })
  await expect(form.getByRole("combobox", { name: "Contact type" })).toHaveText(/Phone/) // his stated preference (D19)
  await form.getByRole("textbox", { name: /^Note/ }).fill("Called as requested. Set up tutoring for Accounting II.")
  await form.getByRole("button", { name: "Save contact" }).click()

  await expect(page.getByText("Contact logged for Jordan Whitfield")).toBeVisible()
  const timeline = page.getByRole("region", { name: "Contact timeline" })
  await expect(timeline.getByRole("listitem").first()).toContainText("Called as requested")
  await expect(timeline.getByRole("listitem").first()).toContainText("N058")
  await expect(page.getByRole("region", { name: "Outreach priority" })).toContainText("40")
})

test("refuses a Social Security number and says why (D17)", async ({ page }) => {
  await page.goto("/students/S1037")
  await page.getByRole("button", { name: "Log contact" }).first().click()
  const form = page.getByRole("dialog", { name: "Log contact" })
  await form.getByRole("textbox", { name: /^Note/ }).fill("Helped with the FAFSA form; her SSN is 123-45-6789.")
  await form.getByRole("button", { name: "Save contact" }).click()
  await expect(form.getByText("This looks like a Social Security number")).toBeVisible()
  await expect(page.getByText("Contact logged")).toHaveCount(0)
})

test("warns when the channel goes against the student's stated preference (D19)", async ({ page }) => {
  await page.goto("/students/S1002")
  await page.getByRole("button", { name: "Log contact" }).first().click()
  const form = page.getByRole("dialog", { name: "Log contact" })
  await form.getByRole("combobox", { name: "Contact type" }).click()
  await page.getByRole("option", { name: "Email" }).click()
  await expect(form.getByRole("status")).toContainText("asked to be contacted by phone only")
})

test("suggests marking a note sensitive when it mentions sensitive topics (D18)", async ({ page }) => {
  await page.goto("/students/S1001")
  await page.getByRole("button", { name: "Log contact" }).first().click()
  const form = page.getByRole("dialog", { name: "Log contact" })
  await form.getByRole("textbox", { name: /^Note/ }).fill("Mentioned she is seeing a counselor for anxiety.")
  await expect(form.getByText("Consider marking it sensitive")).toBeVisible()
})

test("asks before discarding a half-written note", async ({ page }) => {
  await page.goto("/students/S1001")
  await page.getByRole("button", { name: "Log contact" }).first().click()
  await page.getByRole("dialog", { name: "Log contact" }).getByRole("textbox", { name: /^Note/ }).fill("Draft")
  await page.getByRole("button", { name: "Cancel" }).click()
  await expect(page.getByRole("alertdialog", { name: "Discard this contact?" })).toBeVisible()
  await page.getByRole("button", { name: "Discard" }).click()
  await expect(page.getByRole("dialog", { name: "Log contact" })).toHaveCount(0)
})
