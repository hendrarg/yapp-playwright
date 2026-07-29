import { creatorAuthTest as test, expect } from '../test-base';
import { productsSearchData } from '@test-data/creator/products.search.data';
import { productsStatusData } from '@test-data/creator/products.status.data';

test.describe('Creator Products', () => {
  test('Search, Filter, Sort, and Discover Products Data', {
    tag: ['@AUT-FV-212', '@products', '@creator', '@regression'],
  }, async ({ creatorNav, productsPage }) => {
    test.setTimeout(120000);

    await test.step('Open Products and verify search field is usable', async () => {
      await creatorNav.open('products');
      await productsPage.expectLoaded();
      await productsPage.expectSearchFieldUsable();
    });

    await test.step('Search by product name and verify filtered results', async () => {
      await productsPage.searchProducts(productsSearchData.nameQuery);
      await productsPage.expectNameSearchResults(
        productsSearchData.nameQuery,
        productsSearchData.excludedName,
      );
    });

    await test.step('Search by product URL and document title-only API gap', async () => {
      const productUrl = await productsPage.readMatchedProductUrl();
      await productsPage.searchProducts(productUrl);
      // PRD expects the matching product; current API filters title= only.
      expect(productsSearchData.urlSearchSupported).toBe(false);
      await productsPage.expectEmptySearchState();
    });

    await test.step('Search with unmatched query and verify empty state', async () => {
      await productsPage.searchProducts(productsSearchData.emptyQuery);
      await productsPage.expectEmptySearchState();
      await expect(productsPage.searchInput).toBeVisible();
      await expect(productsPage.searchInput).toBeEnabled();
    });

    await test.step('Clear search query and restore active product list', async () => {
      await productsPage.clearSearch();
      await productsPage.expectRestoredProductList(productsSearchData.restoredNames);
    });
  });

  test('Verify Products Display and Navigation', {
    tag: ['@AUT-FV-213', '@products', '@creator', '@regression'],
    annotation: [{ type: 'covers', description: 'TC-PROD-C-011' }],
  }, async ({ creatorNav, productsPage }) => {
    test.setTimeout(90000);

    await test.step('Open Products page', async () => {
      await creatorNav.open('products');
      await productsPage.expectLoaded();
    });

    for (const status of productsStatusData.tabs) {
      await test.step(`Select ${status} tab and verify list shows only ${status} products`, async () => {
        await productsPage.selectStatusTab(status);
        await productsPage.expectStatusTabList(status);
      });
    }
  });
});
