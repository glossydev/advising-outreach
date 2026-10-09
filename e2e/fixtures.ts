import { test as base, expect, type APIRequestContext } from "@playwright/test"

export const WELCOME_KEY = "advising-outreach.welcome-dismissed"

/**
 * The standard test: the welcome dialog is marked as seen, so it doesn't cover the page.
 * welcome.spec.ts uses Playwright's own `test` to see the first-visit experience.
 */
export const test = base.extend({
  // Playwright calls this callback `use`; named otherwise so the React hooks lint rule doesn't mistake it for a hook.
  page: async ({ page }, provide) => {
    await page.addInitScript((key) => {
      try {
        window.localStorage.setItem(key, "1")
      } catch {
        // storage blocked: the dialog would show; tests that care will fail loudly
      }
    }, WELCOME_KEY)
    await provide(page)
  },
})

export { expect }

/** Back to the known starting point: the sample files, every suggested fix accepted. */
export async function reloadSampleData(request: APIRequestContext) {
  const response = await request.post("/api/prototype/reload-sample")
  expect(response.ok()).toBe(true)
}

export const SSN_PATTERN = /\b\d{3}-\d{2}-\d{4}\b/
