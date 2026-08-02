import type { BrowserContext } from '@playwright/test';
import { baseURL } from '@config/env';
import { testAccounts, type TestAccount } from '@test-data/users';
import { signInWithEmailOtp } from './otp-login';
import { saveTokenToEnv } from './save-token';

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
