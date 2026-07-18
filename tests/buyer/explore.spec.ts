import { authTest as test } from '../test-base';
import { exploreData } from '@test-data/buyer/explore.data';

test.describe('Buyer Explore', () => {
test('Explore Page: Search & Creator Discovery', {
  tag: ['@AUT-FV-175', '@explore', '@buyer', '@smoke', '@regression'],
}, async ({ explorePage }) => {
  const data = exploreData.creatorDiscovery;
  let matchingCreatorHrefs: string[] = [];

  await test.step('Open Explore and validate creator Search', async () => {
    await explorePage.goto();
    await explorePage.expectLoaded();
    await explorePage.expectAuthenticated();
    await explorePage.expectSearchVisible();
  });

  await test.step('Search by display name and validate matching creators', async () => {
    await explorePage.searchCreators(data.displayNameQuery);
    matchingCreatorHrefs = await explorePage.expectCreatorResults(data.displayNameQuery, 2);
  });

  await test.step('Replace the query with a username and validate updated results', async () => {
    await explorePage.searchCreators(data.usernameQuery);
    await explorePage.expectExactCreatorResult(data.selectedCreator);
  });

  await test.step('Validate the creator empty state for a no-match query', async () => {
    await explorePage.searchCreators(data.noMatchQuery);
    await explorePage.expectNoCreatorResults(data.noMatchQuery);
  });

  await test.step('Validate Creators For You metadata', async () => {
    await explorePage.clearSearch();
    await explorePage.expectRecommendedCreators(data.expectedCreators);
  });

  await test.step('Open a creator from search and Creators For You', async () => {
    await explorePage.searchCreators(data.usernameQuery);
    await explorePage.openSearchCreator(data.selectedCreator.href);
    await explorePage.returnToExplore();
    await explorePage.openRecommendedCreator(data.selectedCreator);
    await explorePage.returnToExplore();
  });

  await test.step('Open the full creator list and validate matching creators', async () => {
    await explorePage.openAllCreators();
    await explorePage.expectFullCreatorResults(data.displayNameQuery, matchingCreatorHrefs);
  });
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
    await explorePage.expectProductSections();
  });

  await test.step('Validate product card metadata', async () => {
    await explorePage.expectProductCardMetadata();
    products = await explorePage.getVisibleProducts();
  });

  await test.step('Validate system-defined popularity order', async () => {
    await explorePage.expectPopularOrder(exploreData.popularProducts);
  });

  await test.step('Validate only eligible public products are shown', async () => {
    await explorePage.expectProductsInPublicList(products);
  });

  await test.step('Open a product from each section', async () => {
    await explorePage.openProductFromEachSection(products);
  });

  await test.step('Open the full product list and search a product', async () => {
    await explorePage.openAllProducts();
    await explorePage.expectPaidAndFreeProducts();
    await explorePage.expectProductSearch(exploreData.productSearch);
  });
});

test('Explore Page: Recent Product Recommendations', {
  tag: ['@AUT-FV-177', '@explore', '@buyer', '@regression'],
}, async ({ explorePage }) => {
  let recommendations!: Awaited<ReturnType<typeof explorePage.getRecommendedProducts>>;

  await test.step('Open Explore and validate populated recommendations', async () => {
    await explorePage.goto();
    await explorePage.expectLoaded();
    await explorePage.expectAuthenticated();
    await explorePage.expectRecommendedSectionPopulated();
  });

  await test.step('Validate recommendation product metadata', async () => {
    await explorePage.expectRecommendedProductCardMetadata();
  });

  await test.step('Capture recommended product links and order', async () => {
    recommendations = await explorePage.getRecommendedProducts();
  });

  await test.step('Compare recommendations with the leading public products', async () => {
    await explorePage.expectRecommendationsLeadPublicList(recommendations);
  });

  await test.step('Open the first recommended product', async () => {
    await explorePage.returnToExplore();
    await explorePage.openRecommendedProduct(recommendations[0]);
  });
});
});
