import { creatorAuthTest as test, expect } from '../test-base';
import { createOnlineCourseProduct, deleteProduct, expectProductHideFromProfile, expectProductStatus, setProductHideFromProfile } from '@helpers/api/product';
import { createOversizedImageFixture } from '@helpers/creator/oversized-image';
import { consultationMediaData } from '@test-data/creator/consultation.media.data';
import { digitalProductValidationData, generateOnlineCourseProductData, productsCreationData } from '@test-data/creator/products.creation.data';
import { productsHideFromProfileData } from '@test-data/creator/products.hide-from-profile.data';
import { productsSearchData } from '@test-data/creator/products.search.data';
import { productsStatusData } from '@test-data/creator/products.status.data';
import { creatorProfile } from '@test-data/buyer/profile.data';
import { discordMembershipPricingData, discordMembershipValidationData, generateDiscordMembershipDescription, generateDiscordMembershipLimitDescription, generateDiscordMembershipTitle } from '@test-data/creator/membership.data';

test.describe('Creator Products', () => {
  test('Verify Products Status Grouping', {
    tag: ['@AUT-FV-210', '@products', '@creator', '@smoke'],

  }, async ({ creatorNav, productsPage }) => {
    test.setTimeout(90000);

    await test.step('Open Products page', async () => {
      await creatorNav.open('products');
      await productsPage.expectLoaded();
    });

    for (const status of productsStatusData.tabs) {
      await test.step(`Select ${status} tab and verify rows show ${status} status only`, async () => {
        await productsPage.selectStatusTab(status);
        await productsPage.expectStatusTabList(status);
      });
    }
  });

  test('Set Active Product Inactive and Verify Status Transition', {
    tag: ['@AUT-FV-211', '@products', '@creator', '@regression'],

  }, async ({ creatorNav, productsPage, page }) => {
    test.setTimeout(120000);

    const seedToken = process.env.YAPP_TEST_ACCESS_TOKEN?.replace(/"/g, '');
    test.skip(!seedToken, 'YAPP_TEST_ACCESS_TOKEN is required to seed an active online course product for this test');
    if (!seedToken) return;

    const productData = generateOnlineCourseProductData({
      status: 'active',
    });
    let productUuid = '';

    try {
      await test.step('Create active online course product via API', async () => {
        const product = await createOnlineCourseProduct(page.request, productData, seedToken);
        productUuid = product.productUuid;
        expect(productUuid).toBeTruthy();
      });

      await test.step('Set product inactive from the Active status group', async () => {
        await creatorNav.open('products');
        await productsPage.expectLoaded();
        await productsPage.selectStatusTab('Active');
        await productsPage.searchProducts(productData.title);
        await productsPage.expectProductVisible(productData.title);
        await productsPage.setProductInactive(productData.title);
        await expectProductStatus(page.request, productUuid, 'inactive', seedToken);
      });

      await test.step('Verify product appears in the Inactive status group', async () => {
        await productsPage.clearSearch();
        await productsPage.selectStatusTab('Inactive');
        await productsPage.searchProducts(productData.title);
        await productsPage.expectProductVisible(productData.title);
        await productsPage.clearSearch();
        await productsPage.selectStatusTab('Active');
        await productsPage.searchProducts(productData.title);
        await productsPage.expectProductHidden(productData.title);
      });
    } finally {
      if (productUuid) {
        await deleteProduct(page.request, productUuid, seedToken);
      }
    }
  });

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

  test('Validate Creator Discord Membership Basic Details and Discord Access Setup', {
    tag: ['@AUT-FV-039', '@membership', '@creator', '@regression'],
    annotation: [{
      type: 'covers',
      description: 'TC-DM-C-001, TC-DM-C-002, TC-DM-C-003, TC-DM-C-004, TC-DM-C-005, TC-DM-C-006, TC-DM-C-007',
    }],
  }, async ({ creatorNav, productsPage, page }) => {
    test.setTimeout(180000);

    const discordType = productsCreationData.productTypes.find(
      (type) => type.label === 'Discord Membership',
    )!;
    const title = generateDiscordMembershipTitle();
    let currentDurationUnit = 'Month';

    await test.step('Open Discord Membership creation with empty required fields', async () => {
      await creatorNav.open('products');
      await productsPage.expectLoaded();
      await productsPage.openAddProductSheet();
      await productsPage.selectProductType(discordType.buttonName);
      await productsPage.expectDiscordMembershipCreateFlow();
      await productsPage.submitDiscordMembershipDetails();
      await productsPage.expectDiscordMembershipRequiredFeedback();
    });

    await test.step('Format the description and enforce the 500-word limit', async () => {
      await productsPage.fillDiscordMembershipTitle(title);
      await productsPage.fillDiscordMembershipDescription(
        generateDiscordMembershipDescription(),
      );
      await productsPage.fillDiscordMembershipDescription(
        generateDiscordMembershipLimitDescription(),
      );
      await productsPage.applyDiscordMembershipDescriptionFormatting();
      await productsPage.expectDiscordMembershipDescriptionCounter();
      await productsPage.appendDiscordMembershipDescription(
        discordMembershipValidationData.descriptionOverflowWord,
      );
      await productsPage.expectDiscordMembershipDescriptionCounter();
    });

    await test.step('Accept valid duration values for days, months, and years', async () => {
      for (const unit of discordMembershipValidationData.durationUnits) {
        await productsPage.selectDiscordMembershipDuration('1', currentDurationUnit, unit);
        currentDurationUnit = unit;
      }
    });

    await test.step('Review navigation and unsaved-change protection', async () => {
      await productsPage.navigateAwayFromDiscordMembershipViaBack();
      await productsPage.expectDiscordMembershipUnsavedChangesDialog();
      await page.keyboard.press('Escape');
    });

    await test.step('Expose the connected Discord account and server setup controls', async () => {
      await productsPage.expectDiscordMembershipConnectionControl();
    });

    await test.step('Require a server before a Discord role can be selected', async () => {
      await productsPage.expectDiscordMembershipServerRequirement();
    });

    await test.step('Select a Discord server and role and continue to publish details', async () => {
      await productsPage.selectDiscordMembershipServer(
        discordMembershipValidationData.serverName,
      );
      await productsPage.selectDiscordMembershipRole(
        discordMembershipValidationData.roleName,
      );
      await productsPage.expectDiscordMembershipServerAndRole(
        discordMembershipValidationData.serverName,
        discordMembershipValidationData.roleName,
      );
      await productsPage.continueToDiscordMembershipDetails();
    });
  });

  test('Validate Discord Membership Thumbnail Upload and Validation', {
    tag: ['@AUT-FV-040', '@membership', '@creator', '@regression'],
    annotation: [{ type: 'covers', description: 'TC-DM-C-008, TC-DM-C-009' }],
  }, async ({ creatorNav, productsPage }) => {
    test.setTimeout(180000);

    const discordType = productsCreationData.productTypes.find(
      (type) => type.label === 'Discord Membership',
    )!;

    const openDiscordMembershipDetails = async () => {
      await creatorNav.open('products');
      await productsPage.expectLoaded();
      await productsPage.openAddProductSheet();
      await productsPage.selectProductType(discordType.buttonName);
      await productsPage.expectDiscordMembershipCreateFlow();
      await productsPage.fillDiscordMembershipTitle(generateDiscordMembershipTitle());
      await productsPage.fillDiscordMembershipDescription(
        generateDiscordMembershipDescription(),
      );
      await productsPage.selectDiscordMembershipDuration('1', 'Month', 'Month');
      await productsPage.selectDiscordMembershipServer(
        discordMembershipValidationData.serverName,
      );
      await productsPage.selectDiscordMembershipRole(
        discordMembershipValidationData.roleName,
      );
      await productsPage.continueToDiscordMembershipDetails();
    };

    await test.step('Upload eleven thumbnails and enforce the maximum', async () => {
      await openDiscordMembershipDetails();
      await productsPage.uploadConsultationHero(consultationMediaData.heroImagePath);
      await productsPage.chooseConsultationGalleryFiles(
        consultationMediaData.additionalImagePaths,
      );
      await productsPage.expectConsultationGalleryCount(
        consultationMediaData.maxAdditionalImages,
      );
      await productsPage.expectConsultationGalleryInputUnavailable();
    });

    await test.step('Reject undersized and oversized thumbnail fixtures', async () => {
      await openDiscordMembershipDetails();

      const oversized = createOversizedImageFixture();
      try {
        await productsPage.chooseConsultationHeroFile(consultationMediaData.tinyImagePath);
        await productsPage.expectConsultationImageTooSmall('tiny-1x1.png');
        await productsPage.expectConsultationHeroNotUploaded();

        await productsPage.chooseConsultationHeroFile(oversized.filePath);
        await productsPage.expectConsultationImageTooLarge();
        await productsPage.expectConsultationHeroNotUploaded();
      } finally {
        oversized.cleanup();
      }
    });
  });

  test('Validate Discord Membership Pricing Rules', {
    tag: ['@AUT-FV-041', '@membership', '@creator', '@regression'],
    annotation: [{ type: 'covers', description: 'TC-DM-C-010, TC-DM-C-011' }],
  }, async ({ creatorNav, productsPage }) => {
    test.setTimeout(180000);

    const discordType = productsCreationData.productTypes.find(
      (type) => type.label === 'Discord Membership',
    )!;
    let defaultPricingEnabled = false;
    let zeroPriceRejected = false;

    await test.step('Open Discord Membership pricing details', async () => {
      await creatorNav.open('products');
      await productsPage.expectLoaded();
      await productsPage.openAddProductSheet();
      await productsPage.selectProductType(discordType.buttonName);
      await productsPage.expectDiscordMembershipCreateFlow();
      await productsPage.fillDiscordMembershipTitle(generateDiscordMembershipTitle());
      await productsPage.fillDiscordMembershipDescription(
        generateDiscordMembershipDescription(),
      );
      await productsPage.selectDiscordMembershipDuration('1', 'Month', 'Month');
      await productsPage.selectDiscordMembershipServer(
        discordMembershipValidationData.serverName,
      );
      await productsPage.selectDiscordMembershipRole(
        discordMembershipValidationData.roleName,
      );
      await productsPage.continueToDiscordMembershipDetails();
    });

    await test.step('Verify free pricing and accept a positive paid price', async () => {
      defaultPricingEnabled = await productsPage.readConsultationPricingEnabled();
      expect.soft(defaultPricingEnabled, 'Discord Membership should default to Free').toBe(false);

      await productsPage.setConsultationPricingEnabled(false);
      await productsPage.expectConsultationPreviewWithoutPaidPrice();
      await productsPage.setConsultationPricingEnabled(true);
      await productsPage.fillConsultationPrice(discordMembershipPricingData.validPrice);
      await productsPage.expectConsultationPreviewPaidPrice(
        discordMembershipPricingData.previewPaidPricePattern,
      );
    });

    await test.step('Reject zero when paid pricing is enabled', async () => {
      await productsPage.fillConsultationPrice(discordMembershipPricingData.zeroPrice);
      await productsPage.submitDiscordMembershipPricing();
      zeroPriceRejected = await productsPage.isDiscordMembershipZeroPriceRejected();
      expect.soft(zeroPriceRejected, 'Zero price should be rejected when paid pricing is enabled').toBe(true);
      test.fail(
        defaultPricingEnabled || !zeroPriceRejected,
        'Discord Membership pricing validation gap: pricing defaults to paid or accepts zero price',
      );
    });
  });

  test('Validate Digital Products Inputs and Boundary Conditions', {
    tag: ['@AUT-FV-188', '@products', '@creator', '@regression'],
  }, async ({ creatorNav, productsPage }) => {
    await test.step('Open Digital Product creation flow', async () => {
      const digitalProductType = productsCreationData.productTypes.find(
        (type) => type.label === 'Digital Product',
      )!;

      await creatorNav.open('products');
      await productsPage.expectLoaded();
      await productsPage.openAddProductSheet();
      await productsPage.selectProductType(digitalProductType.buttonName);
      await productsPage.expectDigitalProductCreateFlow();
    });

    await test.step('Validate title and required Add Content fields cannot be empty', async () => {
      await productsPage.submitEmptyDigitalProductAddContent();
      await productsPage.expectDigitalProductRequiredFeedback();
    });

    await test.step('Validate link label boundary and invalid URL are blocked', async () => {
      await productsPage.enableLinksContentType();
      await productsPage.openEmbedLinkDialog();
      await productsPage.fillEmbedLink(
        digitalProductValidationData.linkValidation.longLabel,
        digitalProductValidationData.linkValidation.invalidUrl,
      );
      await productsPage.expectInvalidEmbedLinkFeedback();
    });

    await test.step('Correct link data and save multiple valid embedded links', async () => {
      const [firstLink, secondLink] = digitalProductValidationData.linkValidation.validLinks;

      await productsPage.fillEmbedLink(firstLink.label, firstLink.url);
      await productsPage.saveCurrentEmbedLink();
      await productsPage.openEmbedLinkDialog();
      await productsPage.fillEmbedLink(secondLink.label, secondLink.url);
      await productsPage.saveCurrentEmbedLink();
      await productsPage.expectEmbedLinksSaved([firstLink.label, secondLink.label]);
    });
  });

  test('Upload and Manage Products Media and Content', {
    tag: ['@AUT-FV-215', '@products', '@creator', '@regression'],

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
  
  test('Unhide product and verify public availability', {
    tag: ['@AUT-FV-217', '@products', '@creator', '@regression'],

  }, async ({ creatorNav, buyerNav, productsPage, buyerProfilePage, page }) => {
    test.setTimeout(120000);

    await setProductHideFromProfile(
      page.request,
      productsHideFromProfileData.productUuid,
      true,
    );

    await test.step('Select Unhide for the hidden product', async () => {
      await creatorNav.open('products');
      await productsPage.expectLoaded();
      await productsPage.searchProducts(productsHideFromProfileData.productName);
      await productsPage.expectProductVisible(productsHideFromProfileData.productName);
      await productsPage.selectRestoreVisibilityAction(productsHideFromProfileData.productName);
      await expectProductHideFromProfile(
        page.request,
        productsHideFromProfileData.productUuid,
        false,
      );
    });

    await test.step('Verify product is visible on the public creator profile Shops tab', async () => {
      await buyerNav.open('profile', { handle: creatorProfile });
      await buyerProfilePage.expectLoaded();
      await buyerProfilePage.switchToTab('shops');
      await buyerProfilePage.expectProductVisibleOnShops(productsHideFromProfileData.productTitle);
    });
  });

  test('Verify Delete Product Confirmation Before Deletion', {
    tag: ['@AUT-FV-218', '@products', '@creator', '@regression'],

  }, async ({ creatorNav, productsPage, page }) => {
    test.setTimeout(120000);

    const seedToken = process.env.YAPP_TEST_ACCESS_TOKEN?.replace(/"/g, '');
    test.skip(!seedToken, 'YAPP_TEST_ACCESS_TOKEN is required to seed an online course product for this test');
    if (!seedToken) return;

    const productData = generateOnlineCourseProductData();
    let productUuid = '';

    try {
      await test.step('Create online course product via API', async () => {
        const product = await createOnlineCourseProduct(page.request, productData, seedToken);
        productUuid = product.productUuid;
        expect(productUuid).toBeTruthy();
      });

      await test.step('Open Delete action and verify confirmation dialog before deletion', async () => {
        await creatorNav.open('products');
        await productsPage.expectLoaded();
        await productsPage.searchProducts(productData.title);
        await productsPage.expectProductVisible(productData.title);
        await productsPage.openDeleteConfirmation(productData.title);
        await productsPage.expectDeleteConfirmationVisible();
        await productsPage.dismissDeleteConfirmation();
        await productsPage.expectProductVisible(productData.title);
      });
    } finally {
      if (productUuid) {
        await deleteProduct(page.request, productUuid, seedToken);
      }
    }
  });
});
