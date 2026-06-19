import { creatorAuthTest as test, expect } from '../test-base';
import { creatorsBaseURL } from '../../config/env';


test('injected "at" token loads the consultation sessions page without redirecting to auth', async ({ page }) => {
  await page.goto(new URL('consultation/sessions', creatorsBaseURL).toString());
  await page.waitForLoadState('networkidle');

  await expect(page).toHaveURL(/\/consultation\/sessions/);
  expect(page.url()).not.toContain('/auth');
});
