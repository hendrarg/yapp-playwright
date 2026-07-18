import { authTest as test } from '../test-base';
import { exploreData } from '@test-data/buyer/explore.data';

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

  let products!: Awaited<ReturnType<typeof explorePage.getVisibleProducts>>;

  await test.step('Open Explore as Buyer', async () => {
    await explorePage.goto();
    await explorePage.expectLoaded();
    await explorePage.expectAuthenticated();
  });

  await test.step('Validate Popular and Recommended section visibility', async () => {
    await explorePage.expectDiscoverySections();
  });

  await test.step('Validate product card metadata', async () => {
    await explorePage.expectProductCardMetadata();
    products = await explorePage.getVisibleProducts();
  });

  await test.step('Validate system-defined popularity order', async () => {
    await explorePage.expectStaticDiscoveryOrder(exploreData.popularProducts, exploreData.creators);
  });

  await test.step('Validate only eligible public products are shown', async () => {
    await explorePage.expectProductsInPublicList(products);
  });

  await test.step('Open a product from each section', async () => {
    await explorePage.openProductFromEachSection(products);
  });

  await test.step('Open the full creator list and search a creator', async () => {
    await explorePage.openAllCreators();
    await explorePage.expectCreatorSearch(exploreData.creatorSearch);
  });

  await test.step('Open the full product list and search a product', async () => {
    await explorePage.returnToExplore();
    await explorePage.openAllProducts();
    await explorePage.expectPaidAndFreeProducts();
    await explorePage.expectProductSearch(exploreData.productSearch);
  });
});
