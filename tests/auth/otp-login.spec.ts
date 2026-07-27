import { test, expect } from '../test-base';
import { baseURL } from '../../config/env';
import { saveTokenToEnv } from '../../src/helpers/auth/save-token';

test.describe('OTP Login', () => {
test('Complete Consultation Booking Lifecycle', {
  tag: ['@AUT-E2E-001', '@auth', '@buyer', '@smoke'] }, async ({ page, loginPage }) => {
  test.setTimeout(90000);

  const { token } = await loginPage.loginViaOtp(baseURL);

  await expect(page).toHaveURL(/\/explore/);

  saveTokenToEnv(token); // auto-routes to YAPP_TEST_ACCESS_TOKEN_2 (Sundanese)
});
});
