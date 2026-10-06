import { defineConfig, devices } from "@playwright/test";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const testUrl = new URL(baseURL);
if (
  testUrl.protocol !== "http:" ||
  !["localhost", "127.0.0.1"].includes(testUrl.hostname)
)
  throw new Error("The browser test server must use a local HTTP origin.");
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: {
    baseURL,
    trace: "retain-on-failure",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm start --port ${testUrl.port || "3000"}`,
    url: baseURL,
    reuseExistingServer: false,
    env: { NODE_ENV: "production", BETTER_AUTH_URL: testUrl.origin },
    timeout: 60000,
  },
});
