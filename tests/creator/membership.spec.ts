import { creatorAuthTest as test } from '../test-base';

test('injected "at" token loads the membership page without redirecting to auth', { 
  tag: ['@TAT-C-FV-001', '@membership', '@creator', '@smoke'] }, async ({ membershipPage }) => {
  await membershipPage.goto();
  await membershipPage.expectLoaded();
});
