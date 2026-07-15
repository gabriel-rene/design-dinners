import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  // The admin suite mutates the shared local Supabase DB (create/delete rows)
  // while the landing suite asserts the exact seeded state. A single worker
  // serializes tests so those never interleave; each admin test also restores
  // the seeded baseline before it finishes.
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
