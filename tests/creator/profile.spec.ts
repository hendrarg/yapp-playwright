import { creatorAuthTest as test } from '../test-base';

test.describe('Creator Profile', () => {
test('injected "at" token loads the profile page without redirecting to auth', { 
  tag: ['@AUT-FV-309', '@profile', '@creator', '@smoke'] }, async ({ creatorProfilePage }) => {
  await creatorProfilePage.goto();
  await creatorProfilePage.expectLoaded();
});
});
