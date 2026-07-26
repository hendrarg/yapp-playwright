import { creatorAuthTest as test } from '../test-base';

test.describe('Creator Orders', () => {
test('injected "at" token loads the orders page without redirecting to auth', { 
  tag: ['@AUT-FV-307', '@orders', '@creator', '@smoke'] }, async ({ creatorNav }) => {
  await creatorNav.open('orders');
});
});
