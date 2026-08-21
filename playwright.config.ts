import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import { applyPlaywrightBrowsersPath } from './config/playwright-browsers-path.mjs';

dotenv.config({ path: path.resolve(__dirname, '.env') });
applyPlaywrightBrowsersPath();

const headlessEnv = process.env.PW_HEADLESS ?? process.env.PLAYWRIGHT_HEADLESS;
const headless = process.env.CI ? true : headlessEnv?.toLowerCase() === 'true';
const workers = Number(process.env.PW_WORKERS ?? 1);

/**
 * Fixed desktop viewport, matching the MCP Playwright browser
 * (`scripts/playwright-mcp.mjs` uses 1440x900). The app renders separate mobile and
 * desktop trees, so a viewport that follows the developer's monitor made locator
 * exploration and test execution disagree about which tree is live. Override with
 * `PW_VIEWPORT=1280x720`, or `PW_VIEWPORT=maximized` to restore window-sized runs.
 */
const DEFAULT_VIEWPORT = { width: 1440, height: 900 };

function resolveViewport(): { width: number; height: number } | null {
  const raw = process.env.PW_VIEWPORT?.trim();
  if (!raw) return DEFAULT_VIEWPORT;
  if (raw.toLowerCase() === 'maximized') return null;
  const match = /^(\d+)\s*[x×]\s*(\d+)$/i.exec(raw);
  if (!match) {
    throw new Error(`PW_VIEWPORT must be "<width>x<height>" or "maximized", got "${raw}"`);
  }
  return { width: Number(match[1]), height: Number(match[2]) };
}

const viewport = resolveViewport();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 1 : 0,
  /* Shared auth and mutable app state make one worker the safe default. */
  workers,
  /* Headroom over the 30s default: these are real network E2E flows with uploads. */
  timeout: 60_000,
  expect: {
    /* Raised from the 5s default so slow dev-environment renders stop flaking. */
    timeout: 10_000,
  },
  /*
   * list  — readable progress, and the only useful output in CI logs
   * html  — local report; never auto-opens in CI
   * junit — CI test reporting
   */
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never' }], ['junit', { outputFile: 'test-results/junit.xml' }]]
    : [['list'], ['html', { open: 'never' }]],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    // baseURL: 'http://localhost:3000',

    /* Run headed or headless based on env vars PW_HEADLESS / PLAYWRIGHT_HEADLESS. */
    headless,
    permissions: ['clipboard-read', 'clipboard-write'],
    viewport,
    /* Only meaningful when PW_VIEWPORT=maximized leaves the viewport unset. */
    ...(viewport === null ? { launchOptions: { args: ['--start-maximized'] } } : {}),

    /*
     * No `actionTimeout` on purpose: media seeding uploads mp4/mp3 fixtures, and a
     * global per-action cap would fail those before the test timeout above does.
     */
    navigationTimeout: 30_000,

    /* Locally retries are 0, so `on-first-retry` would never capture anything. */
    trace: process.env.CI ? 'on-first-retry' : 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  /* Chromium is the only required browser for now. */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport, deviceScaleFactor: undefined },
    },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
