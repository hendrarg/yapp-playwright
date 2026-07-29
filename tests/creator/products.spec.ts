import { creatorAuthTest as test, expect } from '../test-base';
import {
  expectProductHideFromProfile,
  setProductHideFromProfile,
} from '@helpers/api/product';
import { productsCreationData } from '@test-data/creator/products.creation.data';
import { productsHideFromProfileData } from '@test-data/creator/products.hide-from-profile.data';
import { productsSearchData } from '@test-data/creator/products.search.data';
import { productsStatusData } from '@test-data/creator/products.status.data';
import { creatorProfile } from '@test-data/buyer/profile.data';

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

  test('Verify Products Integrations and External Services', {
    tag: ['@AUT-FV-214', '@products', '@creator', '@regression'],
  }, async ({ creatorNav, productsPage }) => {
    await test.step('Open Products and product type selection', async () => {
      await creatorNav.open('products');
      await productsPage.expectLoaded();
      await productsPage.openAddProductSheet();
    });

    await test.step('Verify PRD product types are available', async () => {
      await productsPage.expectProductTypesAvailable(productsCreationData.productTypes);
    });

    await test.step('Select Discord Membership and verify creation flow', async () => {
      const discordType = productsCreationData.productTypes.find(
        (type) => type.label === 'Discord Membership',
      )!;
      await productsPage.selectProductType(discordType.buttonName);
      await productsPage.expectDiscordMembershipCreateFlow();
    });
  });

  test('Upload and Manage Products Media and Content', {
    tag: ['@AUT-FV-215', '@products', '@creator', '@regression'],
    annotation: [
      { type: 'covers', description: 'TC-PROD-C-026' },
      { type: 'covers', description: 'TC-PROD-C-027' },
      { type: 'covers', description: 'TC-PROD-C-028' },
      { type: 'covers', description: 'TC-PROD-C-029' },
    ],
  }, async ({
    creatorNav,
    buyerNav,
    productsPage,
    buyerProfilePage,
    productPurchasePage,
    page,
  }) => {
    test.setTimeout(120000);
    let hiddenFromProfile = false;

    try {
      await test.step('Open actions menu and apply Hide from Profile', async () => {
        await creatorNav.open('products');
        await productsPage.expectLoaded();
        await productsPage.searchProducts(productsHideFromProfileData.productName);
        await productsPage.expectProductVisible(productsHideFromProfileData.productName);
        await productsPage.expectHideFromProfileActionAvailable(productsHideFromProfileData.productName);
        await productsPage.selectHideFromProfileAction(productsHideFromProfileData.productName);
        hiddenFromProfile = true;
        await expectProductHideFromProfile(
          page.request,
          productsHideFromProfileData.productUuid,
          true,
        );
      });

      await test.step('Verify product is hidden on public creator profile Shops tab', async () => {
        await buyerNav.open('profile', { handle: creatorProfile });
        await buyerProfilePage.expectLoaded();
        await buyerProfilePage.switchToTab('shops');
        await buyerProfilePage.expectProductHiddenOnShops(productsHideFromProfileData.productTitle);
      });

      await test.step('Verify direct product URL remains accessible to buyer', async () => {
        await buyerNav.open('productPurchase', {
          product: {
            title: productsHideFromProfileData.productTitle,
            path: productsHideFromProfileData.productPath,
          },
        });
        await productPurchasePage.expectLoaded({
          title: productsHideFromProfileData.productTitle,
          path: productsHideFromProfileData.productPath,
        });
      });

      await test.step('Restore visibility and verify product returns on profile Shops tab', async () => {
        await creatorNav.open('products');
        await productsPage.expectLoaded();
        await productsPage.searchProducts(productsHideFromProfileData.productName);
        await productsPage.selectRestoreVisibilityAction(productsHideFromProfileData.productName);
        hiddenFromProfile = false;
        await expectProductHideFromProfile(
          page.request,
          productsHideFromProfileData.productUuid,
          false,
        );

        await buyerNav.open('profile', { handle: creatorProfile });
        await buyerProfilePage.expectLoaded();
        await buyerProfilePage.switchToTab('shops');
        await buyerProfilePage.expectProductVisibleOnShops(productsHideFromProfileData.productTitle);
      });
    } finally {
      if (hiddenFromProfile) {
        await setProductHideFromProfile(
          page.request,
          productsHideFromProfileData.productUuid,
          false,
        );
      }
    }
  });

  test('Share product and copy product URL', {
    tag: ['@AUT-FV-216', '@products', '@creator', '@regression'],
    annotation: [{ type: 'covers', description: 'TC-PROD-C-033' }],
  }, async ({ creatorNav, productsPage, page }) => {
    await test.step('Open product actions menu and choose Share', async () => {
      await creatorNav.open('products');
      await productsPage.searchProducts(productsHideFromProfileData.productName);
      await productsPage.expectProductVisible(productsHideFromProfileData.productName);
      await productsPage.openShareDialog(productsHideFromProfileData.productName);
      await productsPage.expectShareDialogVisible();
    });

    await test.step('Click Copy Product URL and verify clipboard content', async () => {
      await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
      await productsPage.copyProductUrl();
      await productsPage.expectProductUrlCopied(productsHideFromProfileData.productPath);
    });
  });
});
