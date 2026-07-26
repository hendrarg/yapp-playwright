import { creatorAuthTest as test } from '../test-base';

test.describe('Creator Membership', () => {
test('injected "at" token loads the membership page without redirecting to auth', { 
  tag: ['@AUT-FV-305', '@membership', '@creator', '@smoke'] }, async ({ membershipPage }) => {
  await membershipPage.goto();
  await membershipPage.expectLoaded();
});
});
