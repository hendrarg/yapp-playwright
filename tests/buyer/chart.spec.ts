import { test, expect } from '../test-base';
import { baseURL } from '../../config/env';
import { loginWithToken } from '../../src/helpers/auth/token-login';

// Manually obtained token (e.g. copied from a curl login response), set in .env —
// see .env.example. Bypasses the OTP/captcha flow entirely; never commit a real value.
const accessToken = process.env.YAPP_TEST_ACCESS_TOKEN;

test.beforeEach(async ({ context }) => {
  test.skip(!accessToken, 'YAPP_TEST_ACCESS_TOKEN must be set in .env to run this token-injection test');
  await loginWithToken(context, accessToken!, baseURL);
});

test('injected "at" token loads the chart page without redirecting to auth', async ({ page }) => {
  await page.goto(new URL('chart', baseURL).toString());
  await page.waitForLoadState('networkidle');

  await expect(page).toHaveURL(/\/chart/);
  expect(page.url()).not.toContain('/auth');
});
