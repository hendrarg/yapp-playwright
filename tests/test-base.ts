import { test as base, expect } from '@playwright/test';

const headlessEnv = process.env.PW_HEADLESS ?? process.env.PLAYWRIGHT_HEADLESS;
const headless = headlessEnv === undefined ? false : headlessEnv.toLowerCase() === 'true';

export const test = base.extend({
  page: async ({ page }, use) => {
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
