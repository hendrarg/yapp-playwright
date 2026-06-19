import { authTest as test, expect } from '../test-base';
import { baseURL } from '../../config/env';


test('injected "at" token loads the cart page without redirecting to auth', async ({ page }) => {
  await page.goto(new URL('cart', baseURL).toString());
  await page.waitForLoadState('networkidle');

  await expect(page).toHaveURL(/\/cart/);
  expect(page.url()).not.toContain('/auth');
});
