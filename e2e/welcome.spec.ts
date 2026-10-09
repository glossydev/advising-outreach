import { expect, test } from "@playwright/test"

/* P4: the first-visit welcome dialog. Uses Playwright's plain `test`, so the dialog isn't pre-dismissed. */

test("greets a first-time visitor, and stays closed for the rest of the visit", async ({ page }) => {
  await page.goto("/")
  const dialog = page.getByRole("dialog", { name: "Welcome to Advising Outreach" })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText("Getting started")
  await dialog.getByRole("button", { name: "Get started" }).click()
  await expect(dialog).toBeHidden()

  await page.reload()
  await expect(page.getByRole("heading", { name: "Outreach Queue", exact: true })).toBeVisible()
  await expect(dialog).toBeHidden()
})

test("'Don't show this again' lasts beyond the visit, and the help button reopens it", async ({ browser }) => {
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto("/")
  const dialog = page.getByRole("dialog", { name: "Welcome to Advising Outreach" })
  await dialog.getByRole("checkbox", { name: "Don't show this again" }).check()
  await dialog.getByRole("button", { name: "Get started" }).click()
  await expect(dialog).toBeHidden()

  // A new tab has a new session; only the permanent setting can keep the dialog away.
  const second = await context.newPage()
  await second.goto("/students")
  await expect(second.getByRole("heading", { name: "Students", level: 1 })).toBeVisible()
  await expect(second.getByRole("dialog", { name: "Welcome to Advising Outreach" })).toBeHidden()

  await second.getByRole("button", { name: "About this app" }).click()
  await expect(second.getByRole("dialog", { name: "Welcome to Advising Outreach" })).toBeVisible()
  await context.close()
})
