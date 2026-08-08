import { creatorAuthTest as test, expect } from '../test-base';
import { deleteProduct } from '@helpers/api/product';
import { createOversizedImageFixture } from '@helpers/creator/oversized-image';
import { consultationMediaData } from '@test-data/creator/consultation.media.data';
import { productsCreationData } from '@test-data/creator/products.creation.data';
import { discordMembershipPricingData, discordMembershipSettingsData, discordMembershipValidationData, generateDiscordMembershipBuyerQuestion, generateDiscordMembershipDescription, generateDiscordMembershipLimitDescription, generateDiscordMembershipSettingsNote, generateDiscordMembershipTitle } from '@test-data/creator/membership.data';
import { addCustomBuyerQuestion, chooseGalleryFiles, chooseHeroFile, closeProductCompleteModal, copyProductCompleteLink, expectGalleryCount, expectGalleryInputUnavailable, expectHeroNotUploaded, expectImageTooLarge, expectImageTooSmall, expectPreviewPaidPrice, expectPreviewWithoutPaidPrice, expectProductCompleteModal, fillPrice, readPricingEnabled, setPricingEnabled, uploadHero } from '@helpers/creator/product-editor';

test.describe('Creator Discord Membership', () => {
  test('Validate Creator Discord Membership Basic Details and Discord Access Setup', {
    tag: ['@AUT-FV-039', '@membership', '@creator', '@regression'],
    annotation: [{
      type: 'covers',
      description: 'TC-DM-C-001, TC-DM-C-002, TC-DM-C-003, TC-DM-C-004, TC-DM-C-005, TC-DM-C-006, TC-DM-C-007',
    }],
  }, async ({
    discordMembershipPage, creatorNav, productsPage, page }) => {
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
      await discordMembershipPage.expectDiscordMembershipCreateFlow();
      await discordMembershipPage.submitDiscordMembershipDetails();
      await discordMembershipPage.expectDiscordMembershipRequiredFeedback();
    });

    await test.step('Format the description and enforce the 500-word limit', async () => {
      await discordMembershipPage.fillDiscordMembershipTitle(title);
      await discordMembershipPage.fillDiscordMembershipDescription(
        generateDiscordMembershipDescription(),
      );
      await discordMembershipPage.fillDiscordMembershipDescription(
        generateDiscordMembershipLimitDescription(),
      );
      await discordMembershipPage.applyDiscordMembershipDescriptionFormatting();
      await discordMembershipPage.expectDiscordMembershipDescriptionCounter();
      await discordMembershipPage.appendDiscordMembershipDescription(
        discordMembershipValidationData.descriptionOverflowWord,
      );
      await discordMembershipPage.expectDiscordMembershipDescriptionCounter();
    });

    await test.step('Accept valid duration values for days, months, and years', async () => {
      for (const unit of discordMembershipValidationData.durationUnits) {
        await discordMembershipPage.selectDiscordMembershipDuration('1', currentDurationUnit, unit);
        currentDurationUnit = unit;
      }
    });

    await test.step('Review navigation and unsaved-change protection', async () => {
      await discordMembershipPage.navigateAwayFromDiscordMembershipViaBack();
      await discordMembershipPage.expectDiscordMembershipUnsavedChangesDialog();
      await page.keyboard.press('Escape');
    });

    await test.step('Expose the connected Discord account and server setup controls', async () => {
      await discordMembershipPage.expectDiscordMembershipConnectionControl();
    });

    await test.step('Require a server before a Discord role can be selected', async () => {
      await discordMembershipPage.expectDiscordMembershipServerRequirement();
    });

    await test.step('Select a Discord server and role and continue to publish details', async () => {
      await discordMembershipPage.selectDiscordMembershipServer(
        discordMembershipValidationData.serverName,
      );
      await discordMembershipPage.selectDiscordMembershipRole(
        discordMembershipValidationData.roleName,
      );
      await discordMembershipPage.expectDiscordMembershipServerAndRole(
        discordMembershipValidationData.serverName,
        discordMembershipValidationData.roleName,
      );
      await discordMembershipPage.continueToDiscordMembershipDetails();
    });
  });
  test('Validate Discord Membership Thumbnail Upload and Validation', {
    tag: ['@AUT-FV-040', '@membership', '@creator', '@regression'],
    annotation: [{ type: 'covers', description: 'TC-DM-C-008, TC-DM-C-009' }],
  }, async ({
    discordMembershipPage, creatorNav, productsPage, page }) => {
    test.setTimeout(180000);

    const discordType = productsCreationData.productTypes.find(
      (type) => type.label === 'Discord Membership',
    )!;

    const openDiscordMembershipDetails = async () => {
      await creatorNav.open('products');
      await productsPage.expectLoaded();
      await productsPage.openAddProductSheet();
      await productsPage.selectProductType(discordType.buttonName);
      await discordMembershipPage.expectDiscordMembershipCreateFlow();
      await discordMembershipPage.prepareDiscordMembershipDetails({
        title: generateDiscordMembershipTitle(),
        description: generateDiscordMembershipDescription(),
        serverName: discordMembershipValidationData.serverName,
        roleName: discordMembershipValidationData.roleName,
      });
    };

    await test.step('Upload eleven thumbnails and enforce the maximum', async () => {
      await openDiscordMembershipDetails();
      await uploadHero(page, consultationMediaData.heroImagePath);
      await chooseGalleryFiles(page, consultationMediaData.additionalImagePaths);
      await expectGalleryCount(page, consultationMediaData.maxAdditionalImages);
      await expectGalleryInputUnavailable(page);
    });

    await test.step('Reject undersized and oversized thumbnail fixtures', async () => {
      await openDiscordMembershipDetails();

      const oversized = createOversizedImageFixture();
      try {
        await chooseHeroFile(page, consultationMediaData.tinyImagePath);
        await expectImageTooSmall(page, 'tiny-1x1.png');
        await expectHeroNotUploaded(page);

        await chooseHeroFile(page, oversized.filePath);
        await expectImageTooLarge(page);
        await expectHeroNotUploaded(page);
      } finally {
        oversized.cleanup();
      }
    });
  });
  test('Validate Discord Membership Pricing Rules', {
    tag: ['@AUT-FV-041', '@membership', '@creator', '@regression'],
    annotation: [{ type: 'covers', description: 'TC-DM-C-010, TC-DM-C-011' }],
  }, async ({
    discordMembershipPage, creatorNav, productsPage, page }) => {
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
      await discordMembershipPage.expectDiscordMembershipCreateFlow();
      await discordMembershipPage.prepareDiscordMembershipDetails({
        title: generateDiscordMembershipTitle(),
        description: generateDiscordMembershipDescription(),
        serverName: discordMembershipValidationData.serverName,
        roleName: discordMembershipValidationData.roleName,
      });
    });

    await test.step('Verify free pricing and accept a positive paid price', async () => {
      defaultPricingEnabled = await readPricingEnabled(page);
      expect.soft(defaultPricingEnabled, 'Discord Membership should default to Free').toBe(false);

      await setPricingEnabled(page, false);
      await expectPreviewWithoutPaidPrice(page);
      await setPricingEnabled(page, true);
      await fillPrice(page, discordMembershipPricingData.validPrice);
      await expectPreviewPaidPrice(page, discordMembershipPricingData.previewPaidPricePattern);
    });

    await test.step('Reject zero when paid pricing is enabled', async () => {
      await fillPrice(page, discordMembershipPricingData.zeroPrice);
      await discordMembershipPage.submitDiscordMembershipPricing();
      zeroPriceRejected = await discordMembershipPage.isDiscordMembershipZeroPriceRejected();
      expect.soft(zeroPriceRejected, 'Zero price should be rejected when paid pricing is enabled').toBe(true);
      test.fail(
        defaultPricingEnabled || !zeroPriceRejected,
        'Discord Membership pricing validation gap: pricing defaults to paid or accepts zero price',
      );
    });
  });
  test('Validate Discord Membership Draft, Publish, Edit, and Republish Lifecycle', {
    tag: ['@AUT-FV-042', '@membership', '@creator', '@regression'],
    annotation: [{ type: 'covers', description: 'TC-DM-C-019, TC-DM-C-020, TC-DM-C-026, TC-DM-C-029' }],
  }, async ({
    discordMembershipPage, creatorNav, productsPage, productPurchasePage, page }) => {
    test.setTimeout(300000);

    const accessToken = process.env.YAPP_TEST_ACCESS_TOKEN?.replace(/"/g, '');
    test.skip(!accessToken, 'YAPP_TEST_ACCESS_TOKEN is required to clean up Discord Membership lifecycle data');
    if (!accessToken) return;

    const discordType = productsCreationData.productTypes.find(
      (type) => type.label === 'Discord Membership',
    )!;
    const title = generateDiscordMembershipTitle();
    const description = generateDiscordMembershipDescription();
    const editedTitle = generateDiscordMembershipTitle();
    const editedDescription = generateDiscordMembershipDescription();
    const republishedTitle = generateDiscordMembershipTitle();
    const republishedDescription = generateDiscordMembershipDescription();
    let productUuid = '';
    let sharePath = '';
    let draftPubliclyPurchasable = false;

    const openDiscordMembershipCreate = async () => {
      await creatorNav.open('products');
      await productsPage.expectLoaded();
      await productsPage.openAddProductSheet();
      await productsPage.selectProductType(discordType.buttonName);
      await discordMembershipPage.expectDiscordMembershipCreateFlow();
      await discordMembershipPage.prepareDiscordMembershipDetails({
        title,
        description,
        serverName: discordMembershipValidationData.serverName,
        roleName: discordMembershipValidationData.roleName,
      });
      await uploadHero(page, consultationMediaData.heroImagePath);
      await fillPrice(page, discordMembershipPricingData.validPrice);
    };

    try {
      await test.step('Publish a valid Discord Membership', async () => {
        await openDiscordMembershipCreate();
        sharePath = await discordMembershipPage.publishDiscordMembershipAndReadSharePath();
        const copied = await copyProductCompleteLink(page);
        expect(copied).toContain(sharePath);
        await closeProductCompleteModal(page);
      });

      await test.step('Edit the published product and save changes as a draft', async () => {
        await creatorNav.open('products');
        await productsPage.expectLoaded();
        await productsPage.selectStatusTab('Active');
        await productsPage.searchProducts(title);
        await productsPage.openEditProduct(title);
        productUuid = await discordMembershipPage.readDiscordMembershipProductUuidFromUrl();
        await discordMembershipPage.expectDiscordMembershipEditorValues({
          title,
          description,
          serverName: discordMembershipValidationData.serverName,
          roleName: discordMembershipValidationData.roleName,
        });
        await discordMembershipPage.fillDiscordMembershipTitle(editedTitle);
        await discordMembershipPage.fillDiscordMembershipDescription(editedDescription);
        await discordMembershipPage.navigateAwayFromDiscordMembershipViaBack();
        await discordMembershipPage.expectDiscordMembershipUnsavedChangesDialog();
        await discordMembershipPage.saveDiscordMembershipChangesFromUnsavedDialog();
        await productsPage.selectStatusTab('Draft');
        await productsPage.searchProducts(editedTitle);
        await productsPage.expectProductVisible(editedTitle);
        await productsPage.expectProductRowStatus(editedTitle, 'DRAFT');
        expect(await productsPage.readProductSharePath(editedTitle)).toBe(sharePath);
      });

      await test.step('Verify the draft is not publicly displayed or purchasable', async () => {
        await productPurchasePage.gotoSharePath(sharePath);
        draftPubliclyPurchasable = await productPurchasePage.isProductPubliclyPurchasable();
        expect.soft(
          draftPubliclyPurchasable,
          'A Discord Membership saved as draft should not be publicly purchasable',
        ).toBe(false);
        test.fail(
          draftPubliclyPurchasable,
          'Discord Membership draft visibility gap detected after Back → Save Changes',
        );
      });

      await test.step('Open the pre-populated draft editor and publish it', async () => {
        await creatorNav.open('products');
        await productsPage.expectLoaded();
        await productsPage.selectStatusTab('Draft');
        await productsPage.searchProducts(editedTitle);
        await productsPage.openEditProduct(editedTitle);
        expect(await discordMembershipPage.readDiscordMembershipProductUuidFromUrl()).toBe(productUuid);
        await discordMembershipPage.expectDiscordMembershipEditorValues({
          title: editedTitle,
          description: editedDescription,
          serverName: discordMembershipValidationData.serverName,
          roleName: discordMembershipValidationData.roleName,
        });
        await discordMembershipPage.submitDiscordMembershipDetails();
        expect(await discordMembershipPage.publishDiscordMembershipAndReadSharePath()).toBe(sharePath);
        await closeProductCompleteModal(page);
      });

      await test.step('Edit and republish while preserving the share URL', async () => {
        await creatorNav.open('products');
        await productsPage.expectLoaded();
        await productsPage.selectStatusTab('Active');
        await productsPage.searchProducts(editedTitle);
        await productsPage.openEditProduct(editedTitle);
        expect(await discordMembershipPage.readDiscordMembershipProductUuidFromUrl()).toBe(productUuid);
        await discordMembershipPage.fillDiscordMembershipTitle(republishedTitle);
        await discordMembershipPage.fillDiscordMembershipDescription(republishedDescription);
        await discordMembershipPage.submitDiscordMembershipDetails();
        expect(await discordMembershipPage.publishDiscordMembershipAndReadSharePath()).toBe(sharePath);
        await closeProductCompleteModal(page);
      });

    } finally {
      if (productUuid) {
        await deleteProduct(page.request, productUuid, accessToken).catch(() => undefined);
      }
    }
  });
  test('Validate Discord Membership Product Settings Edit', {
    tag: ['@AUT-FV-045', '@membership', '@creator', '@regression'],
    annotation: [{ type: 'covers', description: 'TC-DM-C-027, TC-DM-C-028' }],
  }, async ({
    discordMembershipPage, creatorNav, productsPage, page }) => {
    test.setTimeout(300000);

    const accessToken = process.env.YAPP_TEST_ACCESS_TOKEN?.replace(/"/g, '');
    test.skip(!accessToken, 'YAPP_TEST_ACCESS_TOKEN is required to clean up Discord Membership settings data');
    if (!accessToken) return;

    const discordType = productsCreationData.productTypes.find(
      (type) => type.label === 'Discord Membership',
    )!;
    const title = generateDiscordMembershipTitle();
    const description = generateDiscordMembershipDescription();
    const settingsNote = generateDiscordMembershipSettingsNote();
    const buyerQuestion = generateDiscordMembershipBuyerQuestion();
    let productUuid = '';

    const openDiscordMembershipCreate = async () => {
      await creatorNav.open('products');
      await productsPage.expectLoaded();
      await productsPage.openAddProductSheet();
      await productsPage.selectProductType(discordType.buttonName);
      await discordMembershipPage.expectDiscordMembershipCreateFlow();
      await discordMembershipPage.prepareDiscordMembershipDetails({
        title,
        description,
        serverName: discordMembershipValidationData.serverName,
        roleName: discordMembershipValidationData.roleName,
      });
      await uploadHero(page, consultationMediaData.heroImagePath);
      await fillPrice(page, discordMembershipPricingData.validPrice);
      await discordMembershipPage.submitDiscordMembershipPricing();
      await expectProductCompleteModal(page);
      await closeProductCompleteModal(page);
    };

    try {
      await test.step('Create and publish a Discord Membership baseline', async () => {
        await openDiscordMembershipCreate();
      });

      await test.step('Change Discord server and role explicitly', async () => {
        await creatorNav.open('products');
        await productsPage.expectLoaded();
        await productsPage.selectStatusTab('Active');
        await productsPage.searchProducts(title);
        await productsPage.openEditProduct(title);
        productUuid = await discordMembershipPage.readDiscordMembershipProductUuidFromUrl();
        await discordMembershipPage.selectDiscordMembershipServer(discordMembershipValidationData.serverName);
        await discordMembershipPage.selectDiscordMembershipRole(discordMembershipValidationData.roleName);
        await discordMembershipPage.expectDiscordMembershipServerAndRole(
          discordMembershipValidationData.serverName,
          discordMembershipValidationData.roleName,
        );
      });

      await test.step('Save Discord configuration and edit pricing, notes, advanced settings, benefits, and buyer form', async () => {
        await discordMembershipPage.continueToDiscordMembershipDetails();
        await discordMembershipPage.expectDiscordMembershipSettingsSections();
        await discordMembershipPage.fillDiscordMembershipSettingsPrice(discordMembershipSettingsData.updatedPrice);
        await discordMembershipPage.fillDiscordMembershipAfterSalesMessage(settingsNote);
        await discordMembershipPage.setDiscordMembershipHideFromExplore(discordMembershipSettingsData.hideFromExplore);
        await addCustomBuyerQuestion(page, buyerQuestion);
        await discordMembershipPage.submitDiscordMembershipPricing();
        await expectProductCompleteModal(page);
        await closeProductCompleteModal(page);
      });

      await test.step('Reopen the editor and verify saved settings', async () => {
        await creatorNav.open('products');
        await productsPage.expectLoaded();
        await productsPage.selectStatusTab('Active');
        await productsPage.searchProducts(title);
        await productsPage.openEditProduct(title);
        expect(await discordMembershipPage.readDiscordMembershipProductUuidFromUrl()).toBe(productUuid);
        await discordMembershipPage.expectDiscordMembershipServerAndRole(
          discordMembershipValidationData.serverName,
          discordMembershipValidationData.roleName,
        );
        await discordMembershipPage.continueToDiscordMembershipDetails();
        await discordMembershipPage.expectDiscordMembershipSettingsPrice(discordMembershipSettingsData.updatedPrice);
        await discordMembershipPage.expectDiscordMembershipAfterSalesMessage(settingsNote);
        await discordMembershipPage.expectDiscordMembershipHideFromExplore(discordMembershipSettingsData.hideFromExplore);
        const buyerQuestionPersisted = await discordMembershipPage.isDiscordMembershipBuyerQuestionVisible(buyerQuestion);
        expect.soft(
          buyerQuestionPersisted,
          'A saved Discord Membership buyer question should persist when the editor is reopened',
        ).toBe(true);
        test.fail(
          !buyerQuestionPersisted,
          'Discord Membership buyer-form question persistence gap detected',
        );
      });
    } finally {
      if (productUuid) {
        await deleteProduct(page.request, productUuid, accessToken).catch(() => undefined);
      }
    }
  });
});
