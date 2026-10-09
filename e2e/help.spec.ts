import { expect, test } from "./fixtures"

test("the sidebar opens the help in a new tab", async ({ page, context }) => {
  await page.goto("/")
  const link = page.getByRole("link", { name: /Help & documentation/ })
  await expect(link).toHaveAttribute("target", "_blank")
  const [help] = await Promise.all([context.waitForEvent("page"), link.click()])
  await expect(help.getByRole("heading", { level: 1, name: "Advising Outreach help" })).toBeVisible()
})

test("contents link to each section, and every screenshot loads", async ({ page }) => {
  await page.goto("/help")
  const toc = page.getByRole("navigation", { name: "Help contents" })
  await toc.getByRole("link", { name: "Logging a contact", exact: true }).click()
  await expect(page).toHaveURL(/#logging-a-contact$/)
  await expect(page.getByRole("heading", { level: 2, name: "Logging a contact" })).toBeInViewport()

  const broken = await page.evaluate(async () => {
    const images = Array.from(document.images)
    images.forEach((img) => (img.loading = "eager"))
    await Promise.all(images.map((img) => (img.complete ? null : new Promise((done) => (img.onload = img.onerror = done)))))
    return images.filter((img) => img.naturalWidth === 0).map((img) => img.getAttribute("src"))
  })
  expect(broken).toEqual([])
})

test("search narrows the contents and the page to matching topics", async ({ page }) => {
  await page.goto("/help")
  const search = page.getByRole("searchbox", { name: "Search the help" })
  await page.keyboard.press("/")
  await expect(search).toBeFocused()

  await search.fill("social security")
  await expect(page.getByText(/\d+ topics? match/)).toBeVisible()
  const toc = page.getByRole("navigation", { name: "Help contents" })
  await expect(toc.getByRole("link", { name: "Social Security numbers" })).toBeVisible()
  await expect(toc.getByRole("link", { name: "Reading the queue" })).toHaveCount(0)
  await expect(page.locator("main mark").first()).toBeVisible()

  await search.fill("zzzz")
  await expect(page.getByText("No topics match")).toBeVisible()
  await page.getByRole("button", { name: "Clear the search" }).first().click()
  await expect(toc.getByRole("link", { name: "Reading the queue" })).toBeVisible()
})
