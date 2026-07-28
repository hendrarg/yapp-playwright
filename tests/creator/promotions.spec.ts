import { creatorAuthTest as test } from '../test-base';

test.describe('Creator Promotions', () => {
test('injected "at" token loads the promotions page without redirecting to auth', { 
  tag: ['@promotions', '@creator', '@smoke'] }, async ({ creatorNav }) => {
  await creatorNav.open('promotions');
});
});
