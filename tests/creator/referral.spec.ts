import { creatorAuthTest as test } from '../test-base';

test('injected "at" token loads the referral page without redirecting to auth', async ({ referralPage }) => {
  await referralPage.goto();
  await referralPage.expectLoaded();
});
