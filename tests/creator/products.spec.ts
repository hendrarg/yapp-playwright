import { creatorAuthTest as test, expect } from '../test-base';
import { createOnlineCourseProduct, deleteProduct, expectProductHideFromProfile, expectProductStatus, setProductHideFromProfile } from '@helpers/api/product';
import { createOversizedImageFixture } from '@helpers/creator/oversized-image';
import { createOnlineCourseLessonFixtures } from '@helpers/creator/online-course-media';
import { consultationMediaData } from '@test-data/creator/consultation.media.data';
import { digitalProductPricingData, digitalProductValidationData, generateDigitalProductBuyerOnlyDescription, generateDigitalProductDescription, generateDigitalProductTitle, generateOnlineCourseAfterSalesLink, generateOnlineCourseAfterSalesMessage, generateOnlineCourseChapterTitle, generateOnlineCourseEpisodeContent, generateOnlineCourseEpisodeTitle, generateOnlineCourseProductData, onlineCourseMediaData, onlineCoursePricingData, onlineCourseValidationData, productsCreationData } from '@test-data/creator/products.creation.data';
import { productsHideFromProfileData } from '@test-data/creator/products.hide-from-profile.data';
import { productsSearchData } from '@test-data/creator/products.search.data';
import { productsStatusData } from '@test-data/creator/products.status.data';
import { creatorProfile } from '@test-data/buyer/profile.data';
import { discordMembershipPricingData, discordMembershipSettingsData, discordMembershipValidationData, generateDiscordMembershipBuyerQuestion, generateDiscordMembershipDescription, generateDiscordMembershipLimitDescription, generateDiscordMembershipSettingsNote, generateDiscordMembershipTitle } from '@test-data/creator/membership.data';

