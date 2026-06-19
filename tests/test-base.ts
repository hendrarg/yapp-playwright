import { test as base, expect } from '@playwright/test';
import { baseURL, creatorsBaseURL } from '../config/env';
import { loginWithToken } from '../src/helpers/auth/token-login';

const headlessEnv = process.env.PW_HEADLESS ?? process.env.PLAYWRIGHT_HEADLESS;
const headless = headlessEnv === undefined ? false : headlessEnv.toLowerCase() === 'true';
const accessToken = process.env.YAPP_TEST_ACCESS_TOKEN;

export const test = base.extend({
  page: async ({ page }, use) => {
    await use(page);
  },
});

export const authTest = test.extend({
  context: async ({ context }, use) => {
    test.skip(!accessToken, 'YAPP_TEST_ACCESS_TOKEN must be set in .env to run this token-injection test');
    await loginWithToken(context, accessToken!, baseURL);
    await use(context);
  },
});

export const creatorAuthTest = test.extend({
  context: async ({ context }, use) => {
    test.skip(!accessToken, 'YAPP_TEST_ACCESS_TOKEN must be set in .env to run this token-injection test');
    await loginWithToken(context, accessToken!, creatorsBaseURL);
    await use(context);
  },
});

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
});

test.afterEach(async ({ page }) => {
  if (!page.isClosed()) {
    await page.close();
  }
  console.log('pass browser close');
});

export { expect, headless };
