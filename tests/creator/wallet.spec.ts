import { creatorAuthTest as test } from '../test-base';

test('injected "at" token loads the wallet page without redirecting to auth', { 
  tag: ['@wallet', '@creator', '@smoke'] }, async ({ walletPage }) => {
  await walletPage.goto();
  await walletPage.expectLoaded();
});
