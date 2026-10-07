import type { Page } from '@playwright/test';
import { accountLoginEmail, testAccounts, type InboxAccount, type TestAccount } from '@test-data/users';
import { humanClick } from '@utils/playwright.utils';
import { testmailConfig, markInboxStart } from '../otp/testmail';
import { resolveOtpCode } from '../otp/otp-code';
import { fetchOtpCodeFromDb } from '../otp/db-otp';
import { extractAccessToken } from './save-token';

export type OtpLoginResult<A extends TestAccount | InboxAccount = TestAccount> = {
  email: string;
  token: string;
  account: A;
};

/** Signs in through the real OTP UI flow and lands on /explore. */
export async function signInWithEmailOtp<A extends TestAccount | InboxAccount = typeof testAccounts.qa>(
  page: Page,
  baseURL: string,
  account: A = testAccounts.qa as A,
): Promise<OtpLoginResult<A>> {
  const email = accountLoginEmail(account);
  const sentAtMs = markInboxStart();

  await page.goto(new URL('auth', baseURL).toString());
  await page.getByPlaceholder('Enter your email').fill(email);
  const continueButton = page.getByRole('button', { name: 'Continue', exact: true });
  // Invisible reCAPTCHA scores a submit that arrives with no pointer trail as a
  // bot, so approach the button like a person rather than clicking it cold.
  await humanClick(page, continueButton);

  // reCAPTCHA's invisible check occasionally takes longer to resolve; one retry covers that.
  try {
    await page.waitForURL(/step=input-otp/, { timeout: 20000 });
  } catch {
    await humanClick(page, continueButton);
    await page.waitForURL(/step=input-otp/, { timeout: 20000 });
  }

  // A testmail account reads its inbox (falling back to the DB); the creator's personal inbox
  // is not reachable, so its code comes straight from `otp_codes`.
  const otp = 'testmailTag' in account
    ? await resolveOtpCode(testmailConfig(account), sentAtMs)
    : await fetchOtpCodeFromDb(email, sentAtMs);

  await page.locator('input[data-input-otp="true"]').pressSequentially(otp);
  await page.waitForURL(/\/explore/);

  const token = await extractAccessToken(page.context());
  return { email, token, account };
}

/** Logs out by navigating to /logout and waiting for redirect. */
export async function logout(page: Page, baseURL: string) {
  await page.goto(new URL('logout', baseURL).toString());
  await page.waitForURL(/auth/, { timeout: 15000 });
}
