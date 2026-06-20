import { creatorAuthTest as test } from '../test-base';

test('injected "at" token loads the products page without redirecting to auth', async ({ productsPage }) => {
  await productsPage.goto();
  await productsPage.expectLoaded();
});
