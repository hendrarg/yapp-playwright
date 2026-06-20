import { creatorAuthTest as test } from '../test-base';

test('injected "at" token loads the affiliate page without redirecting to auth', async ({ affiliatePage }) => {
  await affiliatePage.goto();
  await affiliatePage.expectLoaded();
});
