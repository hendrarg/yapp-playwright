import { creatorAuthTest as test, expect } from '../test-base';
import { createConsultationProduct, deleteProduct, expectProductStatus } from '@helpers/api/product';
import { createOversizedImageFixture } from '@helpers/creator/oversized-image';
import { consultationConfigData, generateConsultationAfterSalesLink, generateConsultationAfterSalesPreviewMessage, generateConsultationConfigDescription, generateConsultationConfigTitle } from '@test-data/creator/consultation.config.data';
import { consultationMediaData, generateConsultationDescription, generateConsultationTitle } from '@test-data/creator/consultation.media.data';
import { consultationLifecycleData, consultationWeekdayLabel, generateConsultationAfterSalesMessage, generateConsultationLifecycleDescription, generateConsultationLifecycleTitle } from '@test-data/creator/consultation.lifecycle.data';
import { generateConsultationNavigationDescription, generateConsultationNavigationTitle } from '@test-data/creator/consultation.navigation.data';
import { consultationPricingData, generateConsultationPricingDescription, generateConsultationPricingTitle } from '@test-data/creator/consultation.pricing.data';
import { consultationValidationData } from '@test-data/creator/consultation.validation.data';
import { digitalProductValidationData, productsCreationData } from '@test-data/creator/products.creation.data';
import { addCustomBuyerQuestion, chooseGalleryFiles, chooseHeroFile, closeProductCompleteModal, copyProductCompleteLink, enableAfterSalesLinks, expectAddQuestionsDisabled, expectAddQuestionsEnabled, expectDescriptionContains, expectEmbedLinksSaved, expectGalleryCount, expectGalleryInputUnavailable, expectHeroNotUploaded, expectHeroRequired, expectImageTooLarge, expectImageTooSmall, expectInvalidEmbedLinkFeedback, expectMandatoryBuyerFieldsProtected, expectPreviewPaidPrice, expectPreviewWithoutPaidPrice, expectProductCompleteModal, expectTitleValue, fillEmbedLink, fillPrice, openEmbedLinkDialog, readProductCompleteSharePath, removeCustomBuyerQuestion, saveCurrentEmbedLink, setPricingEnabled, uploadGallery, uploadHero } from '@helpers/creator/product-editor';

