import { authTest as test, expect } from '../test-base';
import { baseURL } from '../../config/env';


test('injected "at" token loads the library page without redirecting to auth', async ({ page }) => {
  await page.goto(new URL('dashboard/library', baseURL).toString());
  await page.waitForLoadState('networkidle');

  await expect(page).toHaveURL(/\/dashboard\/library\/?$/);
  expect(page.url()).not.toContain('/auth');
});
