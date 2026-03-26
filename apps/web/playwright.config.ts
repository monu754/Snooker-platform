import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/ui",
  timeout: 30_000,
  webServer: {
    command: "npm run dev",
    env: {
      ...process.env,
      MONGODB_URI: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/snooker-platform-playwright",
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || "playwright-test-secret",
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || "http://localhost:3000",
    },
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    stdout: "ignore",
    stderr: "pipe",
    timeout: 120_000,
  },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});
