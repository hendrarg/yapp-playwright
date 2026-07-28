import { creatorAuthTest as test } from '../test-base';

test.describe('Creator Wallet', () => {
test('injected "at" token loads the wallet page without redirecting to auth', { 
  tag: ['@wallet', '@creator', '@smoke'] }, async ({ creatorNav }) => {
  await creatorNav.open('wallet');
});
});
