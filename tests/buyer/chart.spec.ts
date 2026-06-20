import { authTest as test } from '../test-base';

test('injected "at" token loads the cart page without redirecting to auth', async ({ cartPage }) => {
  await cartPage.goto();
  await cartPage.expectLoaded();
});
