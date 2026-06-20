import { creatorAuthTest as test } from '../test-base';

test('injected "at" token loads the profile page without redirecting to auth', { 
  tag: ['@profile', '@creator', '@smoke'] }, async ({ creatorProfilePage }) => {
  await creatorProfilePage.goto();
  await creatorProfilePage.expectLoaded();
});
