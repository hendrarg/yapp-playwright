import { authTest as test } from '../test-base';

test.describe('Buyer Cart', () => {
test('injected "at" token loads the cart page without redirecting to auth', { 
  tag: ['@AUT-FV-001', '@cart', '@buyer', '@smoke'] }, async ({ buyerNav, cartPage }) => {
  await buyerNav.open('cart');
  await cartPage.expectAuthenticated();
});
});
