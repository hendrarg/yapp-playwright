import { authTest as test } from '../test-base';

test('injected "at" token loads the cart page without redirecting to auth', { 
  tag: ['@cart', '@buyer', '@smoke'] }, async ({ cartPage }) => {
  await cartPage.goto();
  await cartPage.expectLoaded();
});
