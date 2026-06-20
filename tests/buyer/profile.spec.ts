import { authTest as test } from '../test-base';

test('injected "at" token loads the profile page without redirecting to auth', async ({ buyerProfilePage }) => {
  await buyerProfilePage.goto();
  await buyerProfilePage.expectLoaded();
});
