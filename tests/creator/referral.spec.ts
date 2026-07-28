import { creatorAuthTest as test } from '../test-base';

test.describe('Creator Referral', () => {
test('injected "at" token loads the referral page without redirecting to auth', { 
  tag: ['@referral', '@creator', '@smoke'] }, async ({ creatorNav }) => {
  await creatorNav.open('referral');
});
});
