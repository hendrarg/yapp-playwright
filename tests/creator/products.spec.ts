import { creatorAuthTest as test } from '../test-base';

test.describe('Creator Products', () => {
test('injected "at" token loads the products page without redirecting to auth', { 
  tag: ['@products', '@creator', '@smoke'] }, async ({ creatorNav }) => {
  await creatorNav.open('products');
});
});
