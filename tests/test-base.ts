import type { PageFixtures } from '../src/fixtures/page.fixtures';
import type { BuyerNavFixtures } from '../src/fixtures/buyer-nav.fixture';
import type { CreatorNavFixtures } from '../src/fixtures/creator-nav.fixture';
import type { BrowserContext } from '@playwright/test';
import { test as base, expect } from '@playwright/test';
import { baseURL, creatorsBaseURL } from '../config/env';
import { loginWithToken } from '../src/helpers/auth/token-login';
import { waitForAuthResponse } from '../src/helpers/auth/validate-token';
import { isTokenExpired } from '../src/helpers/auth/token-utils';
import { assertPrimaryTestToken } from '../src/helpers/auth/save-token';
import { testAccounts } from '../src/test-data/users';
import { pageFixtures } from '../src/fixtures/page.fixtures';
import { buyerNavFixtures } from '../src/fixtures/buyer-nav.fixture';
import { creatorNavFixtures } from '../src/fixtures/creator-nav.fixture';

const headlessEnv = process.env.PW_HEADLESS ?? process.env.PLAYWRIGHT_HEADLESS;
const headless = headlessEnv === undefined ? false : headlessEnv.toLowerCase() === 'true';

type MyFixtures = PageFixtures & BuyerNavFixtures & CreatorNavFixtures;

export const test = base.extend<MyFixtures>({
  ...pageFixtures,
  ...buyerNavFixtures,
  ...creatorNavFixtures,
});

/**
 * Ensures YAPP_TEST_ACCESS_TOKEN is a valid Hendra token for authTest/creatorAuthTest.
 *
 * OTP login uses the testmail Sundanese inbox — it must NOT overwrite token1.
 * Refresh Sundanese via tests/auth/otp-login.spec.ts (saves to YAPP_TEST_ACCESS_TOKEN_2).
 * Refresh Hendra manually when token1 expires.
 */
async function ensureFreshToken(_context: BrowserContext): Promise<string> {
  const token = process.env.YAPP_TEST_ACCESS_TOKEN?.replace(/"/g, '');
  if (!token) {
    throw new Error('YAPP_TEST_ACCESS_TOKEN must be set in .env to run this token-injection test');
  }

  assertPrimaryTestToken(token);

  if (isTokenExpired(token)) {
    throw new Error(
      `YAPP_TEST_ACCESS_TOKEN (Hendra / ${testAccounts.hendra.username}) is expired. ` +
        `OTP auto-login uses Sundanese (${testAccounts.sundanese.username}) and saves to ${testAccounts.sundanese.envVar} — it cannot refresh token1. ` +
        `Refresh Hendra manually, or run tests/auth/otp-login.spec.ts to refresh token2 only.`,
    );
  }

  return token;
}

export const authTest = test.extend({
  context: [async ({ context }, use) => {
    const token = await ensureFreshToken(context);
    await loginWithToken(context, token, baseURL);
    await use(context);
  }, { scope: 'test', timeout: 90000 }],
  page: [async ({ page }, use) => {
    const authCheck = waitForAuthResponse(page);
    await page.goto(baseURL, { timeout: 60000, waitUntil: 'domcontentloaded' });
    await authCheck;
    await use(page);
  }, { scope: 'test', timeout: 90000 }],
});

export const creatorAuthTest = test.extend({
  context: [async ({ context }, use) => {
    const token = await ensureFreshToken(context);
    await loginWithToken(context, token, creatorsBaseURL);
    await use(context);
  }, { scope: 'test', timeout: 90000 }],
  page: [async ({ page }, use) => {
    const authCheck = waitForAuthResponse(page);
    await page.goto(creatorsBaseURL, { timeout: 60000, waitUntil: 'domcontentloaded' });
    await authCheck;
    await use(page);
  }, { scope: 'test', timeout: 90000 }],
});

test.afterEach(async ({ page }) => {
  if (!page.isClosed()) {
    await page.close();
  }
});

export { expect, headless };
