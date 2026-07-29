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
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    // baseURL: 'http://localhost:3000',

    /* Run headed or headless based on env vars PW_HEADLESS / PLAYWRIGHT_HEADLESS. */
    headless,
    permissions: ['clipboard-read', 'clipboard-write'],
    viewport: null,
    launchOptions: {
      args: ['--start-maximized'],
    },

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Chromium is the only required browser for now. */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: null, deviceScaleFactor: undefined },
    },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
