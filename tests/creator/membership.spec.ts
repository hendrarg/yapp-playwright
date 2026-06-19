import { creatorAuthTest as test, expect } from '../test-base';
import { creatorsBaseURL } from '../../config/env';


test('injected "at" token loads the membership page without redirecting to auth', async ({ page }) => {
  await page.goto(new URL('membership', creatorsBaseURL).toString());
  await page.waitForLoadState('networkidle');

  await expect(page).toHaveURL(/\/membership/);
  expect(page.url()).not.toContain('/auth');
});
