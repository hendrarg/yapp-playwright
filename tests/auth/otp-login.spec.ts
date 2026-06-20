import { test, expect } from '../test-base';
import { baseURL } from '../../config/env';

test('user can sign in to Yapp using an emailed OTP', async ({ page, loginPage }) => {
  test.setTimeout(90000);

  await loginPage.loginViaOtp(baseURL);

  await expect(page).toHaveURL(/\/explore/);
});
