import { creatorAuthTest as test } from '../test-base';

test.describe('Creator Analytics', () => {
test('injected "at" token loads the analytics page without redirecting to auth', {tag: ['@analytics', '@creator', '@smoke'] }, async ({ creatorNav }) => {
  await creatorNav.open('analytics');
});
});
