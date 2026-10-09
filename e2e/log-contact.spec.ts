import type { Locator } from "@playwright/test"
import { expect, reloadSampleData, test } from "./fixtures"

/* Required: log a new contact note, and see it appear. */

test.beforeEach(async ({ request }) => {
  await reloadSampleData(request)
})

async function chooseType(form: Locator, type: string) {
  await form.getByRole("combobox", { name: "Contact type" }).click()
  await form.page().getByRole("option", { name: type, exact: true }).click()
}

test("logs a contact; it appears in the timeline and the score updates", async ({ page }) => {
  await page.goto("/students/S1002")
  await expect(page.getByRole("region", { name: "Outreach priority" })).toContainText("90")

  await page.getByRole("button", { name: "Log contact" }).first().click()
  const form = page.getByRole("dialog", { name: "Log contact" })
  await form.getByRole("textbox", { name: /^Note/ }).fill("Called as requested. Set up tutoring for Accounting II.")
  // The contact type records how this contact happened, so nothing is chosen for the advisor (P6).
  await form.getByRole("button", { name: "Save contact" }).click()
  await expect(form.getByText("Choose how you made contact.")).toBeVisible()
  await chooseType(form, "Phone")
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
  await chooseType(form, "In person")
  await form.getByRole("textbox", { name: /^Note/ }).fill("Helped with the FAFSA form; her SSN is 123-45-6789.")
  await form.getByRole("button", { name: "Save contact" }).click()
  await expect(form.getByText("This looks like a Social Security number")).toBeVisible()
  await expect(page.getByText("Contact logged")).toHaveCount(0)
})

test("shows the student's contact preference without choosing the contact type (D19, P6)", async ({ page }) => {
  await page.goto("/students/S1002")
  await page.getByRole("button", { name: "Log contact" }).first().click()
  const form = page.getByRole("dialog", { name: "Log contact" })
  await expect(form).toContainText("Contact preference: Phone only.")
  await expect(form.getByRole("combobox", { name: "Contact type" })).toHaveText(/How it happened/)
  // If the student emailed in, that's what happened: logging it as Email raises no warning.
  await chooseType(form, "Email")
  await expect(form.getByRole("status")).toHaveCount(0)
})

test("offers to save a preference the note states, and saves it only when ticked (P9)", async ({ page }) => {
  await page.goto("/students/S1001")
  await expect(page.getByRole("region", { name: "Before you reach out" })).not.toContainText("Prefers email")
  await page.getByRole("button", { name: "Log contact" }).first().click()
  const form = page.getByRole("dialog", { name: "Log contact" })
  await chooseType(form, "Email")
  await form.getByRole("textbox", { name: /^Note/ }).fill("Student prefers email from now on; checks it daily.")
  const save = form.getByRole("checkbox", { name: /Save as Maya's contact preference: Prefers email/ })
  await expect(save).not.toBeChecked()
  await save.check()
  await form.getByRole("button", { name: "Save contact" }).click()

  const card = page.getByRole("region", { name: "Before you reach out" })
  await expect(card).toContainText("Prefers email")
  await expect(card).toContainText("From note N058")
})

test("completes an open follow-up only when the advisor says so (P8)", async ({ page }) => {
  await page.goto("/students/S1037")
  const card = page.getByRole("region", { name: "Before you reach out" })
  await expect(card).toContainText("Follow-up Oct 15, 2026: due in 10 days.")

  await page.getByRole("button", { name: "Log contact" }).first().click()
  const form = page.getByRole("dialog", { name: "Log contact" })
  const completes = form.getByRole("checkbox", { name: /completes the follow-up due Oct 15, 2026 \(set in N041\)/ })
  // Ten days early: probably about something else, so it starts unticked.
  await expect(completes).not.toBeChecked()
  await completes.check()
  await chooseType(form, "In person")
  await form.getByRole("textbox", { name: /^Note/ }).fill("FAFSA verification submitted together.")
  await form.getByRole("button", { name: "Save contact" }).click()

  await expect(page.getByRole("region", { name: "Contact timeline" })).toContainText("Follow-up for Oct 15, 2026 done in N058")
  await expect(card).not.toContainText("Follow-up Oct 15")
})

test("keeps the note when the save request fails, and saves on retry", async ({ page }) => {
  await page.goto("/students/S1001")
  await page.getByRole("button", { name: "Log contact" }).first().click()
  const form = page.getByRole("dialog", { name: "Log contact" })
  await chooseType(form, "Phone")
  const note = form.getByRole("textbox", { name: /^Note/ })
  await note.fill("Discussed the spring schedule.")

  await page.route("**/api/students/*/notes", (route) => route.abort("internetdisconnected"))
  await form.getByRole("button", { name: "Save contact" }).click()
  await expect(form.getByRole("alert")).toContainText("Couldn't reach the server")
  await expect(note).toHaveValue("Discussed the spring schedule.")

  await page.unroute("**/api/students/*/notes")
  await form.getByRole("button", { name: "Save contact" }).click()
  await expect(page.getByText("Contact logged for Maya Patel")).toBeVisible()
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
