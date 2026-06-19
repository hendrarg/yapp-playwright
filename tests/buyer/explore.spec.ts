import { authTest as test, expect } from '../test-base';
import { baseURL } from '../../config/env';


test('injected "at" token loads the explore page without redirecting to auth', async ({ page }) => {
  await page.goto(new URL('explore', baseURL).toString());
  await page.waitForLoadState('networkidle');

  await expect(page).toHaveURL(/\/explore/);
  expect(page.url()).not.toContain('/auth');
});
