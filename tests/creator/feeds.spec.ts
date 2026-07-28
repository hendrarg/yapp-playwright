import { creatorAuthTest as test } from '../test-base';

test.describe('Creator Feeds', () => {
test('injected "at" token loads the feeds page without redirecting to auth', { 
  tag: ['@feeds', '@creator', '@smoke'] }, async ({ creatorNav }) => {
  await creatorNav.open('feeds');
});
});
