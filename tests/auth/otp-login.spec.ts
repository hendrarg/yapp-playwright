import { test, expect } from '../test-base';
import { baseURL } from '@config/env';
import { saveTokenToEnv } from '@helpers/auth/save-token';
import { testAccounts } from '@test-data/users';

test.describe('OTP Login', () => {
  test('Complete Consultation Booking Lifecycle', {
    tag: ['@AUT-E2E-001', '@auth', '@buyer', '@smoke'],
  }, async ({ page, loginPage }) => {
    test.setTimeout(90000);

    const { token, account } = await loginPage.loginViaOtp(baseURL, testAccounts.qa);

    await expect(page).toHaveURL(/\/explore/);

    saveTokenToEnv(token, '.env', account.envVar); // YAPP_TEST_ACCESS_TOKEN (QA Tester)
  });
});
