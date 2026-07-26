import { creatorAuthTest as test } from '../test-base';

test.describe('Creator Products', () => {
test('injected "at" token loads the products page without redirecting to auth', { 
  tag: ['@AUT-FV-308', '@products', '@creator', '@smoke'] }, async ({ productsPage }) => {
  await productsPage.goto();
  await productsPage.expectLoaded();
});
});
