import { defineConfig, devices } from "@playwright/test"

/*
 * End-to-end tests and the help-documentation screenshots. Both run against a production build on
 * port 3100 with their own SQLite file (data/e2e.db), seeded fresh, so they never touch the data
 * you use locally. Tests run one at a time because several of them change data.
 *
 *   npm run test:e2e          build, then run the e2e project
 *   npm run docs:screenshots  build, then capture public/help/screens/*.png
 */

const PORT = 3100

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: Boolean(process.env.CI),
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1280, height: 800 },
    trace: "retain-on-failure",
  },
  projects: [
    // responsive.spec.ts runs in both: a few key widths here, every width in "responsive".
    { name: "e2e", testIgnore: /screenshots\.spec\.ts/ },
    { name: "docs", testMatch: /screenshots\.spec\.ts/ },
    { name: "responsive", testMatch: /responsive\.spec\.ts/ },
  ],
  webServer: {
    command: `npx tsx scripts/seed.ts && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { DATABASE_URL: "file:./data/e2e.db", ENABLE_PROTOTYPE_TOOLS: "true" },
  },
})
