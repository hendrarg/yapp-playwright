import type { PageFixtures } from '../src/fixtures/page.fixtures';
import { test as base, expect } from '@playwright/test';
import { baseURL, creatorsBaseURL } from '../config/env';
import { loginWithToken } from '../src/helpers/auth/token-login';
import { pageFixtures } from '../src/fixtures/page.fixtures';

const headlessEnv = process.env.PW_HEADLESS ?? process.env.PLAYWRIGHT_HEADLESS;
const headless = headlessEnv === undefined ? false : headlessEnv.toLowerCase() === 'true';
const accessToken = process.env.YAPP_TEST_ACCESS_TOKEN;

type MyFixtures = PageFixtures;

export const test = base.extend<MyFixtures>({
  ...pageFixtures,
});

export const authTest = test.extend({
  context: async ({ context }, use) => {
    test.skip(!accessToken, 'YAPP_TEST_ACCESS_TOKEN must be set in .env to run this token-injection test');
    await loginWithToken(context, accessToken!, baseURL);
    await use(context);
  },
  page: async ({ page }, use) => {
    await page.goto(baseURL);
    await use(page);
  },
});

export const creatorAuthTest = test.extend({
  context: async ({ context }, use) => {
    test.skip(!accessToken, 'YAPP_TEST_ACCESS_TOKEN must be set in .env to run this token-injection test');
    await loginWithToken(context, accessToken!, creatorsBaseURL);
    await use(context);
  },
  page: async ({ page }, use) => {
    await page.goto(creatorsBaseURL);
    await use(page);
  },
});

test.afterEach(async ({ page }) => {
  if (!page.isClosed()) {
    await page.close();
  }
  console.log('pass browser close');
});

export { expect, headless };
