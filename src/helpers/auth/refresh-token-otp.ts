import { chromium, type BrowserContext } from '@playwright/test';
import { baseURL } from '@config/env';
import { testAccounts, type TestAccount } from '@test-data/users';
import { signInWithEmailOtp } from './otp-login';
import { saveTokenToEnv } from './save-token';
import { isTokenExpired } from './token-utils';

/**
 * Conventional email OTP login for a mapped test account, then persist the token to `.env`.
 * Used by auth fixtures when token1 is missing/expired/wrong user.
 */
export async function refreshAccountTokenViaOtp(
  context: BrowserContext,
  account: TestAccount = testAccounts.qa,
  appBaseURL = baseURL,
): Promise<string> {
  const page = await context.newPage();
  try {
    const { token } = await signInWithEmailOtp(page, appBaseURL, account);
    saveTokenToEnv(token, '.env', account.envVar);
    return token;
  } finally {
    if (!page.isClosed()) {
      await page.close();
    }
  }
}

let secondaryRefresh: Promise<string> | undefined;

/**
 * Ensures token2 (Sundanese) is present and unexpired, refreshing it through the
 * OTP flow when it is not.
 *
 * Token2 seeds creator-owned data over the API rather than driving the browser
 * session, so unlike token1 it has no auth fixture keeping it fresh. The shared
 * `beforeAll` in `tests/test-base.ts` calls this, which is what stops the
 * spec-level `test.skip` guards from firing on a token that is merely stale.
 *
 * It launches its own browser, and only once a refresh is actually due: taking
 * the `browser` fixture instead would start Chromium for every file — the
 * offline unit tests included — even when nothing needs refreshing.
 *
 * A failure is reported and swallowed rather than thrown: those same `test.skip`
 * guards are the intended outcome when no token can be obtained at all, and
 * throwing here would turn a skip into a whole-file failure.
 *
 * Deduplicated per worker process — the first caller logs in and later callers
 * await that same promise, so files sharing a worker never race the OTP inbox.
 * Across workers prefer PW_WORKERS=1 when a refresh may run.
 */
export async function ensureSecondaryToken(appBaseURL = baseURL): Promise<string | undefined> {
  const account = testAccounts.sundanese;
  const current = process.env[account.envVar]?.replace(/"/g, '');
  if (current && !isTokenExpired(current)) return current;

  if (!secondaryRefresh) {
    secondaryRefresh = (async () => {
      const headlessEnv = process.env.PW_HEADLESS ?? process.env.PLAYWRIGHT_HEADLESS;
      const browser = await chromium.launch({
        headless: process.env.CI ? true : headlessEnv?.toLowerCase() === 'true',
      });
      try {
        const context = await browser.newContext();
        try {
          return await refreshAccountTokenViaOtp(context, account, appBaseURL);
        } finally {
          await context.close();
        }
      } finally {
        await browser.close();
      }
    })().catch((error: unknown) => {
      secondaryRefresh = undefined; // leave a later file free to retry
      throw error;
    });
  }

  try {
    return await secondaryRefresh;
  } catch (error) {
    console.warn(
      `Could not refresh ${account.envVar} for ${account.displayName}: ` +
        `${error instanceof Error ? error.message : String(error)}`,
    );
    return undefined;
  }
}
