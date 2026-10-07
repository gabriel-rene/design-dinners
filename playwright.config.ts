import { defineConfig, devices } from "@playwright/test";

// PORT lets a second worktree run e2e without reusing another dev server on 3000.
const port = Number(process.env.PORT) || 3000;

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
    baseURL: `http://localhost:${port}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
