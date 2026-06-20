import { creatorAuthTest as test } from '../test-base';

test('injected "at" token loads the orders page without redirecting to auth', async ({ ordersPage }) => {
  await ordersPage.goto();
  await ordersPage.expectLoaded();
});
