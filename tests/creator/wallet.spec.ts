import { creatorAuthTest as test } from '../test-base';

test.describe('Creator Wallet', () => {
test('injected "at" token loads the wallet page without redirecting to auth', { 
  tag: ['@AUT-FV-315', '@wallet', '@creator', '@smoke'] }, async ({ walletPage }) => {
  await walletPage.goto();
  await walletPage.expectLoaded();
});
});
