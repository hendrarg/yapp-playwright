import { creatorAuthTest as test } from '../test-base';

test.describe('Creator Promotions', () => {
test('injected "at" token loads the promotions page without redirecting to auth', { 
  tag: ['@AUT-FV-310', '@promotions', '@creator', '@smoke'] }, async ({ creatorNav }) => {
  await creatorNav.open('promotions');
});
});