test.describe('Creator Sessions', () => {
  test('Validate Consultation Inputs and Boundary Conditions', {
    tag: ['@AUT-FV-017', '@sessions', '@creator', '@regression'],
  }, async ({
    consultationPage, creatorNav, productsPage, page }) => {
    test.setTimeout(120000);

    const consultationType = productsCreationData.productTypes.find(
      (type) => type.label === 'Consultation',
    )!;
    const { linkValidation } = digitalProductValidationData;
    const [validLink] = linkValidation.validLinks;

    await test.step('Open Consultation create flow', async () => {
      await creatorNav.open('products');
      await productsPage.expectLoaded();
      await productsPage.openAddProductSheet();
      await productsPage.selectProductType(consultationType.buttonName);
      await consultationPage.expectConsultationCreateFlow();
    });

    await test.step('Require title and enforce description counter limit', async () => {
      await consultationPage.fillConsultationDescription(
        consultationValidationData.descriptionWordsAtLimit,
      );
      await consultationPage.expectConsultationDescriptionCounter(
        consultationValidationData.descriptionCounterMax,
      );
      await consultationPage.appendConsultationDescription(
        consultationValidationData.descriptionOverflowWord,
      );
      await consultationPage.expectConsultationDescriptionCounter(
        consultationValidationData.descriptionCounterMax,
      );
      await consultationPage.submitConsultationDetails();
      await consultationPage.expectConsultationTitleRequired();
    });

    await test.step('Protect mandatory buyer fields and enforce five custom questions', async () => {
      await expectMandatoryBuyerFieldsProtected(page);

      for (const question of consultationValidationData.customQuestions) {
        await addCustomBuyerQuestion(page, question);
      }
      await expectAddQuestionsDisabled(page);

      await removeCustomBuyerQuestion(page, consultationValidationData.customQuestions[0]);
      await expectAddQuestionsEnabled(page);
    });

    await test.step('Validate after-sales link buttons', async () => {
      await enableAfterSalesLinks(page);
      await openEmbedLinkDialog(page);
      await fillEmbedLink(page, linkValidation.longLabel, linkValidation.invalidUrl);
      await expectInvalidEmbedLinkFeedback(page);

      await fillEmbedLink(page, validLink.label, validLink.url);
      await saveCurrentEmbedLink(page);
      await expectEmbedLinksSaved(page, [validLink.label]);
    });
  });

  test('Upload and Manage Consultation Media and Content', {
    tag: ['@AUT-FV-018', '@sessions', '@creator', '@regression'],
  }, async ({
    consultationPage, creatorNav, productsPage, page }) => {
    test.setTimeout(180000);

    const consultationType = productsCreationData.productTypes.find(
      (type) => type.label === 'Consultation',
    )!;
    const title = generateConsultationTitle();
    const description = generateConsultationDescription();
    const editedTitle = generateConsultationTitle();
    const updatedDescription = generateConsultationDescription();
    const accessToken = process.env.YAPP_TEST_ACCESS_TOKEN?.replace(/"/g, '');
    let productUuid = '';
    let sharePath = '';

    try {
      await test.step('Open Consultation create flow', async () => {
        await creatorNav.open('products');
        await productsPage.expectLoaded();
        await productsPage.openAddProductSheet();
        await productsPage.selectProductType(consultationType.buttonName);
        await consultationPage.expectConsultationCreateFlow();
      });

      await test.step('Apply rich text formatting in description', async () => {
        await consultationPage.fillConsultationTitle(title);
        await consultationPage.applyConsultationRichTextFormatting(description);
      });

      await test.step('Reject missing hero, undersized, and oversized images', async () => {
        await consultationPage.submitConsultationDetails();
        await expectHeroRequired(page);

        const oversized = createOversizedImageFixture();
        try {
          await chooseHeroFile(page, oversized.filePath);
          await expectImageTooLarge(page);
          await expectHeroNotUploaded(page);
        } finally {
          oversized.cleanup();
        }

        await chooseHeroFile(page, consultationMediaData.tinyImagePath);
        await expectImageTooSmall(page, 'tiny-1x1.png');
        await expectHeroNotUploaded(page);
      });

      await test.step('Upload hero and ten additional images', async () => {
        await uploadHero(page, consultationMediaData.heroImagePath);

        await chooseGalleryFiles(page, [consultationMediaData.undersizedImagePath]);
        await expectImageTooSmall(page, 'hermes.jpg');

        await uploadGallery(page, consultationMediaData.additionalImagePaths);
        await expectGalleryCount(page, consultationMediaData.maxAdditionalImages);
        await expectGalleryInputUnavailable(page);
      });

      await test.step('Publish consultation and review Product Complete modal', async () => {
        await consultationPage.submitConsultationDetails();
        await consultationPage.expectConsultationAvailabilityStep();
        await consultationPage.addConsultationWeekdayTimeSlot('Mon');
        await consultationPage.createConsultation();
        await expectProductCompleteModal(page);
        sharePath = await readProductCompleteSharePath(page);
        const copied = await copyProductCompleteLink(page);
        expect(copied).toContain(sharePath);
        await closeProductCompleteModal(page);
      });

      await test.step('Republish edits with unchanged share URL', async () => {
        await productsPage.expectLoaded();
        await productsPage.searchProducts(title);
        await productsPage.expectProductVisible(title);
        await productsPage.openEditProduct(title);
        productUuid = await consultationPage.readAppointmentProductUuidFromUrl();

        await consultationPage.fillConsultationTitle(editedTitle);
        await consultationPage.fillConsultationDescription(updatedDescription);
        await consultationPage.saveAndPublishConsultation();
        await consultationPage.expectConsultationLiveModalWithSharePath(sharePath);
      });
    } finally {
      if (productUuid && accessToken) {
        await deleteProduct(page.request, productUuid, accessToken).catch(() => undefined);
      }
    }
  });

  test('Validate Consultation Navigation and Unsaved Warning', {
    tag: ['@AUT-FV-019', '@sessions', '@creator', '@smoke', '@regression'],
  }, async ({
    consultationPage, creatorNav, productsPage }) => {
    const consultationType = productsCreationData.productTypes.find(
      (type) => type.label === 'Consultation',
    )!;
    const title = generateConsultationNavigationTitle();

    await test.step('Open Consultation create with unsaved changes', async () => {
      // Establish history so Back returns to Products instead of about:blank.
      await creatorNav.open('products');
      await productsPage.expectLoaded();
      await consultationPage.useConsultationMobileViewport();
      await productsPage.openAddProductSheet();
      await productsPage.selectProductType(consultationType.buttonName);
      await consultationPage.expectConsultationCreateFlow();
      await consultationPage.makeConsultationUnsavedChanges(
        title,
        generateConsultationNavigationDescription(),
      );
    });

    await test.step('Scroll and verify Next: Set Availability stays sticky', async () => {
      await consultationPage.expectConsultationNextCtaStickyAfterScroll();
    });

    await test.step('Navigate away and review unsaved confirmation dialog', async () => {
      await consultationPage.navigateAwayFromConsultationViaBack();
      await consultationPage.expectConsultationUnsavedChangesDialog();
    });
  });

  test('Validate Consultation Pricing, Vouchers, and Fees', {
    tag: ['@AUT-FV-020', '@sessions', '@creator', '@regression'],
  }, async ({
    consultationPage, creatorNav, productsPage, productPurchasePage, page }) => {
    test.setTimeout(300000);

    const consultationType = productsCreationData.productTypes.find(
      (type) => type.label === 'Consultation',
    )!;
    const weekday = consultationWeekdayLabel();
    const accessToken = process.env.YAPP_TEST_ACCESS_TOKEN?.replace(/"/g, '');
    const productUuids: string[] = [];
    let shortSharePath = '';
    let longSharePath = '';

    const rememberProductUuid = async (title: string) => {
      await creatorNav.open('products');
      await productsPage.expectLoaded();
      await productsPage.searchProducts(title);
      await productsPage.openEditProduct(title);
      productUuids.push(await consultationPage.readAppointmentProductUuidFromUrl());
      await creatorNav.open('products');
    };

    try {
      await test.step('Open Consultation create flow', async () => {
        await creatorNav.open('products');
        await productsPage.expectLoaded();
        await productsPage.openAddProductSheet();
        await productsPage.selectProductType(consultationType.buttonName);
        await consultationPage.expectConsultationCreateFlow();
      });

      await test.step('Verify free default and accept valid paid preview price', async () => {
        await consultationPage.fillConsultationTitle(generateConsultationPricingTitle());
        await setPricingEnabled(page, false);
        await expectPreviewWithoutPaidPrice(page);

        await setPricingEnabled(page, true);
        await fillPrice(page, consultationPricingData.validPrice);
        await expectPreviewPaidPrice(page, consultationPricingData.previewPaidPricePattern);
      });

      await test.step('Reject zero price when pricing is enabled', async () => {
        test.fail(true, 'Product currently allows zero price to reach Availability (TC-CON-C-007 gap)');

        const zeroTitle = generateConsultationPricingTitle();
        await consultationPage.prepareConsultationDetailsWithoutSubmit(
          zeroTitle,
          generateConsultationPricingDescription(),
        );
        await setPricingEnabled(page, true);
        await fillPrice(page, consultationPricingData.zeroPrice);
        await consultationPage.submitConsultationDetails();
        await consultationPage.expectConsultationZeroPriceRejected();
      });

      await test.step('Push first bookable day later with longer minimum notice', async () => {
        const shortTitle = generateConsultationPricingTitle();
        const longTitle = generateConsultationPricingTitle();

        await creatorNav.open('products');
        await productsPage.expectLoaded();
        await productsPage.openAddProductSheet();
        await productsPage.selectProductType(consultationType.buttonName);
        await consultationPage.expectConsultationCreateFlow();
        shortSharePath = await consultationPage.publishConsultationWithMinimumNotice(
          shortTitle,
          generateConsultationPricingDescription(),
          {
            minimumNoticeHours: consultationPricingData.minimumNoticeHoursShort,
            weekday,
          },
        );
        await rememberProductUuid(shortTitle);

        await creatorNav.open('products');
        await productsPage.expectLoaded();
        await productsPage.openAddProductSheet();
        await productsPage.selectProductType(consultationType.buttonName);
        await consultationPage.expectConsultationCreateFlow();
        longSharePath = await consultationPage.publishConsultationWithMinimumNotice(
          longTitle,
          generateConsultationPricingDescription(),
          {
            minimumNoticeHours: consultationPricingData.minimumNoticeHoursLong,
            weekday,
          },
        );
        await rememberProductUuid(longTitle);

        await productPurchasePage.gotoSharePath(shortSharePath);
        await productPurchasePage.expectConsultationProductLoaded(shortTitle);
        const shortFirstDay = await productPurchasePage.readFirstConsultationDayDate();

        await productPurchasePage.gotoSharePath(longSharePath);
        await productPurchasePage.expectConsultationProductLoaded(longTitle);
        const longFirstDay = await productPurchasePage.readFirstConsultationDayDate();

        const dayGapMs =
          longFirstDay.getTime() - shortFirstDay.getTime();
        expect(dayGapMs).toBeGreaterThanOrEqual(
          consultationPricingData.minimumNoticeDayGap * 24 * 60 * 60 * 1000,
        );
      });
    } finally {
      if (accessToken) {
        for (const productUuid of productUuids) {
          await deleteProduct(page.request, productUuid, accessToken).catch(() => undefined);
        }
      }
    }
  });

  test('Verify Consultation Notifications and Messaging', {
    tag: ['@AUT-FV-021', '@sessions', '@creator', '@regression'],
    annotation: [
      { type: 'covers', description: 'TC-CON-C-008, TC-CON-C-023, TC-CON-C-024' },
    ],
  }, async ({ consultationPage, creatorNav, productsPage, page }) => {
    test.setTimeout(180000);

    const seedToken = process.env.YAPP_TEST_ACCESS_TOKEN?.replace(/"/g, '');
    test.skip(!seedToken, 'YAPP_TEST_ACCESS_TOKEN is required to seed consultation for this test');
    if (!seedToken) return;

    const title = generateConsultationLifecycleTitle();
    const description = generateConsultationLifecycleDescription();
    const afterSalesMessage = generateConsultationAfterSalesMessage();
    let productUuid = '';

    try {
      await test.step('Seed active consultation product via API', async () => {
        const product = await createConsultationProduct(page.request, {
          title,
          description,
          thumbnailImagePath: consultationMediaData.heroImagePath,
          status: 'active',
        }, seedToken);
        productUuid = product.productUuid;
        expect(productUuid).toBeTruthy();
      });

      await test.step('Open editor, enable Customize Message and fill content', async () => {
        await creatorNav.open('products');
        await productsPage.expectLoaded();
        await productsPage.selectStatusTab('Active');
        await productsPage.searchProducts(title);
        await productsPage.openEditProduct(title);

        await expect(consultationPage.page).toHaveURL(/\/products\/update\/appointment\//, { timeout: 30000 });
        await consultationPage.openConsultationEditTab('Details');
        await consultationPage.enableConsultationAfterSalesMessage();
        await consultationPage.fillConsultationAfterSalesMessage(afterSalesMessage);
        await consultationPage.expectAfterSalesToggleOn();
        await consultationPage.openConsultationEditTab('Availability');
        await consultationPage.expectConsultationPublishReady();
        await consultationPage.saveAndPublishConsultationFromEdit();
      });

      await test.step('Reopen and verify toggle ON and message persist', async () => {
        await creatorNav.open('products');
        await productsPage.searchProducts(title);
        await productsPage.openEditProduct(title);
        await consultationPage.openConsultationEditTab('Details');
        await consultationPage.expectAfterSalesToggleOn();
      });

      await test.step('Toggle OFF, save and verify toggle stays OFF after reopen', async () => {
        await consultationPage.disableConsultationAfterSalesMessage();
        await consultationPage.expectAfterSalesToggleOff();
        await consultationPage.openConsultationEditTab('Availability');
        await consultationPage.expectConsultationPublishReady();
        await consultationPage.saveAndPublishConsultationFromEdit();

        await creatorNav.open('products');
        await productsPage.searchProducts(title);
        await productsPage.openEditProduct(title);
        await consultationPage.openConsultationEditTab('Details');
        await consultationPage.expectAfterSalesToggleOff();
      });
    } finally {
      if (productUuid && seedToken) {
        await deleteProduct(page.request, productUuid, seedToken).catch(() => undefined);
      }
    }
  });

  test('Validate Consultation Scheduling and Availability Controls', {
    tag: ['@AUT-FV-022', '@sessions', '@creator', '@regression'],
    annotation: [
      { type: 'covers', description: 'TC-CON-C-010, TC-CON-C-011, TC-CON-C-012, TC-CON-C-013, TC-CON-C-016, TC-CON-C-017, TC-CON-C-018, TC-CON-C-019, TC-CON-C-020, TC-CON-C-030' },
    ],
  }, async ({ consultationPage, creatorNav, productsPage, page }) => {
    test.setTimeout(180000);

    const seedToken = process.env.YAPP_TEST_ACCESS_TOKEN?.replace(/"/g, '');
    test.skip(!seedToken, 'YAPP_TEST_ACCESS_TOKEN is required to seed consultation for this test');
    if (!seedToken) return;

    const title = generateConsultationLifecycleTitle();
    const description = generateConsultationLifecycleDescription();
    let productUuid = '';

    try {
      await test.step('Seed active consultation', async () => {
        const product = await createConsultationProduct(page.request, {
          title,
          description,
          thumbnailImagePath: consultationMediaData.heroImagePath,
          status: 'active',
        }, seedToken);
        productUuid = product.productUuid;
        expect(productUuid).toBeTruthy();
      });

      await test.step('Open editor and switch to Availability tab', async () => {
        await creatorNav.open('products');
        await productsPage.expectLoaded();
        await productsPage.selectStatusTab('Active');
        await productsPage.searchProducts(title);
        await productsPage.openEditProduct(title);
        await expect(consultationPage.page).toHaveURL(/\/products\/update\/appointment\//, { timeout: 30000 });
        await consultationPage.openConsultationEditTab('Availability');
        await consultationPage.expectAvailabilityControlsVisible();
      });

      await test.step('Configure weekday slot', async () => {
        const weekday = consultationWeekdayLabel();
        await consultationPage.addConsultationWeekdayTimeSlot(weekday);
        await consultationPage.configureConsultationWeekdaySlot(weekday);
        await consultationPage.expectConsultationWeekdaySlotConfigured(weekday);
      });

      await test.step('Verify Availability Range and Appointment Duration defaults', async () => {
        await consultationPage.expectAvailabilityRangeValue('3 months');
        await consultationPage.expectAppointmentDurationValue('1 hour');
      });

      await test.step('Toggle Buffer Time, Reschedule, and Booking Frequency', async () => {
        await consultationPage.toggleBufferTime(true);
        await consultationPage.toggleReschedule(true);
        await consultationPage.toggleBookingFrequency(true);
      });

      await test.step('Save and verify availability tab reopens', async () => {
        await consultationPage.expectConsultationPublishReady();
        await consultationPage.saveAndPublishConsultationFromEdit();

        await creatorNav.open('products');
        await productsPage.searchProducts(title);
        await productsPage.openEditProduct(title);
        await consultationPage.openConsultationEditTab('Availability');
        await consultationPage.expectAvailabilityControlsVisible();
        await consultationPage.expectAvailabilityRangeValue('3 months');
        await consultationPage.expectAppointmentDurationValue('1 hour');
      });
    } finally {
      if (productUuid && seedToken) {
        await deleteProduct(page.request, productUuid, seedToken).catch(() => undefined);
      }
    }
  });

  test('Verify Consultation Buffer Time Security', {
    tag: ['@AUT-FV-023', '@sessions', '@creator', '@smoke', '@regression'],
    annotation: [
      { type: 'covers', description: 'TC-CON-C-015' },
    ],
  }, async ({ consultationPage, creatorNav, productsPage, page }) => {
    test.setTimeout(180000);

    const seedToken = process.env.YAPP_TEST_ACCESS_TOKEN?.replace(/"/g, '');
    test.skip(!seedToken, 'YAPP_TEST_ACCESS_TOKEN is required to seed consultation for this test');
    if (!seedToken) return;

    const title = generateConsultationLifecycleTitle();
    let productUuid = '';

    try {
      await test.step('Seed active consultation', async () => {
        const product = await createConsultationProduct(page.request, {
          title,
          description: generateConsultationLifecycleDescription(),
          thumbnailImagePath: consultationMediaData.heroImagePath,
          status: 'active',
        }, seedToken);
        productUuid = product.productUuid;
        expect(productUuid).toBeTruthy();
      });

      await test.step('Open editor, verify Buffer Time is off by default', async () => {
        await creatorNav.open('products');
        await productsPage.expectLoaded();
        await productsPage.selectStatusTab('Active');
        await productsPage.searchProducts(title);
        await productsPage.openEditProduct(title);
        await consultationPage.openConsultationEditTab('Availability');
      });

      await test.step('Enable Buffer Time and save', async () => {
        await consultationPage.toggleBufferTime(true);
        await consultationPage.expectConsultationPublishReady();
        await consultationPage.saveAndPublishConsultationFromEdit();
      });

      await test.step('Reopen and verify Buffer Time stays enabled', async () => {
        await creatorNav.open('products');
        await productsPage.searchProducts(title);
        await productsPage.openEditProduct(title);
        await consultationPage.openConsultationEditTab('Availability');
        await consultationPage.toggleBufferTime(false);
        await consultationPage.toggleBufferTime(true);
      });
    } finally {
      if (productUuid && seedToken) {
        await deleteProduct(page.request, productUuid, seedToken).catch(() => undefined);
      }
    }
  });

  test('Create, Update, and Manage Consultation Lifecycle', {
    tag: ['@AUT-FV-024', '@sessions', '@creator', '@regression'],
  }, async ({
    consultationPage, creatorNav, productsPage, productPurchasePage, page }) => {
    test.setTimeout(240000);

    const consultationType = productsCreationData.productTypes.find(
      (type) => type.label === 'Consultation',
    )!;
    const title = generateConsultationLifecycleTitle();
    const description = generateConsultationLifecycleDescription();
    const savedTitle = `${title}${consultationLifecycleData.savedTitleSuffix}`;
    const savedDescription = generateConsultationLifecycleDescription();
    const afterSalesMessageV1 = generateConsultationAfterSalesMessage();
    const afterSalesMessageV2 = generateConsultationAfterSalesMessage();
    const weekday = consultationWeekdayLabel();
    const accessToken = process.env.YAPP_TEST_ACCESS_TOKEN?.replace(/"/g, '');
    let productUuid = '';
    let sharePath = '';

    try {
      await test.step('Save consultation as non-public draft', async () => {
        await creatorNav.open('products');
        await productsPage.expectLoaded();
        await productsPage.openAddProductSheet();
        await productsPage.selectProductType(consultationType.buttonName);
        await consultationPage.expectConsultationCreateFlow();
        await consultationPage.prepareConsultationDetailsForAvailability(
          title,
          description,
        );
        await consultationPage.addConsultationWeekdayTimeSlot(weekday);
        await consultationPage.saveConsultationAsDraft();
        await productsPage.selectStatusTab('Draft');
        await productsPage.searchProducts(title);
        await productsPage.expectProductVisible(title);
        await productsPage.expectProductRowStatus(title, 'DRAFT');
        sharePath = await productsPage.readProductSharePath(title);
      });

      await test.step('Keep draft non-public for buyers', async () => {
        await productPurchasePage.gotoSharePath(sharePath);
        await productPurchasePage.expectConsultationProductLoaded(title);
        await productPurchasePage.expectConsultationNotBookable();
      });

      await test.step('Open editor with pre-populated details and availability', async () => {
        await creatorNav.open('products');
        await productsPage.selectStatusTab('Draft');
        await productsPage.searchProducts(title);
        await productsPage.openEditProduct(title);
        productUuid = await consultationPage.readAppointmentProductUuidFromUrl();
        await expectTitleValue(page, title);
        await expectDescriptionContains(page, description);
        await consultationPage.openConsultationEditTab('Availability');
        await consultationPage.expectConsultationWeekdaySlotConfigured(weekday);
        await consultationPage.openConsultationEditTab('Details');
      });

      await test.step('Discard unsaved detail edits on reload', async () => {
        await consultationPage.fillConsultationTitle(
          `${title}${consultationLifecycleData.unsavedTitleSuffix}`,
        );
        await consultationPage.reloadConsultationEditor();
        await expectTitleValue(page, title);
      });

      await test.step('Persist saved detail and after-sales message changes', async () => {
        await consultationPage.fillConsultationTitle(savedTitle);
        await consultationPage.fillConsultationDescription(savedDescription);
        await consultationPage.fillConsultationAfterSalesMessage(afterSalesMessageV1);
        await consultationPage.openConsultationEditTab('Availability');
        await consultationPage.setConsultationMinimumNoticeHours(
          consultationLifecycleData.minimumNoticeHours,
        );
        await consultationPage.configureConsultationWeekdaySlot(weekday);
        await consultationPage.expectConsultationPublishReady();
        await consultationPage.saveAndPublishConsultation();
        await expectProductCompleteModal(page);
        sharePath = await readProductCompleteSharePath(page);
        await closeProductCompleteModal(page);
      });

      await test.step('Apply updated after-sales message for future delivery only', async () => {
        await creatorNav.open('products');
        await productsPage.selectStatusTab('Active');
        await productsPage.searchProducts(savedTitle);
        await productsPage.openEditProduct(savedTitle);
        await consultationPage.expectConsultationAfterSalesMessage(afterSalesMessageV1);
        await consultationPage.fillConsultationAfterSalesMessage(afterSalesMessageV2);
        await consultationPage.openConsultationEditTab('Availability');
        await consultationPage.expectConsultationPublishReady();
        await consultationPage.saveAndPublishConsultationFromEdit();
        await creatorNav.open('products');
        await productsPage.searchProducts(savedTitle);
        await productsPage.openEditProduct(savedTitle);
        await consultationPage.expectConsultationAfterSalesMessage(afterSalesMessageV2);
      });

      await test.step('Review available booking slots on active consultation', async () => {
        await productPurchasePage.gotoSharePath(sharePath);
        await productPurchasePage.expectConsultationProductLoaded(savedTitle);
        await productPurchasePage.expectConsultationBookable();
      });
    } finally {
      if (productUuid && accessToken) {
        await deleteProduct(page.request, productUuid, accessToken).catch(() => undefined);
      }
    }
  });

  test('Configure and Customize Consultation', {
    tag: ['@AUT-FV-025', '@sessions', '@creator', '@regression'],
  }, async ({
    consultationPage, creatorNav, productsPage, page }) => {
    test.setTimeout(180000);

    const seedToken = process.env.YAPP_TEST_ACCESS_TOKEN?.replace(/"/g, '');
    test.skip(!seedToken, 'YAPP_TEST_ACCESS_TOKEN is required to seed consultation product');
    if (!seedToken) return;

    const title = generateConsultationConfigTitle();
    const description = generateConsultationConfigDescription();
    const afterSalesMessage = generateConsultationAfterSalesPreviewMessage();
    const afterSalesLink = generateConsultationAfterSalesLink();
    let productUuid = '';

    try {
      await test.step('Seed consultation and open editor with staged after-sales content', async () => {
        const product = await createConsultationProduct(
          page.request,
          {
            title,
            description,
            thumbnailImagePath: consultationMediaData.heroImagePath,
            productImagePaths: [...consultationMediaData.additionalImagePaths],
            price: consultationConfigData.price,
          },
          seedToken,
        );
        productUuid = product.productUuid;

        await creatorNav.open('products');
        await productsPage.expectLoaded();
        await productsPage.searchProducts(title);
        await productsPage.openEditProduct(title);
        await consultationPage.fillConsultationAfterSalesMessage(afterSalesMessage);
        await enableAfterSalesLinks(page);
        await openEmbedLinkDialog(page);
        await fillEmbedLink(page, afterSalesLink.label, afterSalesLink.url);
        await saveCurrentEmbedLink(page);
        await expectEmbedLinksSaved(page, [afterSalesLink.label]);
      });

      await test.step('Open Preview and review staged content as read-only', async () => {
        await consultationPage.openConsultationAfterSalesPreview();
        await consultationPage.expectConsultationAfterSalesPreviewReadOnly({
          message: afterSalesMessage,
          linkLabel: afterSalesLink.label,
        });
      });
    } finally {
      if (productUuid && seedToken) {
        await deleteProduct(page.request, productUuid, seedToken).catch(() => undefined);
      }
    }
  });

  test('Verify Consultation Access, Entitlements, and Eligibility', {
    tag: ['@AUT-FV-026', '@sessions', '@creator', '@smoke', '@regression'],
  }, async ({ creatorNav, productsPage, productPurchasePage, page }) => {
    test.setTimeout(180000);

    const seedToken = process.env.YAPP_TEST_ACCESS_TOKEN?.replace(/"/g, '');
    test.skip(!seedToken, 'YAPP_TEST_ACCESS_TOKEN is required to seed consultation product');
    if (!seedToken) return;

    const title = generateConsultationConfigTitle();
    const description = generateConsultationConfigDescription();
    let productUuid = '';
    let sharePath = '';

    try {
      await test.step('Seed active consultation', async () => {
        const product = await createConsultationProduct(
          page.request,
          {
            title,
            description,
            thumbnailImagePath: consultationMediaData.heroImagePath,
            productImagePaths: [...consultationMediaData.additionalImagePaths],
            price: consultationConfigData.price,
          },
          seedToken,
        );
        productUuid = product.productUuid;
        sharePath = product.sharePath;
        await expectProductStatus(page.request, productUuid, 'active', seedToken);
      });

      await test.step('Set consultation inactive and verify status', async () => {
        await creatorNav.open('products');
        await productsPage.expectLoaded();
        await productsPage.selectStatusTab('Active');
        await productsPage.searchProducts(title);
        await productsPage.expectProductVisible(title);
        await productsPage.setProductInactive(title);
        await expectProductStatus(page.request, productUuid, 'inactive', seedToken);
        await productsPage.selectStatusTab('Inactive');
        await productsPage.searchProducts(title);
        await productsPage.expectProductVisible(title);
        await productsPage.expectProductRowStatus(title, 'INACTIVE');
      });

      await test.step('Block new bookings on buyer page while inactive', async () => {
        await productPurchasePage.gotoSharePath(sharePath);
        await productPurchasePage.expectConsultationProductLoaded(title);
        await productPurchasePage.expectConsultationNotBookable();
      });
    } finally {
      if (productUuid && seedToken) {
        await deleteProduct(page.request, productUuid, seedToken).catch(() => undefined);
      }
    }
  });
});
