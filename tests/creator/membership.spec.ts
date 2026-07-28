import { creatorAuthTest as test } from '../test-base';

test.describe('Creator Membership', () => {
test('injected "at" token loads the membership page without redirecting to auth', { 
  tag: ['@membership', '@creator', '@smoke'] }, async ({ creatorNav }) => {
  await creatorNav.open('membership');
});
});
