import { creatorAuthTest as test } from '../test-base';

test.describe('Creator Affiliate', () => {
test('injected "at" token loads the affiliate page without redirecting to auth', { 
  tag: ['@AUT-FV-301', '@affiliate', '@creator', '@smoke'] }, async ({ creatorNav }) => {
  await creatorNav.open('affiliate');
});
});
