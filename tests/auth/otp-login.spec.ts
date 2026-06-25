import { test, expect } from '../test-base';
import { baseURL } from '../../config/env';
import { saveTokenToEnv } from '../../src/helpers/auth/save-token';

test('user can sign in to Yapp using an emailed OTP', {
  tag: ['@auth', '@buyer', '@smoke'] }, async ({ page, loginPage }) => {
  test.setTimeout(90000);

  const { token } = await loginPage.loginViaOtp(baseURL);

  await expect(page).toHaveURL(/\/explore/);

  saveTokenToEnv(token);
});
