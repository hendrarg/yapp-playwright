import type { Page } from '@playwright/test';
import { testmailConfig, markInboxStart, fetchOtpCode } from '../otp/testmail';
import { extractAccessToken } from './save-token';

/** Signs in through the real OTP UI flow and lands on /explore. */
export async function signInWithEmailOtp(page: Page, baseURL: string) {
  const inbox = testmailConfig();
  const sentAtMs = markInboxStart();

  await page.goto(new URL('auth', baseURL).toString());
  await page.waitForLoadState('networkidle');
  await page.getByPlaceholder('Enter your email').fill(inbox.email);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();

  // reCAPTCHA's invisible check occasionally takes longer to resolve; one retry covers that.
  try {
    await page.waitForURL(/step=input-otp/, { timeout: 20000 });
  } catch {
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.waitForURL(/step=input-otp/, { timeout: 20000 });
  }

  const otp = await fetchOtpCode(inbox, sentAtMs);

  await page.locator('input[data-input-otp="true"]').pressSequentially(otp);
  await page.waitForURL(/\/explore/);

  const token = await extractAccessToken(page.context());
  return { email: inbox.email, token };
}

/** Logs out by navigating to /logout and waiting for redirect. */
export async function logout(page: Page, baseURL: string) {
  await page.goto(new URL('logout', baseURL).toString());
  await page.waitForURL(/auth/, { timeout: 15000 });
}
