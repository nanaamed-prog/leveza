import { defineConfig, devices } from "@playwright/test";

// CHROMIUM_PATH permite usar um Chromium já instalado (ex.: ambientes sem acesso ao CDN do Playwright).
const executablePath = process.env.CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    trace: "retain-on-failure",
    launchOptions: executablePath ? { executablePath, args: ["--no-sandbox"] } : undefined,
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run start",
        url: "http://localhost:3000",
        reuseExistingServer: true,
        timeout: 120_000,
      },
  projects: [
    {
      name: "mobile-360",
      use: {
        ...devices["Galaxy S9+"],
        browserName: "chromium",
        viewport: { width: 360, height: 780 },
      },
    },
    {
      name: "mobile-430",
      use: {
        ...devices["Pixel 7"],
        browserName: "chromium",
        viewport: { width: 430, height: 900 },
      },
    },
  ],
});
