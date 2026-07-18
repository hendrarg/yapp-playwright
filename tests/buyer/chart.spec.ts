import { authTest as test } from '../test-base';

test.describe('Buyer Cart', () => {
test('injected "at" token loads the cart page without redirecting to auth', { 
  tag: ['@AUT-FV-016', '@cart', '@buyer', '@smoke'] }, async ({ cartPage }) => {
  await cartPage.goto();
  await cartPage.expectLoaded();
  await cartPage.expectAuthenticated();
});
});
