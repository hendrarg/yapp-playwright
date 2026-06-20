import { authTest as test } from '../test-base';

test('injected "at" token loads the explore page without redirecting to auth', async ({ explorePage }) => {
  await explorePage.goto();
  await explorePage.expectLoaded();
});
