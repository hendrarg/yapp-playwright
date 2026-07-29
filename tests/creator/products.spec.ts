import { creatorAuthTest as test, expect } from '../test-base';
import { productsSearchData } from '@test-data/creator/products.search.data';

test.describe('Creator Products', () => {
  test('injected "at" token loads the products page without redirecting to auth', {
    tag: ['@products', '@creator', '@smoke'],
  }, async ({ creatorNav }) => {
    await creatorNav.open('products');
  });

  test('Search, Filter, Sort, and Discover Products Data', {
    tag: ['@AUT-FV-212', '@products', '@creator', '@regression'],
    annotation: [
      { type: 'covers', description: 'TC-PROD-C-005' },
      { type: 'covers', description: 'TC-PROD-C-006' },
      { type: 'covers', description: 'TC-PROD-C-007' },
      { type: 'covers', description: 'TC-PROD-C-008' },
      { type: 'covers', description: 'TC-PROD-C-009' },
      {
        type: 'blocked',
        description:
          'TC-PROD-C-007: products search sends title= only; Product URL/slug queries return empty (observed 2026-07-29)',
      },
    ],
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
});