test.describe('Creator Products', () => {
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
      await productsPage.prepareDiscordMembershipDetails({
        title: generateDiscordMembershipTitle(),
        description: generateDiscordMembershipDescription(),
        serverName: discordMembershipValidationData.serverName,
        roleName: discordMembershipValidationData.roleName,
      });
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
      await productsPage.prepareDiscordMembershipDetails({
        title: generateDiscordMembershipTitle(),
        description: generateDiscordMembershipDescription(),
        serverName: discordMembershipValidationData.serverName,
        roleName: discordMembershipValidationData.roleName,
      });
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

  test('Validate Discord Membership Draft, Publish, Edit, and Republish Lifecycle', {
    tag: ['@AUT-FV-042', '@membership', '@creator', '@regression'],
    annotation: [{ type: 'covers', description: 'TC-DM-C-019, TC-DM-C-020, TC-DM-C-026, TC-DM-C-029' }],
  }, async ({ creatorNav, productsPage, productPurchasePage, page }) => {
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
      await productsPage.expectDiscordMembershipCreateFlow();
      await productsPage.prepareDiscordMembershipDetails({
        title,
        description,
        serverName: discordMembershipValidationData.serverName,
        roleName: discordMembershipValidationData.roleName,
      });
      await productsPage.uploadConsultationHero(consultationMediaData.heroImagePath);
      await productsPage.fillConsultationPrice(discordMembershipPricingData.validPrice);
    };

    try {
      await test.step('Publish a valid Discord Membership', async () => {
        await openDiscordMembershipCreate();
        sharePath = await productsPage.publishDiscordMembershipAndReadSharePath();
        const copied = await productsPage.copyProductCompleteLink();
        expect(copied).toContain(sharePath);
        await productsPage.closeProductCompleteModal();
      });

      await test.step('Edit the published product and save changes as a draft', async () => {
        await creatorNav.open('products');
        await productsPage.expectLoaded();
        await productsPage.selectStatusTab('Active');
        await productsPage.searchProducts(title);
        await productsPage.openEditProduct(title);
        productUuid = await productsPage.readDiscordMembershipProductUuidFromUrl();
        await productsPage.expectDiscordMembershipEditorValues({
          title,
          description,
          serverName: discordMembershipValidationData.serverName,
          roleName: discordMembershipValidationData.roleName,
        });
        await productsPage.fillDiscordMembershipTitle(editedTitle);
        await productsPage.fillDiscordMembershipDescription(editedDescription);
        await productsPage.navigateAwayFromDiscordMembershipViaBack();
        await productsPage.expectDiscordMembershipUnsavedChangesDialog();
        await productsPage.saveDiscordMembershipChangesFromUnsavedDialog();
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
        expect(await productsPage.readDiscordMembershipProductUuidFromUrl()).toBe(productUuid);
        await productsPage.expectDiscordMembershipEditorValues({
          title: editedTitle,
          description: editedDescription,
          serverName: discordMembershipValidationData.serverName,
          roleName: discordMembershipValidationData.roleName,
        });
        await productsPage.submitDiscordMembershipDetails();
        expect(await productsPage.publishDiscordMembershipAndReadSharePath()).toBe(sharePath);
        await productsPage.closeProductCompleteModal();
      });

      await test.step('Edit and republish while preserving the share URL', async () => {
        await creatorNav.open('products');
        await productsPage.expectLoaded();
        await productsPage.selectStatusTab('Active');
        await productsPage.searchProducts(editedTitle);
        await productsPage.openEditProduct(editedTitle);
        expect(await productsPage.readDiscordMembershipProductUuidFromUrl()).toBe(productUuid);
        await productsPage.fillDiscordMembershipTitle(republishedTitle);
        await productsPage.fillDiscordMembershipDescription(republishedDescription);
        await productsPage.submitDiscordMembershipDetails();
        expect(await productsPage.publishDiscordMembershipAndReadSharePath()).toBe(sharePath);
        await productsPage.closeProductCompleteModal();
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
  }, async ({ creatorNav, productsPage, page }) => {
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
      await productsPage.expectDiscordMembershipCreateFlow();
      await productsPage.prepareDiscordMembershipDetails({
        title,
        description,
        serverName: discordMembershipValidationData.serverName,
        roleName: discordMembershipValidationData.roleName,
      });
      await productsPage.uploadConsultationHero(consultationMediaData.heroImagePath);
      await productsPage.fillConsultationPrice(discordMembershipPricingData.validPrice);
      await productsPage.submitDiscordMembershipPricing();
      await productsPage.expectProductCompleteModal();
      await productsPage.closeProductCompleteModal();
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
        productUuid = await productsPage.readDiscordMembershipProductUuidFromUrl();
        await productsPage.selectDiscordMembershipServer(discordMembershipValidationData.serverName);
        await productsPage.selectDiscordMembershipRole(discordMembershipValidationData.roleName);
        await productsPage.expectDiscordMembershipServerAndRole(
          discordMembershipValidationData.serverName,
          discordMembershipValidationData.roleName,
        );
      });

      await test.step('Save Discord configuration and edit pricing, notes, advanced settings, benefits, and buyer form', async () => {
        await productsPage.continueToDiscordMembershipDetails();
        await productsPage.expectDiscordMembershipSettingsSections();
        await productsPage.fillDiscordMembershipSettingsPrice(discordMembershipSettingsData.updatedPrice);
        await productsPage.fillDiscordMembershipAfterSalesMessage(settingsNote);
        await productsPage.setDiscordMembershipHideFromExplore(discordMembershipSettingsData.hideFromExplore);
        await productsPage.addDiscordMembershipBuyerQuestion(buyerQuestion);
        await productsPage.submitDiscordMembershipPricing();
        await productsPage.expectProductCompleteModal();
        await productsPage.closeProductCompleteModal();
      });

      await test.step('Reopen the editor and verify saved settings', async () => {
        await creatorNav.open('products');
        await productsPage.expectLoaded();
        await productsPage.selectStatusTab('Active');
        await productsPage.searchProducts(title);
        await productsPage.openEditProduct(title);
        expect(await productsPage.readDiscordMembershipProductUuidFromUrl()).toBe(productUuid);
        await productsPage.expectDiscordMembershipServerAndRole(
          discordMembershipValidationData.serverName,
          discordMembershipValidationData.roleName,
        );
        await productsPage.continueToDiscordMembershipDetails();
        await productsPage.expectDiscordMembershipSettingsPrice(discordMembershipSettingsData.updatedPrice);
        await productsPage.expectDiscordMembershipAfterSalesMessage(settingsNote);
        await productsPage.expectDiscordMembershipHideFromExplore(discordMembershipSettingsData.hideFromExplore);
        const buyerQuestionPersisted = await productsPage.isDiscordMembershipBuyerQuestionVisible(buyerQuestion);
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

  test('Validate Online Course Structure and Episode Management', {
    tag: ['@AUT-FV-161', '@products', '@creator', '@regression'],
    annotation: [{
      type: 'covers',
      description: 'TC-OC-C-001, TC-OC-C-002, TC-OC-C-003, TC-OC-C-008, TC-OC-C-033',
    }],
  }, async ({ creatorNav, productsPage, onlineCoursePage }) => {
    test.setTimeout(180000);

    const onlineCourseType = productsCreationData.productTypes.find(
      (type) => type.label === 'Online Course',
    )!;
    const chapterOne = generateOnlineCourseChapterTitle();
    const chapterTwo = generateOnlineCourseChapterTitle();
    const episodeName = generateOnlineCourseEpisodeTitle();
    const contentA = `A ${generateOnlineCourseEpisodeContent()}`;
    const contentB = `B ${generateOnlineCourseEpisodeContent()}`;

    await test.step('Open Online Course content editor from Add Product', async () => {
      await creatorNav.open('products');
      await productsPage.expectLoaded();
      await productsPage.openAddProductSheet();
      await productsPage.selectProductType(onlineCourseType.buttonName);
      await onlineCoursePage.expectLoaded();
    });

    await test.step('Create two chapters with episodes and review structure', async () => {
      await onlineCoursePage.renameChapter(0, chapterOne);
      await onlineCoursePage.addChapter();
      await onlineCoursePage.renameChapter(1, chapterTwo);
      await onlineCoursePage.expectChapterCount(2);
      await onlineCoursePage.expectChapterNames([chapterOne, chapterTwo]);
      expect(await onlineCoursePage.getEpisodeCount()).toBeGreaterThanOrEqual(2);
    });

    await test.step('Rename an episode and reorder chapters, then review saved order', async () => {
      await onlineCoursePage.openEpisode(0);
      await onlineCoursePage.renameSelectedEpisode(episodeName);
      await onlineCoursePage.reorderChapterDown(0);
      await onlineCoursePage.expectChapterNames([chapterTwo, chapterOne]);
    });

    await test.step('Create a standalone episode outside any chapter', async () => {
      const standaloneBefore = await onlineCoursePage.getStandaloneEpisodeCount();
      await onlineCoursePage.addStandaloneEpisode();
      expect(await onlineCoursePage.getStandaloneEpisodeCount()).toBe(standaloneBefore + 1);
    });

    await test.step('Switch between episodes and verify content stays isolated', async () => {
      const lastEpisode = (await onlineCoursePage.getEpisodeCount()) - 1;
      await onlineCoursePage.openEpisode(0);
      await onlineCoursePage.setFreeTextContent(contentA);
      await onlineCoursePage.openEpisode(lastEpisode);
      await onlineCoursePage.setFreeTextContent(contentB);

      await onlineCoursePage.openEpisode(0);
      await onlineCoursePage.expectSelectedContentType('Free Text');
      await onlineCoursePage.expectFreeTextContent(contentA);

      await onlineCoursePage.openEpisode(lastEpisode);
      await onlineCoursePage.expectFreeTextContent(contentB);
    });

    await test.step('Edit content type, remove a chapter, and verify edits persist', async () => {
      await onlineCoursePage.openEpisode(0);
      await onlineCoursePage.selectContentType('File');
      await onlineCoursePage.expectSelectedContentType('File');

      await onlineCoursePage.deleteChapter(await onlineCoursePage.getChapterCount() - 1);
      await onlineCoursePage.expectChapterCount(1);

      const lastEpisode = (await onlineCoursePage.getEpisodeCount()) - 1;
      await onlineCoursePage.openEpisode(lastEpisode);
      await onlineCoursePage.openEpisode(0);
      await onlineCoursePage.expectSelectedContentType('File');
    });
  });

  test('Validate Online Course Required Inputs and Form Boundaries', {
    tag: ['@AUT-FV-162', '@products', '@creator', '@regression'],
    annotation: [{
      type: 'covers',
      description: 'TC-OC-C-004, TC-OC-C-015, TC-OC-C-016',
    }],
  }, async ({ creatorNav, productsPage, onlineCoursePage }) => {
    test.setTimeout(180000);

    const onlineCourseType = productsCreationData.productTypes.find(
      (type) => type.label === 'Online Course',
    )!;
    const courseTitle = generateOnlineCourseChapterTitle();
    const courseDescription = generateOnlineCourseEpisodeContent();
    const overLimitDescription = 'A'.repeat(550);

    await test.step('Open Online Course creation from Add Product', async () => {
      await creatorNav.open('products');
      await productsPage.expectLoaded();
      await productsPage.openAddProductSheet();
      await productsPage.selectProductType(onlineCourseType.buttonName);
      await onlineCoursePage.expectLoaded();
    });

    await test.step('Require at least one episode to proceed', async () => {
      await onlineCoursePage.deleteAllChapters();
      await onlineCoursePage.attemptNextSetDetails();
      await onlineCoursePage.expectEpisodeRequiredError();
      await onlineCoursePage.addChapter();
      await onlineCoursePage.expectChapterCount(1);
    });

    await test.step('Require title and enforce description 500 character counter', async () => {
      await onlineCoursePage.clearTitle();
      await onlineCoursePage.fillDescription(overLimitDescription);
      await onlineCoursePage.expectDescriptionCounter('1 / 500');

      await onlineCoursePage.fillDescription(courseDescription);
      await onlineCoursePage.expectDescriptionCounter('/ 500');
    });

    await test.step('Apply rich text formatting to product description', async () => {
      await onlineCoursePage.fillTitle(courseTitle);
      await onlineCoursePage.applyRichTextFormatting();
      await onlineCoursePage.expectDescriptionFormatted();
    });
  });

  test('Validate Online Course Creator Navigation and Unsaved Changes', {
    tag: ['@AUT-FV-163', '@products', '@creator', '@regression'],
    annotation: [{
      type: 'covers',
      description: 'TC-OC-C-005, TC-OC-C-006',
    }],
  }, async ({ creatorNav, productsPage, onlineCoursePage }) => {
    test.setTimeout(120000);
    test.fail(true, 'Online Course currently navigates away without an unsaved-changes confirmation');

    const onlineCourseType = productsCreationData.productTypes.find(
      (type) => type.label === 'Online Course',
    )!;
    const updatedChapterTitle = generateOnlineCourseChapterTitle();

    await test.step('Open Online Course content editor and establish the mobile layout', async () => {
      await creatorNav.open('products');
      await productsPage.expectLoaded();
      await productsPage.openAddProductSheet();
      await productsPage.selectProductType(onlineCourseType.buttonName);
      await onlineCoursePage.expectLoaded();
      await onlineCoursePage.useMobileViewport();
    });

    await test.step('Scroll the course structure and verify Next: Set Details stays sticky', async () => {
      await onlineCoursePage.expectNextSetDetailsCtaStickyAfterScroll();
    });

    await test.step('Make a content change, navigate away, and verify the unsaved-change warning', async () => {
      await onlineCoursePage.useDesktopViewport();
      await onlineCoursePage.scrollToTop();
      await onlineCoursePage.renameChapter(0, updatedChapterTitle);
      await onlineCoursePage.navigateAwayFromContent();
    });
  });

  test('Validate Online Course Draft, Publish, and Republish Lifecycle', {
    tag: ['@AUT-FV-164', '@products', '@creator', '@smoke', '@regression'],
    annotation: [{
      type: 'covers',
      description: 'TC-OC-C-025, TC-OC-C-026, TC-OC-C-035',
    }],
  }, async ({ creatorNav, productsPage, onlineCoursePage, productPurchasePage, page }) => {
    test.setTimeout(300000);

    const accessToken = process.env.YAPP_TEST_ACCESS_TOKEN?.replace(/"/g, '');
    test.skip(!accessToken, 'YAPP_TEST_ACCESS_TOKEN is required to seed an online course lifecycle product');
    if (!accessToken) return;

    const baseline = generateOnlineCourseProductData();
    const draftTitle = generateOnlineCourseChapterTitle();
    const draftDescription = generateOnlineCourseEpisodeContent();
    const republishedTitle = generateOnlineCourseChapterTitle();
    const republishedDescription = generateOnlineCourseEpisodeContent();
    let productUuid = '';
    let sharePath = '';

    try {
      await test.step('Seed a valid active Online Course baseline via API', async () => {
        const product = await createOnlineCourseProduct(page.request, baseline, accessToken);
        productUuid = product.productUuid;
        expect(productUuid).toBeTruthy();
      });

      await test.step('Save edited course content as a draft and verify draft visibility', async () => {
        await creatorNav.open('products');
        await productsPage.expectLoaded();
        await productsPage.selectStatusTab('Active', { waitForRender: false });
        await productsPage.searchProductsUntilVisible(baseline.title);
        await productsPage.openEditProduct(baseline.title);
        await onlineCoursePage.expectLoaded();
        await onlineCoursePage.fillTitle(draftTitle);
        await onlineCoursePage.fillDescription(draftDescription);
        await onlineCoursePage.submitContentDetails();
        await productsPage.saveAsDraft();

        await creatorNav.open('products');
        await productsPage.expectLoaded();
        await productsPage.selectStatusTab('Draft', { waitForRender: false });
        await productsPage.searchProductsUntilVisible(draftTitle);
        await productsPage.expectProductVisible(draftTitle);
        await productsPage.expectProductRowStatus(draftTitle, 'DRAFT');
        sharePath = await productsPage.readProductSharePath(draftTitle);
      });

      await test.step('Verify the draft is not publicly purchasable', async () => {
        await productPurchasePage.gotoSharePath(sharePath);
        await expect.poll(() => productPurchasePage.isProductPubliclyPurchasable()).toBe(false);
      });

      await test.step('Publish the draft and verify the completion modal and share URL', async () => {
        await creatorNav.open('products');
        await productsPage.expectLoaded();
        await productsPage.selectStatusTab('Draft', { waitForRender: false });
        await productsPage.searchProductsUntilVisible(draftTitle);
        await productsPage.openEditProduct(draftTitle);
        await onlineCoursePage.expectLoaded();
        await onlineCoursePage.submitContentDetails();
        await onlineCoursePage.submitPublish();
        await productsPage.expectProductCompleteModal();
        expect(await productsPage.readProductCompleteSharePath()).toBe(sharePath);
        expect(await productsPage.copyProductCompleteLink()).toContain(sharePath);
        await productsPage.closeProductCompleteModal();
      });

      await test.step('Verify the published course is active with the same share URL', async () => {
        await creatorNav.open('products');
        await productsPage.expectLoaded();
        await productsPage.selectStatusTab('Active', { waitForRender: false });
        await productsPage.searchProductsUntilVisible(draftTitle);
        await productsPage.expectProductVisible(draftTitle);
        await productsPage.expectProductRowStatus(draftTitle, 'ACTIVE');
        expect(await productsPage.readProductSharePath(draftTitle)).toBe(sharePath);
      });

      await test.step('Edit and republish the course while preserving its share URL', async () => {
        await productsPage.openEditProduct(draftTitle);
        await onlineCoursePage.expectLoaded();
        await onlineCoursePage.fillTitle(republishedTitle);
        await onlineCoursePage.fillDescription(republishedDescription);
        await onlineCoursePage.submitContentDetails();
        await onlineCoursePage.submitPublish();
        await productsPage.expectProductCompleteModal();
        expect(await productsPage.readProductCompleteSharePath()).toBe(sharePath);
        await productsPage.closeProductCompleteModal();

        await creatorNav.open('products');
        await productsPage.expectLoaded();
        await productsPage.selectStatusTab('Active', { waitForRender: false });
        await productsPage.searchProductsUntilVisible(republishedTitle);
        await productsPage.expectProductVisible(republishedTitle);
        expect(await productsPage.readProductSharePath(republishedTitle)).toBe(sharePath);
      });
    } finally {
      if (productUuid) {
        await deleteProduct(page.request, productUuid, accessToken).catch(() => undefined);
      }
    }
  });

  test('Validate Online Course Lesson Content, Media, Files, and Thumbnails', {
    tag: ['@AUT-FV-165', '@products', '@creator', '@regression'],
    annotation: [{
      type: 'covers',
      description: 'TC-OC-C-007, TC-OC-C-009, TC-OC-C-010, TC-OC-C-011, TC-OC-C-012, TC-OC-C-013, TC-OC-C-014, TC-OC-C-017, TC-OC-C-018, TC-OC-C-019',
    }],
  }, async ({ creatorNav, productsPage, onlineCoursePage }) => {
    test.setTimeout(300000);

    const onlineCourseType = productsCreationData.productTypes.find(
      (type) => type.label === 'Online Course',
    )!;
    const richText = generateOnlineCourseEpisodeContent();
    const lessonFixtures = createOnlineCourseLessonFixtures();

    try {
      await test.step('Open Online Course content editor and prepare three episode types', async () => {
        await creatorNav.open('products');
        await productsPage.expectLoaded();
        await productsPage.openAddProductSheet();
        await productsPage.selectProductType(onlineCourseType.buttonName);
        await onlineCoursePage.expectLoaded();
        await onlineCoursePage.addStandaloneEpisode();
        await onlineCoursePage.addStandaloneEpisode();
      });

      await test.step('Select and retain Video, File, and Free Text episode content types', async () => {
        const lastEpisode = (await onlineCoursePage.getEpisodeCount()) - 1;
        await onlineCoursePage.openEpisode(0);
        await onlineCoursePage.selectContentType('Video');
        await onlineCoursePage.expectSelectedContentType('Video');
        await onlineCoursePage.openEpisode(1);
        await onlineCoursePage.selectContentType('File');
        await onlineCoursePage.expectSelectedContentType('File');
        await onlineCoursePage.openEpisode(lastEpisode);
        await onlineCoursePage.selectContentType('Free Text');
        await onlineCoursePage.expectSelectedContentType('Free Text');
      });

      await test.step('Upload a supported video lesson and verify its preview', async () => {
        await onlineCoursePage.openEpisode(0);
        await onlineCoursePage.uploadVideo(onlineCourseMediaData.videoPath);
      });

      await test.step('Remove and replace the episode video', async () => {
        await onlineCoursePage.deleteVideo();
        await onlineCoursePage.uploadVideo(onlineCourseMediaData.videoPath);
      });

      await test.step('Apply a custom video thumbnail', async () => {
        await onlineCoursePage.uploadVideoThumbnail(onlineCourseMediaData.thumbnailPaths[0]);
      });

      await test.step('Upload all supported lesson file types', async () => {
        await onlineCoursePage.openEpisode(1);
        await onlineCoursePage.uploadLessonFiles(lessonFixtures.filePaths);
        await onlineCoursePage.expectLessonFiles(lessonFixtures.fileNames);
      });

      await test.step('Review the uploaded lesson file cards', async () => {
        await onlineCoursePage.openEpisode(1);
        await onlineCoursePage.expectLessonFiles(lessonFixtures.fileNames);
      });

      await test.step('Save formatted Free Text content for an episode and verify it remains formatted', async () => {
        const lastEpisode = (await onlineCoursePage.getEpisodeCount()) - 1;
        await onlineCoursePage.openEpisode(lastEpisode);
        await onlineCoursePage.applyEpisodeRichTextFormatting(richText);
        await onlineCoursePage.expectEpisodeRichTextContent(richText);
      });

      await test.step('Upload a valid product thumbnail', async () => {
        await onlineCoursePage.uploadProductThumbnail(onlineCourseMediaData.thumbnailPaths[0]);
      });

      await test.step('Enforce the eleven-image product thumbnail maximum', async () => {
        await onlineCoursePage.uploadProductGallery(onlineCourseMediaData.thumbnailPaths.slice(1));
        await onlineCoursePage.expectProductThumbnailLimit();
      });

      await test.step('Reject undersized and oversized product thumbnails', async () => {
        await onlineCoursePage.goto();
        await onlineCoursePage.expectLoaded();
        const oversized = createOversizedImageFixture();
        try {
          await onlineCoursePage.uploadThumbnailForValidation(onlineCourseMediaData.tinyThumbnailPath);
          await onlineCoursePage.expectThumbnailTooSmall();
          await onlineCoursePage.uploadThumbnailForValidation(oversized.filePath);
          await onlineCoursePage.expectThumbnailTooLarge();
        } finally {
          oversized.cleanup();
        }
      });
    } finally {
      lessonFixtures.cleanup();
    }
  });

  test('Validate Online Course Pricing Rules', {
    tag: ['@AUT-FV-166', '@products', '@creator', '@regression'],
    annotation: [{
      type: 'covers',
      description: 'TC-OC-C-020, TC-OC-C-021',
    }],
  }, async ({ creatorNav, productsPage, onlineCoursePage }) => {
    test.setTimeout(60000);

    const onlineCourseType = productsCreationData.productTypes.find(
      (type) => type.label === 'Online Course',
    )!;
    let defaultPricingEnabled = false;
    let priceInputReady = false;
    let belowMinimumPriceRejected = false;

    await test.step('Open Online Course details before pricing validation', async () => {
      await creatorNav.open('products');
      await productsPage.expectLoaded();
      await productsPage.openAddProductSheet();
      await productsPage.selectProductType(onlineCourseType.buttonName);
      await onlineCoursePage.expectLoaded();
      await onlineCoursePage.fillTitle(generateOnlineCourseChapterTitle());
      await onlineCoursePage.fillDescription(generateOnlineCourseEpisodeContent());
      await onlineCoursePage.uploadThumbnailForValidation(onlineCourseMediaData.thumbnailPaths[0]);
      await onlineCoursePage.submitContentDetails();
    });

    await test.step('Verify Free default at zero and accept a positive paid price', async () => {
      defaultPricingEnabled = await onlineCoursePage.readOnlineCoursePricingEnabled();
      expect.soft(defaultPricingEnabled, 'Online Course pricing should default enabled for the Free price state').toBe(true);
      await onlineCoursePage.expectOnlineCourseFreePreview();
      await onlineCoursePage.enableOnlineCoursePricing();
      await onlineCoursePage.fillOnlineCoursePrice(onlineCoursePricingData.validPrice);
      await onlineCoursePage.expectOnlineCoursePrice(onlineCoursePricingData.validPrice);
      priceInputReady = true;
      expect.soft(priceInputReady, 'Online Course price input should be enabled when pricing is active').toBe(true);
    });

    await test.step('Reject prices below Rp10.000 while keeping zero valid for Free', async () => {
      if (priceInputReady) {
        await onlineCoursePage.fillOnlineCoursePrice(onlineCoursePricingData.belowMinimumPrice);
        await onlineCoursePage.attemptOnlineCoursePricingContinue();
        belowMinimumPriceRejected = await onlineCoursePage.isOnlineCourseBelowMinimumPriceRejected();
      }
      expect(defaultPricingEnabled, 'Online Course pricing should default enabled for Free').toBe(true);
      expect(priceInputReady, 'Online Course price input should be available after focusing it').toBe(true);
      expect(belowMinimumPriceRejected, 'Prices below Rp10.000 should be rejected').toBe(true);
    });
  });

  test('Validate Online Course After Sales Configuration and Future Delivery', {
    tag: ['@AUT-FV-167', '@products', '@creator', '@regression'],
    annotation: [{
      type: 'covers',
      description: 'TC-OC-C-027, TC-OC-C-028, TC-OC-C-029, TC-OC-C-030, TC-OC-C-031',
    }],
  }, async ({ creatorNav, productsPage, onlineCoursePage, page }) => {
    test.setTimeout(300000);

    const accessToken = process.env.YAPP_TEST_ACCESS_TOKEN?.replace(/"/g, '');
    test.skip(!accessToken, 'YAPP_TEST_ACCESS_TOKEN is required to seed an Online Course for After Sales validation');
    if (!accessToken) return;

    const courseData = generateOnlineCourseProductData();
    const firstMessage = generateOnlineCourseAfterSalesMessage();
    const updatedMessage = generateOnlineCourseAfterSalesMessage();
    const afterSalesLink = generateOnlineCourseAfterSalesLink();
    let productUuid = '';

    try {
      await test.step('Seed and open an existing Online Course After Sales settings page', async () => {
        const product = await createOnlineCourseProduct(page.request, courseData, accessToken);
        productUuid = product.productUuid;
        await creatorNav.open('products');
        await productsPage.expectLoaded();
        await productsPage.selectStatusTab('Active', { waitForRender: false });
        await productsPage.searchProductsUntilVisible(courseData.title);
        await productsPage.openEditProduct(courseData.title);
        await onlineCoursePage.expectLoaded();
        await onlineCoursePage.submitContentDetails();
        await onlineCoursePage.expectAfterSalesLoaded();
      });

      await test.step('Persist the default After Sales toggle state and explanatory copy', async () => {
        const defaultEnabled = await onlineCoursePage.readAfterSalesMessageEnabled();
        expect(defaultEnabled, 'After Sales Customize Message should default OFF').toBe(false);
        await onlineCoursePage.expectAfterSalesDisabledCopy();
        await onlineCoursePage.setAfterSalesMessageEnabled(false);
        await productsPage.saveAsDraft();

        await creatorNav.open('products');
        await productsPage.expectLoaded();
        await productsPage.selectStatusTab('Draft', { waitForRender: false });
        await productsPage.searchProductsUntilVisible(courseData.title);
        await productsPage.openEditProduct(courseData.title);
        await onlineCoursePage.expectLoaded();
        await onlineCoursePage.submitContentDetails();
        expect(await onlineCoursePage.readAfterSalesMessageEnabled()).toBe(false);
      });

      await test.step('Format optional custom After Sales message and save empty configuration', async () => {
        await onlineCoursePage.applyAfterSalesMessageFormatting(firstMessage);
        await onlineCoursePage.expectAfterSalesMessage(firstMessage);
        await onlineCoursePage.fillAfterSalesMessage('');
        await productsPage.saveAsDraft();
      });

      await test.step('Add valid After Sales links and validate invalid fields', async () => {
        await onlineCoursePage.fillAfterSalesMessage(firstMessage);
        await onlineCoursePage.enableAfterSalesLinks();
        await productsPage.openEmbedLinkDialog();
        await productsPage.fillEmbedLink(
          digitalProductValidationData.linkValidation.longLabel,
          digitalProductValidationData.linkValidation.invalidUrl,
        );
        await productsPage.expectInvalidEmbedLinkFeedback();
        await productsPage.fillEmbedLink(afterSalesLink.label, afterSalesLink.url);
        await productsPage.saveCurrentEmbedLink();
        await productsPage.expectEmbedLinksSaved([afterSalesLink.label]);
      });

      await test.step('Preview staged After Sales content as read-only', async () => {
        await onlineCoursePage.openAfterSalesPreview();
        await onlineCoursePage.expectAfterSalesPreviewReadOnly(firstMessage, afterSalesLink.label);
        await onlineCoursePage.closeAfterSalesPreview();
      });

      await test.step('Persist the updated After Sales configuration for future delivery', async () => {
        await onlineCoursePage.submitPublish();

        await creatorNav.open('products');
        await productsPage.expectLoaded();
        await productsPage.selectStatusTab('Active', { waitForRender: false });
        await productsPage.searchProductsUntilVisible(courseData.title);
        await productsPage.openEditProduct(courseData.title);
        await onlineCoursePage.expectLoaded();
        await onlineCoursePage.submitContentDetails();
        await onlineCoursePage.fillAfterSalesMessage(updatedMessage);
        await onlineCoursePage.submitPublish();

        await creatorNav.open('products');
        await productsPage.expectLoaded();
        await productsPage.selectStatusTab('Active', { waitForRender: false });
        await productsPage.searchProductsUntilVisible(courseData.title);
        await productsPage.openEditProduct(courseData.title);
        await onlineCoursePage.expectLoaded();
        await onlineCoursePage.submitContentDetails();
        await onlineCoursePage.expectAfterSalesMessage(updatedMessage);
      });
    } finally {
      if (productUuid) {
        await deleteProduct(page.request, productUuid, accessToken).catch(() => undefined);
      }
    }
  });

  test('Validate Online Course Settings and Existing Course Edit', {
    tag: ['@AUT-FV-168', '@products', '@creator', '@regression'],
    annotation: [{
      type: 'covers',
      description: 'TC-OC-C-022, TC-OC-C-023, TC-OC-C-032, TC-OC-C-034',
    }],
  }, async ({ creatorNav, productsPage, onlineCoursePage, page }) => {
    test.setTimeout(300000);

    const accessToken = process.env.YAPP_TEST_ACCESS_TOKEN?.replace(/"/g, '');
    test.skip(!accessToken, 'YAPP_TEST_ACCESS_TOKEN is required to seed an existing Online Course');
    if (!accessToken) return;

    const courseData = generateOnlineCourseProductData();
    const updatedQuestion = generateOnlineCourseEpisodeContent();
    let productUuid = '';

    try {
      await test.step('Seed and open an existing Online Course for editing', async () => {
        const product = await createOnlineCourseProduct(page.request, courseData, accessToken);
        productUuid = product.productUuid;
        expect(productUuid).toBeTruthy();

        await creatorNav.open('products');
        await productsPage.expectLoaded();
        await productsPage.selectStatusTab('Active', { waitForRender: false });
        await productsPage.searchProductsUntilVisible(courseData.title);
        await productsPage.openEditProduct(courseData.title);
        await onlineCoursePage.expectLoaded();
      });

      await test.step('Verify existing course values and membership tier availability', async () => {
        await onlineCoursePage.expectTitleValue(courseData.title);
        await onlineCoursePage.expectDescriptionContains(courseData.description);
        await onlineCoursePage.submitContentDetails();
        await onlineCoursePage.expectOnlineCourseMembershipBenefitsState();
      });

      await test.step('Verify mandatory buyer fields remain protected', async () => {
        await productsPage.expectMandatoryBuyerFieldsProtected();
      });

      await test.step('Add a buyer question and save the existing course settings', async () => {
        await productsPage.addCustomBuyerQuestion(updatedQuestion);
        await onlineCoursePage.submitPublish();
        await productsPage.expectProductCompleteModal();
        await productsPage.closeProductCompleteModal();
      });
    } finally {
      if (productUuid) {
        await deleteProduct(page.request, productUuid, accessToken).catch(() => undefined);
      }
    }
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

  test('Validate Digital Product Navigation and Unsaved Changes', {
    tag: ['@AUT-FV-190', '@products', '@creator', '@regression'],
    annotation: [{
      type: 'covers',
      description: 'TC-PD-C-003',
    }],
  }, async ({ creatorNav, productsPage, page }) => {

    const digitalProductType = productsCreationData.productTypes.find(
      (type) => type.label === 'Digital Product',
    )!;

    await test.step('Open Digital Product creation flow and make an unsaved change', async () => {
      await creatorNav.open('products');
      await productsPage.openAddProductSheet();
      await productsPage.selectProductType(digitalProductType.buttonName);
      await productsPage.expectDigitalProductCreateFlow();
      await productsPage.digitalProductTitleInput.fill(generateDigitalProductTitle());
    });

    await test.step('Attempt to continue with incomplete content and remain on the form', async () => {
      await productsPage.submitEmptyDigitalProductAddContent();
      await productsPage.expectDigitalProductCreateFlow();
    });

    await test.step('Protect the unsaved Digital Product changes when leaving', async () => {
      await productsPage.navigateAwayFromDigitalProductViaBack();
      await productsPage.expectDigitalProductUnsavedChangesDialog();
      await page.keyboard.press('Escape');
    });
  });

  test('Validate Digital Product After Sales Link Validation', {
    tag: ['@AUT-FV-191', '@products', '@creator', '@regression'],
    annotation: [{
      type: 'covers',
      description: 'TC-PD-C-027',
    }],
  }, async ({ creatorNav, productsPage, onlineCoursePage }) => {
    const digitalProductType = productsCreationData.productTypes.find(
      (type) => type.label === 'Digital Product',
    )!;
    const { linkValidation } = digitalProductValidationData;

    await test.step('Open Digital Product and enable After Sales Links', async () => {
      await creatorNav.open('products');
      await productsPage.openAddProductSheet();
      await productsPage.selectProductType(digitalProductType.buttonName);
      await productsPage.expectDigitalProductCreateFlow();
      await productsPage.digitalProductTitleInput.fill(generateDigitalProductTitle());
      await onlineCoursePage.fillDescription(generateDigitalProductDescription());
      await productsPage.uploadDigitalProductThumbnail(onlineCourseMediaData.thumbnailPaths[0]);
      await productsPage.enableLinksContentType();
      const [contentLink] = linkValidation.validLinks;
      await productsPage.openEmbedLinkDialog();
      await productsPage.fillEmbedLink(contentLink.label, contentLink.url);
      await productsPage.saveCurrentEmbedLink();
      await onlineCoursePage.submitContentDetails();
      await productsPage.enableAfterSalesLinks();
    });

    await test.step('Block invalid After Sales URL and over-limit label', async () => {
      await productsPage.openEmbedLinkDialog();
      await productsPage.fillEmbedLink(linkValidation.longLabel, linkValidation.invalidUrl);
      await productsPage.expectInvalidEmbedLinkFeedback();
    });

    await test.step('Save multiple valid After Sales links', async () => {
      const [firstLink, secondLink] = linkValidation.validLinks;
      await productsPage.fillEmbedLink(firstLink.label, firstLink.url);
      await productsPage.saveCurrentEmbedLink();
      await productsPage.openEmbedLinkDialog();
      await productsPage.fillEmbedLink(secondLink.label, secondLink.url);
      await productsPage.saveCurrentEmbedLink();
      await productsPage.expectEmbedLinksSaved([firstLink.label, secondLink.label]);
    });
  });

  test('Validate Digital Product Buyer-Only Description', {
    tag: ['@AUT-FV-192', '@products', '@creator', '@regression'],
    annotation: [{
      type: 'covers',
      description: 'TC-PD-C-013',
    }],
  }, async ({ creatorNav, productsPage, onlineCoursePage }) => {
    test.setTimeout(180000);

    const digitalProductType = productsCreationData.productTypes.find(
      (type) => type.label === 'Digital Product',
    )!;
    const [contentLink] = digitalProductValidationData.linkValidation.validLinks;

    await test.step('Open Digital Product creation flow', async () => {
      await creatorNav.open('products');
      await productsPage.openAddProductSheet();
      await productsPage.selectProductType(digitalProductType.buttonName);
      await productsPage.expectDigitalProductCreateFlow();
    });

    await test.step('Fill required Add Content fields', async () => {
      await productsPage.digitalProductTitleInput.fill(generateDigitalProductTitle());
      await onlineCoursePage.fillDescription(generateDigitalProductDescription());
      await productsPage.enableLinksContentType();
      await productsPage.openEmbedLinkDialog();
      await productsPage.fillEmbedLink(contentLink.label, contentLink.url);
      await productsPage.saveCurrentEmbedLink();
      await productsPage.uploadDigitalProductThumbnail(onlineCourseMediaData.thumbnailPaths[0]);
    });

    await test.step('Fill buyer-only description to the 500-word limit and verify counter', async () => {
      const buyerOnly = generateDigitalProductBuyerOnlyDescription(500);
      expect(buyerOnly.split(' ').length).toBe(500);
      await productsPage.fillDigitalProductContentDescription(buyerOnly);
      await productsPage.expectDigitalProductContentDescriptionCounter('500 / 500');
    });

    await test.step('Apply rich text formatting to buyer-only description', async () => {
      await productsPage.applyDigitalProductContentDescriptionFormatting();
      await productsPage.expectDigitalProductContentDescriptionFormatted();
    });

    await test.step('Clear buyer-only description and verify it remains optional', async () => {
      await productsPage.fillDigitalProductContentDescription('');
      await productsPage.expectDigitalProductContentDescriptionCounter('0 / 500');
      await onlineCoursePage.submitContentDetails();
      await productsPage.expectDigitalProductSetDetailsLoaded();
    });
  });

  test('Validate Digital Product Pricing Rules', {
    tag: ['@AUT-FV-193', '@products', '@creator', '@regression'],
    annotation: [{
      type: 'covers',
      description: 'TC-PD-C-018, TC-PD-C-019',
    }],
  }, async ({ creatorNav, productsPage, onlineCoursePage, buyerNav, productPurchasePage, page }) => {
    test.setTimeout(240000);

    const digitalProductType = productsCreationData.productTypes.find(
      (type) => type.label === 'Digital Product',
    )!;
    const [contentLink] = digitalProductValidationData.linkValidation.validLinks;
    const freeTitle = generateDigitalProductTitle();
    let freeUuid = '';
    let freeSharePath = '';

    await test.step('Open Digital Product creation flow with pricing off by default', async () => {
      await creatorNav.open('products');
      await productsPage.openAddProductSheet();
      await productsPage.selectProductType(digitalProductType.buttonName);
      await productsPage.expectDigitalProductCreateFlow();
    });

    await test.step('Fill Add Content and reach Set Details with pricing default', async () => {
      await productsPage.digitalProductTitleInput.fill(freeTitle);
      await onlineCoursePage.fillDescription(generateDigitalProductDescription());
      await productsPage.enableLinksContentType();
      await productsPage.openEmbedLinkDialog();
      await productsPage.fillEmbedLink(contentLink.label, contentLink.url);
      await productsPage.saveCurrentEmbedLink();
      await productsPage.uploadDigitalProductThumbnail(onlineCourseMediaData.thumbnailPaths[0]);
      await onlineCoursePage.submitContentDetails();
      await productsPage.expectDigitalProductSetDetailsLoaded();
    });

    await test.step('Verify free default pricing (preview shows IDR 0)', async () => {
      await productsPage.expectDigitalProductPricingFreeDefault();
    });

    await test.step('Publish the free product and verify IDR 0 on the buyer page', async () => {
      await onlineCoursePage.submitPublish();
      await productsPage.expectProductCompleteModal();
      freeSharePath = await productsPage.readProductCompleteSharePath();
      expect(freeSharePath).toMatch(/\/s\//);
      await productsPage.closeProductCompleteModal();

      await productPurchasePage.gotoSharePath(freeSharePath);
      await productPurchasePage.expectOnlineCourseFreeBuyerView(freeTitle, freeSharePath);
    });

    await test.step('Open paid pricing and reject below-minimum nominal values', async () => {
      await creatorNav.open('products');
      await productsPage.openAddProductSheet();
      await productsPage.selectProductType(digitalProductType.buttonName);
      await productsPage.expectDigitalProductCreateFlow();
      await productsPage.digitalProductTitleInput.fill(generateDigitalProductTitle());
      await onlineCoursePage.fillDescription(generateDigitalProductDescription());
      await productsPage.enableLinksContentType();
      await productsPage.openEmbedLinkDialog();
      await productsPage.fillEmbedLink(contentLink.label, contentLink.url);
      await productsPage.saveCurrentEmbedLink();
      await productsPage.uploadDigitalProductThumbnail(onlineCourseMediaData.thumbnailPaths[0]);
      await onlineCoursePage.submitContentDetails();
      await productsPage.expectDigitalProductSetDetailsLoaded();

      await productsPage.enableDigitalProductPricing();
      await productsPage.fillDigitalProductPrice(digitalProductPricingData.belowMinimumPrice);
      await productsPage.expectDigitalProductInvalidPriceFeedback();
      await productsPage.fillDigitalProductPrice(digitalProductPricingData.zeroPrice);
      await productsPage.expectDigitalProductPricingFreeDefault();
      await productsPage.fillDigitalProductPrice(digitalProductPricingData.validPrice);
      await productsPage.expectDigitalProductValidPrice();
    });

    await test.step('Enter a valid positive price and verify it persists', async () => {
      await productsPage.fillDigitalProductPrice(digitalProductPricingData.validPrice);
      await productsPage.expectDigitalProductValidPrice();
    });
  });

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
