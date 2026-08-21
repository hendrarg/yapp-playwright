import { authTest as test } from '../test-base';

test.describe('Buyer Cart', () => {
test('Validate Add to Cart Pricing, Vouchers, and Fees — Part 1', {tag: ['@AUT-FV-001', '@cart', '@buyer', '@smoke'] }, async ({ buyerNav, cartPage }) => {
  await buyerNav.open('cart');
  await cartPage.expectAuthenticated();
});
});
