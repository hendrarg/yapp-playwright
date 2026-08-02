import type { PageFixtures } from '../src/fixtures/page.fixtures';
import type { BuyerNavFixtures } from '../src/fixtures/buyer-nav.fixture';
import type { CreatorNavFixtures } from '../src/fixtures/creator-nav.fixture';
import type { BrowserContext } from '@playwright/test';
import { test as base, expect } from '@playwright/test';
import { baseURL, creatorsBaseURL } from '../config/env';
import { loginWithToken } from '../src/helpers/auth/token-login';
import { waitForAuthResponse } from '../src/helpers/auth/validate-token';
import { primaryTokenNeedsRefresh, assertPrimaryTestToken } from '../src/helpers/auth/save-token';
import { refreshAccountTokenViaOtp } from '../src/helpers/auth/refresh-token-otp';
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
 * Ensures YAPP_TEST_ACCESS_TOKEN is a valid QA Tester token for authTest/creatorAuthTest.
 *
 * When token1 is missing, expired, or mapped to another username, refreshes via conventional
 * OTP login (`{TESTMAIL_NAMESPACE}.qa@inbox.testmail.app`) and saves back to token1.
 * Sundanese (`token2`) still uses its own OTP inbox / `otpUserSundanese`.
 */
async function ensureFreshToken(context: BrowserContext): Promise<string> {
  let token = process.env.YAPP_TEST_ACCESS_TOKEN?.replace(/"/g, '');

  if (primaryTokenNeedsRefresh(token)) {
    token = await refreshAccountTokenViaOtp(context, testAccounts.qa, baseURL);
  }

  if (!token) {
    throw new Error(
      `Failed to obtain ${testAccounts.qa.envVar} for ${testAccounts.qa.displayName} (${testAccounts.qa.username}).`,
    );
  }

  assertPrimaryTestToken(token);
  return token;
}

export const authTest = test.extend({
  context: [async ({ context }, use) => {
    const token = await ensureFreshToken(context);
    await loginWithToken(context, token, baseURL);
    await use(context);
  }, { scope: 'test', timeout: 120000 }],
  page: [async ({ page }, use) => {
    const authCheck = waitForAuthResponse(page);
    await page.goto(baseURL, { timeout: 60000, waitUntil: 'domcontentloaded' });
    await authCheck;
    await use(page);
  }, { scope: 'test', timeout: 120000 }],
});

export const creatorAuthTest = test.extend({
  context: [async ({ context }, use) => {
    const token = await ensureFreshToken(context);
    await loginWithToken(context, token, creatorsBaseURL);
    await use(context);
  }, { scope: 'test', timeout: 120000 }],
  page: [async ({ page }, use) => {
    const authCheck = waitForAuthResponse(page);
    await page.goto(creatorsBaseURL, { timeout: 60000, waitUntil: 'domcontentloaded' });
    await authCheck;
    await use(page);
  }, { scope: 'test', timeout: 120000 }],
});

test.afterEach(async ({ page }) => {
  if (!page.isClosed()) {
    await page.close();
  }
});

export { expect, headless };
