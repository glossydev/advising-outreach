import { SSN_PATTERN, expect, reloadSampleData, test } from "./fixtures"

/* The interactive import (docs/IMPORT_DESIGN.md), end to end through the page. */

const MESSY_STUDENTS = [
  "Student ID,First Name,Surname,Email,Program,Class Standing,credits,GPA,Advisor,Last Contacted,Risk",
  "S2001,Ana,Ruiz,ana.ruiz@example.edu,Biology,Junior,64,3.1,Reyes,Sep 30 2026,low",
  "S2002,Ben,Ortiz,ben.ortiz@example,Chemistry,Junior,48,4.3,Okafor,03/04/2026,Severe",
].join("\n")

test.afterAll(async ({ request }) => {
  await reloadSampleData(request)
})

test("imports the sample files into an empty database, fixing what the rules flag", async ({ page, request }) => {
  await page.goto("/import")
  await page.getByRole("button", { name: "Reset the database to empty" }).click()
  await page.getByRole("button", { name: "Empty the database" }).click()
  await expect(page.getByText("In the database now: 0 students, 0 notes.")).toBeVisible()

  // Students
  await page.getByRole("button", { name: "Use the sample students.csv" }).click()
  await expect(page.getByText("All 11 columns matched exactly")).toBeVisible()
  await page.getByRole("button", { name: "Continue to review" }).click()
  const summary = page.getByLabel("Review summary")
  await expect(summary).toContainText("Rows with blocking issues9")
  await expect(page.getByRole("button", { name: /^Import \d+ rows?$/ })).toBeDisabled()
  await page.getByRole("button", { name: "Accept all suggested fixes" }).click()
  await expect(summary).toContainText("Rows with blocking issues0")
  await page.getByRole("button", { name: "Import 50 rows" }).click()
  await page.getByRole("alertdialog").getByRole("button", { name: "Import" }).click()
  await expect(page.getByText("Students: 50 added")).toBeVisible()

  // Notes, including N041's SSN, which must never be shown
  await page.getByRole("button", { name: "Import another file" }).click()
  await page.getByRole("button", { name: "Use the sample contact_notes.csv" }).click()
  await page.getByRole("button", { name: "Continue to review" }).click()
  await expect(summary).toContainText("Rows with blocking issues12")
  await page.getByRole("button", { name: /^Review row 42/ }).click()
  const editor = page.getByRole("dialog", { name: /Row 42/ })
  await expect(editor).toContainText("Social Security number in a note")
  await expect(editor).toContainText("Sensitive note")
  expect(await page.locator("body").innerText()).not.toMatch(SSN_PATTERN)
  await page.keyboard.press("Escape")
  await page.getByRole("button", { name: "Accept all suggested fixes" }).click()
  await page.getByRole("button", { name: "Import 57 rows" }).click()
  await page.getByRole("alertdialog").getByRole("button", { name: "Import" }).click()
  await expect(page.getByText("Contact notes: 57 added")).toBeVisible()

  const health = await (await request.get("/api/health")).json()
  expect(health).toMatchObject({ students: 50, notes: 57 })
})

test("matches renamed columns and stops on problems it can't fix", async ({ page }) => {
  await page.goto("/import")
  await page.getByRole("radio", { name: /Students/ }).click()
  await page.locator('input[type="file"]').setInputFiles({ name: "messy.csv", mimeType: "text/csv", buffer: Buffer.from(MESSY_STUDENTS) })

  // P2: every non-exact match is flagged with its reason.
  await expect(page.getByText("Known alternative name")).toHaveCount(6)
  await expect(page.getByText("Same name, different formatting")).toHaveCount(5)
  await page.getByRole("button", { name: "Continue to review" }).click()

  await expect(page.getByLabel("Review summary")).toContainText("Rows with blocking issues2")
  await page.getByRole("button", { name: /^Review row 3/ }).click()
  const editor = page.getByRole("dialog", { name: /Row 3/ })
  await expect(editor).toContainText('"03/04/2026" could be Mar 4, 2026 or Apr 3, 2026.')
  await expect(editor).toContainText('"Severe" isn\'t one of the allowed values')
  await expect(editor).toContainText("GPA 4.3 is outside 0.0–4.0.")
  await editor.getByRole("button", { name: "Leave this row out" }).click()
  await page.keyboard.press("Escape")

  await page.getByRole("button", { name: "Accept all suggested fixes" }).click()
  await expect(page.getByRole("button", { name: "Import 1 row" })).toBeEnabled()
})
