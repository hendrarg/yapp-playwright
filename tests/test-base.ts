import type { PageFixtures } from '../src/fixtures/page.fixtures';
import type { BrowserContext } from '@playwright/test';
import { test as base, expect } from '@playwright/test';
import { baseURL, creatorsBaseURL } from '../config/env';
import { loginWithToken } from '../src/helpers/auth/token-login';
import { waitForAuthResponse } from '../src/helpers/auth/validate-token';
import { isTokenExpired } from '../src/helpers/auth/token-utils';
import { signInWithEmailOtp } from '../src/helpers/auth/otp-login';
import { saveTokenToEnv } from '../src/helpers/auth/save-token';
import { pageFixtures } from '../src/fixtures/page.fixtures';

const headlessEnv = process.env.PW_HEADLESS ?? process.env.PLAYWRIGHT_HEADLESS;
const headless = headlessEnv === undefined ? false : headlessEnv.toLowerCase() === 'true';

type MyFixtures = PageFixtures;

export const test = base.extend<MyFixtures>({
  ...pageFixtures,
});

/**
 * Ensures YAPP_TEST_ACCESS_TOKEN is valid. If expired (JWT exp check), runs the
 * real OTP login flow on a temporary page, saves the fresh token to .env, and
 * returns it. Throws on failure (does not skip) so the user knows to refresh
 * manually if reCAPTCHA blocks the auto-refresh.
 *
 * Note: OTP login runs on the buyer app (baseURL) — the resulting token is set
 * as a cookie on the apex domain (.yapp.ink), so it is valid for both buyer
 * and creator apps.
 *
 * Caveat: if run with PW_WORKERS > 1 while the token is expired, multiple
 * workers may trigger OTP login concurrently → wasted testmail.app quota and
 * a race on writing .env. Mitigation: run tests/auth/otp-login.spec.ts once
 * before parallel suites, or set PW_WORKERS=1.
 */
async function ensureFreshToken(context: BrowserContext): Promise<string> {
  let token = process.env.YAPP_TEST_ACCESS_TOKEN;
  if (!token) {
    throw new Error('YAPP_TEST_ACCESS_TOKEN must be set in .env to run this token-injection test');
  }

  if (isTokenExpired(token)) {
    const tempPage = await context.newPage();
    try {
      const result = await signInWithEmailOtp(tempPage, baseURL);
      saveTokenToEnv(result.token);
      token = result.token;
    } catch (err) {
      throw new Error(
        `Auto-refresh failed: token expired and OTP login could not complete. ` +
          `Run tests/auth/otp-login.spec.ts manually to refresh. Original error: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      await tempPage.close();
    }
  }

  return token;
}

export const authTest = test.extend({
  context: [async ({ context }, use) => {
    const token = await ensureFreshToken(context);
    await loginWithToken(context, token, baseURL);
    await use(context);
  }, { scope: 'test', timeout: 90000 }],
  page: async ({ page }, use) => {
    const authCheck = waitForAuthResponse(page);
    await page.goto(baseURL);
    await authCheck;
    await use(page);
  },
});

export const creatorAuthTest = test.extend({
  context: [async ({ context }, use) => {
    const token = await ensureFreshToken(context);
    await loginWithToken(context, token, creatorsBaseURL);
    await use(context);
  }, { scope: 'test', timeout: 90000 }],
  page: async ({ page }, use) => {
    const authCheck = waitForAuthResponse(page);
    await page.goto(creatorsBaseURL);
    await authCheck;
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
