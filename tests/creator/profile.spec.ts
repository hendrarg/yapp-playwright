import { creatorAuthTest as test } from '../test-base';

test.describe('Creator Profile', () => {
test('injected "at" token loads the profile page without redirecting to auth', { 
  tag: ['@profile', '@creator', '@smoke'] }, async ({ creatorNav }) => {
  await creatorNav.open('profile');
});
});
