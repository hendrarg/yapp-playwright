import { creatorAuthTest as test } from '../test-base';

test.describe('Creator Referral', () => {
test('injected "at" token loads the referral page without redirecting to auth', { 
  tag: ['@AUT-FV-311', '@referral', '@creator', '@smoke'] }, async ({ referralPage }) => {
  await referralPage.goto();
  await referralPage.expectLoaded();
});
});
