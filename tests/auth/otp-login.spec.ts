import { test, expect } from '../test-base';
import { signInWithEmailOtp } from '../../src/helpers/auth/otp-login';
import { baseURL } from '../../config/env';

test('user can sign in to Yapp using an emailed OTP', async ({ page }) => {
  test.setTimeout(90000);

  await signInWithEmailOtp(page, baseURL);

  await expect(page).toHaveURL(/\/explore/);
});
