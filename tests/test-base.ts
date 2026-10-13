import type { PageFixtures } from '../src/fixtures/page.fixtures';
import type { BuyerNavFixtures } from '../src/fixtures/buyer-nav.fixture';
import type { CreatorNavFixtures } from '../src/fixtures/creator-nav.fixture';
import type { DbFixtureFixtures } from '../src/fixtures/db.fixture';
import type { AppearanceFixtures } from '../src/fixtures/appearance.fixture';
import type { BrowserContext } from '@playwright/test';
import { test as base, expect } from '@playwright/test';
import { baseURL, creatorsBaseURL } from '../config/env';
import { loginWithToken } from '../src/helpers/auth/token-login';
import { waitForAuthResponse } from '../src/helpers/auth/validate-token';
import { tokenNeedsRefresh, assertTokenOwner } from '../src/helpers/auth/save-token';
import { refreshAccountTokenViaOtp, ensureSecondaryToken } from '../src/helpers/auth/refresh-token-otp';
import { testAccounts, type TestAccount } from '../src/test-data/users';
import { getRunSeed, warmAiCache } from '../src/test-data/ai';
import { pageFixtures } from '../src/fixtures/page.fixtures';
import { buyerNavFixtures } from '../src/fixtures/buyer-nav.fixture';
import { creatorNavFixtures } from '../src/fixtures/creator-nav.fixture';
import { dbFixtureFixtures } from '../src/fixtures/db.fixture';
import { appearanceFixtures } from '../src/fixtures/appearance.fixture';

const headlessEnv = process.env.PW_HEADLESS ?? process.env.PLAYWRIGHT_HEADLESS;
const headless = headlessEnv === undefined ? false : headlessEnv.toLowerCase() === 'true';

// Seed the global faker once per worker (per-run seed) before any test-data factory runs.
getRunSeed();

type MyFixtures = PageFixtures & BuyerNavFixtures & CreatorNavFixtures & DbFixtureFixtures & AppearanceFixtures;

export const test = base.extend<MyFixtures>({
  ...pageFixtures,
  ...buyerNavFixtures,
  ...creatorNavFixtures,
  ...dbFixtureFixtures,
  ...appearanceFixtures,
});

/**
 * Returns a valid token for `account`, refreshing it through OTP login when it is missing,
 * expired, or belongs to another account (checked by JWT uuid), and saving it back to the
 * account's own .env slot. `authTest` uses the QA buyer, `creatorAuthTest` the creator.
 */
async function ensureFreshToken(context: BrowserContext, account: TestAccount): Promise<string> {
  let token = process.env[account.envVar]?.replace(/"/g, '');

  if (tokenNeedsRefresh(token, account)) {
    token = await refreshAccountTokenViaOtp(context, account, baseURL);
  }

  if (!token) {
    throw new Error(`Failed to obtain ${account.envVar} for ${account.displayName}.`);
  }

  assertTokenOwner(token, account);
  return token;
}

export const authTest = test.extend({
  context: [async ({ context }, use) => {
    const token = await ensureFreshToken(context, testAccounts.qa);
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
    const token = await ensureFreshToken(context, testAccounts.creator);
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

// Warm the per-run AI content pool before any factory runs (no-op without GEMINI_API_KEY).
test.beforeAll(async () => {
  await warmAiCache();
  // token2 has no auth fixture of its own, so refresh it here the way
  // ensureFreshToken covers token1 — otherwise a stale token silently
  // skips every spec that seeds creator-owned data through it.
  await ensureSecondaryToken();
});

export { expect, headless };
