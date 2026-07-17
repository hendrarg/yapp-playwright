import { authTest as test } from '../test-base';

test('injected "at" token loads the explore page without redirecting to auth', { 
  tag: ['@AUT-FV-175', '@explore', '@buyer', '@smoke'] }, async ({ explorePage }) => {
  await explorePage.goto();
  await explorePage.expectLoaded();
  await explorePage.expectAuthenticated();
});

test('Explore Page: Popular & Recommended Product Discovery', {
  tag: ['@AUT-FV-176', '@explore', '@buyer', '@regression'],
}, async ({ explorePage }) => {
  test.setTimeout(90000);

  let products!: Awaited<ReturnType<typeof explorePage.gotoWithProductData>>;

  await test.step('Open Explore and capture product discovery data', async () => {
    products = await explorePage.gotoWithProductData();
    await explorePage.expectLoaded();
    await explorePage.expectAuthenticated();
  });

  await test.step('Validate Popular and Recommended sections', async () => {
    await explorePage.expectProductSections();
  });

  await test.step('Validate Popular product metadata, eligibility, and order', async () => {
    await explorePage.expectPopularProducts(products.popular);
  });

  await test.step('Open a Popular product detail', async () => {
    await explorePage.openPopularProduct(products.popular[0]);
    await explorePage.returnToExplore();
  });

  await test.step('Validate Recommended product metadata and eligibility', async () => {
    await explorePage.expectRecommendedProducts(products.recommended);
  });

  await test.step('Open a Recommended product detail', async () => {
    await explorePage.openRecommendedProduct(products.recommended[0]);
    await explorePage.returnToExplore();
  });

  await test.step('Open the full products view from Popular Products', async () => {
    await explorePage.openAllProducts();
    await explorePage.expectFullProductList(products.recommended, products.popular.length);
  });
});
