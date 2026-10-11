import { creatorAuthTest as test, expect } from '../test-base';
import { addCustomBuyerQuestion, cancelEditBuyerQuestion, expectTitleValue, expectVersionHistory, saveAsDraft, chooseHeroFile, closeProductCompleteModal, completeOpenBuyerQuestion, expectAddQuestionDialog, expectAddQuestionsDisabled, expectEditQuestionDialog, expectHeroNotUploaded, expectImageTooLarge, expectImageTooSmall, expectProductCompleteModal, expectQuestionInputTypes, expectSavedBuyerQuestion, openAddQuestionDialog, openEditBuyerQuestion, readProductCompleteSharePath, submitEmptyQuestionLabel, uploadGallery, uploadHero } from '@helpers/creator/product-editor';
import { createEventProduct, deleteProduct, findProductByTitle, getEventTicketConfiguration, getProduct } from '@helpers/api/product';
import { createOversizedImageFixture } from '@helpers/creator/oversized-image';
import { buyerEventDatePattern, eventsBasicInfoData, generateEventsVenue } from '@test-data/creator/events.basic-info.data';
import { eventsBuyerFormData, generateEventsBuyerQuestionLabels, generateEventsBuyerQuestionOptions } from '@test-data/creator/events.buyer-form.data';
import { eventsAfterSalesData, generateEventsAfterSalesLabel, generateEventsAfterSalesLinks, generateEventsAfterSalesMessage } from '@test-data/creator/events.after-sales.data';
import { generateEventsEditData } from '@test-data/creator/events.edit.data';
import { eventsGuestsData } from '@test-data/creator/events.guests.data';
import { eventsMediaData, generateEventsDescription, generateEventsTitle } from '@test-data/creator/events.media.data';
import { eventsTicketsData, generateEventsTicketDescription, generateEventsTicketName } from '@test-data/creator/events.tickets.data';
import { eventsPublishData } from '@test-data/creator/events.publish.data';
import { digitalProductValidationData, productsCreationData } from '@test-data/creator/products.creation.data';
import { buyerEventsDetailData, generateBuyerEventDiscoverySeedData } from '@test-data/buyer/events.detail.data';
import { creatorProfile } from '@test-data/buyer/profile.data';

const eventsType = productsCreationData.productTypes.find((type) => type.label === 'Events and Tickets')!;

test.describe('Creator Events and Tickets', () => {
  test('Event & Tickets — Basic Info - Title, Step Navigation, Schedule - Time Auto-correction, Online Venue - URL Validation, Onboarding Tour Interference', {
    tag: ['@AUT-EVT-001', '@products', '@creator', '@regression'],
    annotation: { type: 'issue', description: 'M-46' },
  }, async ({ eventsPage, creatorNav, productsPage }) => {
    test.setTimeout(180000);
    // Known bug M-46: the title has no length limit. Last step.
    test.fail(true, 'M-46: event title has no length limit');
    const times = eventsBasicInfoData.timeAutoCorrection;

    await test.step('Add Product is clickable with no onboarding tour in the way', async () => {
      await creatorNav.open('products');
      await productsPage.expectNoOnboardingTour();
      await productsPage.openAddProductSheet();
      await productsPage.selectProductType(eventsType.buttonName);
      await eventsPage.expectEventsCreateFlow();
    });

    await test.step('An empty Step 1 is blocked with an inline error per required field, title first', async () => {
      await eventsPage.submitEventsBasicInfo();
      await eventsPage.expectEventsBasicInfoErrors(eventsBasicInfoData.emptyStep1Errors);
    });

    await test.step('An earlier end time silently moves the start, and a later start moves the end', async () => {
      await eventsPage.fillEventsTitle(generateEventsTitle());
      await eventsPage.fillEventsDescription(generateEventsDescription());
      await eventsPage.selectFutureEventDate();
      await eventsPage.expectEventTimeSlots(1, eventsBasicInfoData.timeSlotCount);
      await eventsPage.selectEventTime(0, times.start);
      await eventsPage.selectEventTime(1, times.earlierEnd);
      await eventsPage.expectEventTimes(times.correctedStart, times.earlierEnd);
      await eventsPage.selectEventTime(0, times.laterStart);
      await eventsPage.expectEventTimes(times.laterStart, times.correctedEnd);
    });

    await test.step('A malformed custom streaming link is rejected and a valid one reaches Step 2', async () => {
      await eventsPage.selectOnlineLocation();
      await eventsPage.selectOnlinePlatform('Custom');
      await eventsPage.fillMeetingLink(eventsBasicInfoData.invalidMeetingLink);
      await eventsPage.submitEventsBasicInfo();
      await eventsPage.expectEventsBasicInfoErrors([eventsBasicInfoData.invalidMeetingLinkError]);
      await eventsPage.fillMeetingLink(eventsBasicInfoData.validMeetingLink);
      await eventsPage.continueToEventsDetails();
    });

    await test.step('The title stops at its documented maximum', async () => {
      await eventsPage.goBackToEventsStep1();
      await eventsPage.fillEventsTitle('T'.repeat(eventsBasicInfoData.overlongTitleLength));
      expect((await eventsPage.readEventsTitleValue()).length).toBeLessThan(eventsBasicInfoData.overlongTitleLength);
      await eventsPage.expectEventsTitleLimited();
    });
  });

  test('Event & Tickets — Description, Schedule - Date and Time, Schedule - All Day Toggle, On-site Venue, Online Venue - Google Meet, Online Venue - Custom Link, Hybrid Venue, Step 1→2 Transition', {
    tag: ['@AUT-EVT-002', '@products', '@creator', '@smoke', '@regression'],
  }, async ({ eventsPage, creatorNav, productsPage, productPurchasePage, page }) => {
    test.setTimeout(300000);
    const title = generateEventsTitle();
    const description = generateEventsDescription();
    const venue = generateEventsVenue();
    let productUuid = '';
    let sharePath = '';
    let eventDate = '';

    try {
      await test.step('The create flow opens on Step 1 of 2', async () => {
        await creatorNav.open('products');
        await productsPage.openAddProductSheet();
        await productsPage.selectProductType(eventsType.buttonName);
        await eventsPage.expectEventsCreateFlow();
        await eventsPage.expectStepIndicator('1/2');
      });

      await test.step('Description is required and its rich-text toolbar keeps formatting', async () => {
        await eventsPage.submitEventsBasicInfo();
        await eventsPage.expectEventsBasicInfoErrors(['Description is required']);
        await eventsPage.expectDescriptionToolbar(eventsBasicInfoData.descriptionToolbar);
        await eventsPage.fillEventsTitle(title);
        await eventsPage.fillEventsDescription(description);
        await eventsPage.applyDescriptionFormatting();
        await eventsPage.expectDescriptionFormatted(description);
      });

      await test.step('Date and start time are required, and the timezone defaults to Jakarta', async () => {
        await eventsPage.expectEventsBasicInfoErrors(['Event date is required', 'Start time is required']);
        await eventsPage.selectFutureEventDate();
        eventDate = await eventsPage.readEventDateText();
        await eventsPage.selectEventTime(0, eventsBasicInfoData.timedSchedule.start);
        await eventsPage.selectEventTime(1, eventsBasicInfoData.timedSchedule.end);
        await eventsPage.expectEventTimes(eventsBasicInfoData.timedSchedule.start, eventsBasicInfoData.timedSchedule.end);
        await eventsPage.expectTimezone(eventsBasicInfoData.defaultTimezone);
      });

      await test.step('An on-site event requires venue name and address', async () => {
        await eventsPage.expectEventsBasicInfoErrors(['Venue name is required', 'Venue address is required']);
        await eventsPage.fillVenue(venue.name, venue.address);
      });

      await test.step('A hybrid event needs the venue and a streaming link as well', async () => {
        await eventsPage.selectHybridLocation();
        await eventsPage.selectOnlinePlatform('Custom');
        await eventsPage.submitEventsBasicInfo();
        await eventsPage.expectEventsBasicInfoErrors([eventsBasicInfoData.meetingLinkRequiredError]);
        await eventsPage.selectOnlinePlatform('Google Meet');
      });

      await test.step('All Day hides the start and end time inputs', async () => {
        await eventsPage.enableAllDaySchedule();
        await eventsPage.expectEventTimeInputsHidden();
      });

      await test.step('A complete Step 1 moves to Step 2 of 2 with its four sections', async () => {
        await eventsPage.continueToEventsDetails();
        await eventsPage.expectStepIndicator('2/2');
        await eventsPage.expectEventsDetailsSections(eventsBasicInfoData.detailsSections);
      });

      await test.step('The published event shows All Day and the venue with a Google Maps link to buyers', async () => {
        await eventsPage.fillTicketDescription(0, generateEventsTicketDescription());
        await eventsPage.selectTicketLocation(0, 'Hybrid venue');
        await eventsPage.fillTicketSalesPeriod(0);
        await uploadHero(page, eventsMediaData.heroImagePath);
        await eventsPage.submitEventsPublishDetails();
        await expectProductCompleteModal(page);
        sharePath = await readProductCompleteSharePath(page);
        await closeProductCompleteModal(page);
        productUuid = (await findProductByTitle(page.request, title))!.uuid;
        await productPurchasePage.gotoSharePath(sharePath);
        await productPurchasePage.expectEventDateAndStatus({
          datePattern: buyerEventDatePattern(eventDate),
          allDayText: eventsBasicInfoData.allDayText,
          statusPattern: eventsBasicInfoData.eventStatusPattern,
        });
        await productPurchasePage.expectEventVenueLink(venue.name, eventsBasicInfoData.mapsHrefPattern);
      });

      await test.step('Google Meet generates the meeting link on save', async () => {
        const saved = await getEventTicketConfiguration(page.request, productUuid);
        expect(saved.platform).toBe('google_meet');
        expect(saved.meetingLink).toMatch(eventsBasicInfoData.generatedMeetLinkPattern);
      });

      await test.step('A custom streaming link replaces it and is saved as entered', async () => {
        await eventsPage.gotoEdit(productUuid);
        await eventsPage.selectOnlinePlatform('Custom');
        await eventsPage.fillMeetingLink(eventsBasicInfoData.validMeetingLink);
        await eventsPage.continueToEventsDetails();
        await eventsPage.submitEventsPublishDetails();
        await expect.poll(async () => (await getEventTicketConfiguration(page.request, productUuid)).meetingLink, { timeout: 20000 })
          .toBe(eventsBasicInfoData.validMeetingLink);
      });
    } finally {
      if (productUuid) await deleteProduct(page.request, productUuid).catch(() => undefined);
    }
  });

  test('Event & Tickets — Thumbnail - Hero Image, Thumbnail Validation, Buyer Form - Custom Questions, Buyer Form - Max Limit, Ticket - Quantity as Per-User Limit, Global After-Sales - Message, Ticket - Discount Upper Bound, Buyer Form - Question Dialog', {
    tag: ['@AUT-EVT-003', '@products', '@creator', '@regression'],
  }, async ({ eventsPage, productPurchasePage, page }) => {
    test.setTimeout(300000);
    const title = generateEventsTitle();
    const [textLabel, selectLabel, multiLabel, extraLabelOne, extraLabelTwo] = generateEventsBuyerQuestionLabels(5);
    const afterSalesMessage = generateEventsAfterSalesMessage();
    let productUuid = '';

    try {
      await test.step('Publishing without a thumbnail is refused', async () => {
        await eventsPage.goto();
        await eventsPage.expectLoaded();
        await eventsPage.fillMinimalEventsStep1({ title, description: generateEventsDescription() });
        await eventsPage.continueToEventsDetails();
        await eventsPage.submitEventsPublishDetails();
        await eventsPage.expectThumbnailRequired();
      });

      await test.step('Undersized, oversized and non-image thumbnails are rejected, and a valid one is accepted', async () => {
        const oversized = createOversizedImageFixture();
        try {
          await chooseHeroFile(page, eventsMediaData.tinyImagePath);
          await expectImageTooSmall(page, eventsMediaData.tinyFileName);
          await expectHeroNotUploaded(page);
          await chooseHeroFile(page, oversized.filePath);
          await expectImageTooLarge(page);
          await expectHeroNotUploaded(page);
          await chooseHeroFile(page, eventsMediaData.unsupportedFilePath);
          await eventsPage.expectThumbnailTypeRejected(eventsMediaData.unsupportedFileName);
          await expectHeroNotUploaded(page);
        } finally {
          oversized.cleanup();
        }
        await uploadHero(page, eventsMediaData.heroImagePath);
      });

      await test.step('The Add New Question dialog offers three input types, refuses an empty label and edits as Edit Question', async () => {
        await openAddQuestionDialog(page);
        await expectAddQuestionDialog(page);
        await expectQuestionInputTypes(page, eventsBuyerFormData.inputTypes);
        await submitEmptyQuestionLabel(page);
        await completeOpenBuyerQuestion(page, textLabel);
        await expectSavedBuyerQuestion(page, textLabel);
        await openEditBuyerQuestion(page, textLabel);
        await expectEditQuestionDialog(page);
        await cancelEditBuyerQuestion(page);
      });

      await test.step('Select and Multi Select questions take their options and a required flag', async () => {
        await addCustomBuyerQuestion(page, selectLabel, { type: 'Select', choices: generateEventsBuyerQuestionOptions(2), required: true });
        await expectSavedBuyerQuestion(page, selectLabel, { required: true });
        await addCustomBuyerQuestion(page, multiLabel, { type: 'Multi Select', choices: generateEventsBuyerQuestionOptions(2) });
        await expectSavedBuyerQuestion(page, multiLabel);
      });

      await test.step('Add Questions is disabled once five questions exist', async () => {
        await addCustomBuyerQuestion(page, extraLabelOne);
        await addCustomBuyerQuestion(page, extraLabelTwo);
        await expectAddQuestionsDisabled(page);
      });

      await test.step('The global after-sales message counts toward 1000 characters and previews as buyer content', async () => {
        await eventsPage.expectAfterSalesDefaultState();
        await eventsPage.fillAfterSalesMessage(afterSalesMessage);
        await eventsPage.expectAfterSalesMessageCounter(`${afterSalesMessage.length}/1000 characters`);
        await eventsPage.openAfterSalesPreview();
        await eventsPage.expectAfterSalesPreviewReadOnly(afterSalesMessage, []);
        await page.keyboard.press('Escape');
      });

      await test.step('A percentage discount over 100 is flagged as soon as it is entered and blocks publishing', async () => {
        await eventsPage.fillTicketDescription(0, generateEventsTicketDescription());
        await eventsPage.fillTicketPrice(0, eventsTicketsData.rawPrice);
        await eventsPage.fillTicketQuantity(0, eventsTicketsData.quantity);
        await eventsPage.fillTicketSalesPeriod(0);
        await eventsPage.setTicketDiscountEnabled(0, true);
        await eventsPage.selectDiscountType(0, '%');
        await eventsPage.fillTicketDiscountAmount('%', eventsTicketsData.overPercentDiscount);
        await eventsPage.expectPercentDiscountBlocked();
        await eventsPage.submitEventsPublishDetails();
        await eventsPage.expectPercentDiscountBlocked();
      });

      await test.step('Corrected to 20 percent the event publishes', async () => {
        await eventsPage.fillTicketDiscountAmount('%', eventsTicketsData.validPercentDiscount);
        await eventsPage.expectPercentDiscountAllowed();
        await eventsPage.submitEventsPublishDetails();
        await expectProductCompleteModal(page);
        const sharePath = await readProductCompleteSharePath(page);
        await closeProductCompleteModal(page);
        productUuid = (await findProductByTitle(page.request, title))!.uuid;
        await productPurchasePage.gotoSharePath(sharePath);
      });

      await test.step('Buyers see the discounted price and the ticket quantity as a per-user limit', async () => {
        await productPurchasePage.expectEventDiscountedTier(eventsTicketsData.buyerDiscountedPricePattern);
        await productPurchasePage.expectEventQuantityLabel(eventsTicketsData.buyerQuantityPattern);
      });
    } finally {
      if (productUuid) await deleteProduct(page.request, productUuid).catch(() => undefined);
    }
  });

  test('Event & Tickets — Thumbnail - Additional Images, Ticket Configuration - Create Tier, Ticket - Free Ticket, Ticket - Set Discount Toggle, Ticket - Multiple Tiers, Ticket - Sales Period, Per-Tier After-Sales Toggle, Global After-Sales - Links', {
    tag: ['@AUT-EVT-004', '@products', '@creator', '@regression'],
  }, async ({ eventsPage, productPurchasePage, page }) => {
    test.setTimeout(360000);
    const title = generateEventsTitle();
    const [paidTier, freeTier, laterTier] = [generateEventsTicketName(), generateEventsTicketName(), generateEventsTicketName()];
    const [firstLink, secondLink, thirdLink] = generateEventsAfterSalesLinks();
    const tierLink = { label: generateEventsAfterSalesLabel(), url: eventsAfterSalesData.firstLinkUrl };
    const thisMonth = { start: { month: 'current', day: 'first' }, end: { month: 'current', day: 'last' } } as const;
    let productUuid = '';

    try {
      await test.step('The gallery takes ten additional images beside the thumbnail, then closes', async () => {
        await eventsPage.goto();
        await eventsPage.expectLoaded();
        await eventsPage.fillEventsTitle(title);
        await eventsPage.fillEventsDescription(generateEventsDescription());
        await eventsPage.enableAllDaySchedule();
        await eventsPage.selectOnlineLocation();
        await eventsPage.selectEventDateNextMonth('last');
        await eventsPage.continueToEventsDetails();
        await uploadHero(page, eventsMediaData.heroImagePath);
        await eventsPage.expectEmptyAdditionalImageGallery();
        await uploadGallery(page, eventsMediaData.fullGalleryPaths);
        await eventsPage.expectGalleryFull(eventsMediaData.fullGalleryPaths.length);
      });

      await test.step('A tier takes name, description, price, quantity and a sales period', async () => {
        await eventsPage.renameTicketTier(0, eventsTicketsData.defaultTierName(0), paidTier);
        await eventsPage.fillTicketDescription(0, generateEventsTicketDescription());
        await eventsPage.fillTicketPrice(0, eventsTicketsData.rawPrice);
        await eventsPage.expectTicketPriceValue(0, eventsTicketsData.formattedPrice);
        await eventsPage.fillTicketQuantity(0, eventsTicketsData.quantity);
        await eventsPage.setTicketSalesPeriod(0, thisMonth);
      });

      await test.step('The discount toggle opens a per-tier discount', async () => {
        await eventsPage.setTicketDiscountEnabled(0, true);
        await eventsPage.selectDiscountType(0, '%');
        await eventsPage.fillTicketDiscountAmount('%', eventsTicketsData.validPercentDiscount);
        await eventsPage.expectTicketDiscountAmount('%', eventsTicketsData.validPercentDiscount);
      });

      await test.step('Per-tier after-sales replaces the default with its own message and link', async () => {
        await eventsPage.enablePerTierAfterSales(paidTier);
        await eventsPage.fillPerTierAfterSalesMessage(generateEventsAfterSalesMessage());
        await eventsPage.openPerTierAfterSalesLinkDialog();
        await eventsPage.fillAfterSalesLink(tierLink.url, tierLink.label);
        await eventsPage.saveAfterSalesLink();
        await eventsPage.expectAfterSalesLinks([tierLink.label]);
      });

      await test.step('A free tier keeps price 0', async () => {
        await eventsPage.addAnotherTicketType();
        await eventsPage.renameTicketTier(1, eventsTicketsData.defaultTierName(1), freeTier);
        await eventsPage.fillTicketDescription(1, generateEventsTicketDescription());
        await eventsPage.expectTicketPriceValue(1, eventsTicketsData.zeroPrice);
        await eventsPage.setTicketSalesPeriod(1, thisMonth);
      });

      await test.step('A third tier gets its own sales window starting next month', async () => {
        await eventsPage.addAnotherTicketType();
        await eventsPage.renameTicketTier(2, eventsTicketsData.defaultTierName(2), laterTier);
        await eventsPage.fillTicketDescription(2, generateEventsTicketDescription());
        await eventsPage.fillTicketPrice(2, eventsTicketsData.rawPrice);
        await eventsPage.setTicketSalesPeriod(2, { start: { month: 'next', day: 'first' }, end: { month: 'next', day: 'last' } });
      });

      await test.step('The three tiers are listed with collapse and delete controls', async () => {
        for (const tier of [paidTier, freeTier, laterTier]) await eventsPage.expectTicketTier(tier);
        await eventsPage.collapseTicketTier(paidTier);
        await eventsPage.expandTicketTier(paidTier);
      });

      await test.step('Global after-sales takes three links at most, each editable and removable', async () => {
        await eventsPage.enableAfterSalesLinks();
        for (const link of [firstLink, secondLink, thirdLink]) {
          await eventsPage.openGlobalAfterSalesLinkDialog();
          await eventsPage.fillAfterSalesLink(link.url, link.label);
          await eventsPage.saveAfterSalesLink();
        }
        await eventsPage.expectGlobalAfterSalesLinkLimit();
        await eventsPage.editAfterSalesLink(firstLink.label);
        await eventsPage.closeAfterSalesLinkDialog();
        await eventsPage.deleteAfterSalesLink(secondLink.label);
        await eventsPage.expectAfterSalesLinks([firstLink.label, thirdLink.label]);
      });

      await test.step('Buyers see the discounted tier, the free tier, and the later tier not yet on sale', async () => {
        await eventsPage.submitEventsPublishDetails();
        await expectProductCompleteModal(page);
        const sharePath = await readProductCompleteSharePath(page);
        await closeProductCompleteModal(page);
        productUuid = (await findProductByTitle(page.request, title))!.uuid;
        await productPurchasePage.gotoSharePath(sharePath);
        await productPurchasePage.expectEventTierCard(paidTier, { price: eventsTicketsData.buyerDiscountedPricePattern, onSale: true });
        await productPurchasePage.expectEventTierCard(freeTier, { price: /Free/, onSale: true });
        await productPurchasePage.expectEventTierCard(laterTier, { price: /Rp150[.,]000/, onSale: false });
      });
    } finally {
      if (productUuid) await deleteProduct(page.request, productUuid).catch(() => undefined);
    }
  });

  test('Event & Tickets — After-Sales Preview, Preview Panel, Ticket - Discount Type Options, Thumbnail - Gallery Capacity, Thumbnail vs Gallery Inputs, Ticket - Inline Rename, After-Sales Link - Edit Dialog Title, After-Sales - Image Consumes Char Budget', {
    tag: ['@AUT-EVT-005', '@products', '@creator', '@regression'],
    annotation: { type: 'issue', description: 'L-11' },
  }, async ({ eventsPage, productPurchasePage, page }) => {
    test.setTimeout(360000);
    // Known bug L-11: the edit-link dialog is still titled "Add Link". Last step.
    test.fail(true, 'L-11: the edit-link dialog is titled Add Link');
    const title = generateEventsTitle();
    const flatTier = generateEventsTicketName();
    const afterSalesMessage = generateEventsAfterSalesMessage();
    const [link] = generateEventsAfterSalesLinks();
    const thisMonth = { start: { month: 'current', day: 'first' }, end: { month: 'current', day: 'last' } } as const;
    let productUuid = '';

    try {
      await test.step('Thumbnail and gallery inputs share one accept list, and only the gallery takes several files', async () => {
        await eventsPage.goto();
        await eventsPage.expectLoaded();
        await eventsPage.fillMinimalEventsStep1({ title, description: generateEventsDescription() });
        await eventsPage.continueToEventsDetails();
        await eventsPage.expectHeroAndGalleryFileInputRules();
      });

      await test.step('The gallery shows a chooser and nine empty slots apart from the thumbnail, and fills slot by slot', async () => {
        await uploadHero(page, eventsMediaData.heroImagePath);
        await eventsPage.expectEmptyAdditionalImageGallery();
        await uploadGallery(page, [eventsMediaData.galleryImagePath]);
        await eventsPage.expectGalleryAfterOneUpload();
      });

      await test.step('The pencil renames a tier inline and the per-tier after-sales text follows the new name', async () => {
        await eventsPage.renameTicketTier(0, eventsTicketsData.defaultTierName(0), eventsTicketsData.renamedTierName);
        await eventsPage.expectAfterSalesUsesTicketName(eventsTicketsData.renamedTierName);
      });

      await test.step('The live preview shows thumbnail, badge, title, lowest price and creator', async () => {
        await eventsPage.fillTicketDescription(0, generateEventsTicketDescription());
        await eventsPage.fillTicketPrice(0, eventsTicketsData.rawPrice);
        await eventsPage.setTicketSalesPeriod(0, thisMonth);
        await eventsPage.expectPreviewPanelDetails(title);
        await eventsPage.expectPreviewStartFrom(eventsTicketsData.previewPricePattern);
      });

      await test.step('The discount type offers exactly percent and rupiah, and each tier keeps its own', async () => {
        await eventsPage.setTicketDiscountEnabled(0, true);
        await eventsPage.expectDiscountTypes(0);
        await eventsPage.selectDiscountType(0, '%');
        await eventsPage.fillTicketDiscountAmount('%', eventsTicketsData.validPercentDiscount);
        await eventsPage.addAnotherTicketType();
        await eventsPage.renameTicketTier(1, eventsTicketsData.defaultTierName(1), flatTier);
        await eventsPage.fillTicketDescription(1, generateEventsTicketDescription());
        await eventsPage.fillTicketPrice(1, eventsTicketsData.rawPrice);
        await eventsPage.setTicketSalesPeriod(1, thisMonth);
        await eventsPage.setTicketDiscountEnabled(1, true);
        await eventsPage.selectDiscountType(1, 'Rp');
        await eventsPage.fillTicketDiscountAmount('Rp', eventsTicketsData.rpDiscountAmount, 1);
      });

      await test.step('An embedded image eats most of the 1000-character after-sales budget, plain text counts exactly', async () => {
        await eventsPage.insertAfterSalesImage(eventsMediaData.heroImagePath);
        await eventsPage.expectAfterSalesImageBudgetConsumed();
        await eventsPage.removeAfterSalesImage();
        await eventsPage.expectAfterSalesMessageCounter(eventsAfterSalesData.emptyCounter);
        await eventsPage.fillAfterSalesMessage(afterSalesMessage);
        await eventsPage.expectAfterSalesMessageCounter(`${afterSalesMessage.length}/1000 characters`);
      });

      await test.step('The after-sales preview shows the staged message and link read-only', async () => {
        await eventsPage.enableAfterSalesLinks();
        await eventsPage.openGlobalAfterSalesLinkDialog();
        await eventsPage.fillAfterSalesLink(link.url, link.label);
        await eventsPage.saveAfterSalesLink();
        await eventsPage.openAfterSalesPreview();
        await eventsPage.expectAfterSalesPreviewReadOnly(afterSalesMessage, [link.label]);
        await page.keyboard.press('Escape');
      });

      await test.step('Both discount types are saved and priced on the buyer page', async () => {
        await eventsPage.submitEventsPublishDetails();
        await expectProductCompleteModal(page);
        const sharePath = await readProductCompleteSharePath(page);
        await closeProductCompleteModal(page);
        productUuid = (await findProductByTitle(page.request, title))!.uuid;
        await productPurchasePage.gotoSharePath(sharePath);
        await productPurchasePage.expectEventTierCard(eventsTicketsData.renamedTierName, { price: eventsTicketsData.buyerDiscountedPricePattern, onSale: true });
        await productPurchasePage.expectEventTierCard(flatTier, { price: eventsTicketsData.buyerFlatDiscountedPricePattern, onSale: true });
      });

      await test.step('Editing a saved link opens it prefilled under an edit title', async () => {
        await eventsPage.gotoEdit(productUuid);
        await eventsPage.continueToEventsDetails();
        await eventsPage.expectAfterSalesLinkEditDialog(link);
      });
    } finally {
      if (productUuid) await deleteProduct(page.request, productUuid).catch(() => undefined);
    }
  });

  test('Event & Tickets — Publish Event, Save as Draft, Save as Draft Availability', {
    tag: ['@AUT-EVT-006', '@products', '@creator', '@regression'],
  }, async ({ eventsPage, creatorNav, productsPage, productPurchasePage, explorePage, page }) => {
    test.setTimeout(300000);
    const title = generateEventsTitle();
    let productUuid = '';
    let draftCount = 0;

    try {
      await test.step('Save as Draft is not offered on Step 1, with or without a title', async () => {
        const listResponse = productsPage.waitForListResponse();
        await creatorNav.open('products');
        await listResponse;
        draftCount = await productsPage.readStatusCount('Draft');
        await productsPage.openAddProductSheet();
        await productsPage.selectProductType(eventsType.buttonName);
        await eventsPage.expectEventsCreateFlow();
        await eventsPage.expectSaveAsDraftAbsent();
        await eventsPage.fillEventsTitle(title);
        await eventsPage.expectSaveAsDraftAbsent();
      });

      await test.step('On Step 2 the event saves as a draft that buyers cannot open and the creator can resume', async () => {
        await eventsPage.fillMinimalEventsStep1({ title, description: generateEventsDescription() });
        await eventsPage.continueToEventsDetails();
        await eventsPage.expectSaveAsDraftAvailable();
        // A tier without a sales period cannot be saved as a draft yet ("Invalid request"); see the bug report.
        await eventsPage.fillTicketSalesPeriod(0);
        await saveAsDraft(page);
        const draft = await findProductByTitle(page.request, title);
        expect(draft?.status).toBe('draft');
        productUuid = draft!.uuid;
        const listResponse = productsPage.waitForListResponse();
        await creatorNav.open('products');
        await listResponse;
        await expect.poll(() => productsPage.readStatusCount('Draft')).toBe(draftCount + 1);
        await productPurchasePage.gotoSharePath(`/s/${(await getProduct(page.request, productUuid)).shortUrl}`);
        await productPurchasePage.expectProductPageNotFound();
        await eventsPage.gotoEdit(productUuid);
        await expectTitleValue(page, title);
      });

      await test.step('Publishing the resumed draft puts it live and in the Explore events category', async () => {
        await eventsPage.continueToEventsDetails();
        await eventsPage.fillTicketDescription(0, generateEventsTicketDescription());
        await uploadHero(page, eventsMediaData.heroImagePath);
        await eventsPage.submitEventsPublishDetails();
        await expectProductCompleteModal(page);
        const sharePath = await readProductCompleteSharePath(page);
        await closeProductCompleteModal(page);
        expect((await getProduct(page.request, productUuid)).status).toBe('active');
        await productPurchasePage.gotoSharePath(sharePath);
        await expect(page).toHaveURL(eventsPublishData.canonicalProductUrlPattern, { timeout: 15000 });
        await explorePage.goto();
        await explorePage.expectLoaded();
        await explorePage.selectProductCategory(buyerEventsDetailData.exploreFilter.label, buyerEventsDetailData.exploreFilter.query);
        await explorePage.expectEventCard({ title, creator: creatorProfile, badge: buyerEventsDetailData.eventBadge });
      });
    } finally {
      if (productUuid) await deleteProduct(page.request, productUuid).catch(() => undefined);
    }
  });

  test('Event & Tickets — Version History, Edit Basic Fields, Switch Event Status (Active/Inactive), Product Row Action Menu', {
    tag: ['@AUT-EVT-007', '@products', '@creator', '@regression'],
  }, async ({ eventsPage, creatorNav, productsPage, productPurchasePage, page }) => {
    test.setTimeout(300000);
    const data = generateEventsEditData();
    const seed = generateBuyerEventDiscoverySeedData();
    let productUuid = '';
    let sharePath = '';
    let editedDate = '';

    try {
      await test.step('A published event row offers Set Inactive, Hide from Profile, Edit, See Attendances, Share, Hide and Delete', async () => {
        const event = await createEventProduct(page.request, {
          title: data.baselineTitle,
          description: data.baselineDescription,
          thumbnailImagePath: eventsMediaData.heroImagePath,
          eventDate: seed.timedEvent.eventDate,
          eventTimeStart: data.baselineStartTime,
          eventTimeEnd: data.baselineEndTime,
          venueType: 'on_site',
          venueName: data.baselineVenue,
          venueAddress: data.baselineAddress,
          platform: 'custom',
          meetingLink: eventsBasicInfoData.validMeetingLink,
          tickets: [seed.timedEvent.ticket],
        });
        productUuid = event.productUuid;
        sharePath = event.sharePath;
        await creatorNav.open('products');
        await productsPage.searchProductsUntilVisible(data.baselineTitle);
        await productsPage.expectProductActionMenuItems(data.baselineTitle, eventsPublishData.rowActions);
      });

      await test.step('Title, description, schedule and venue edits reach the buyer page', async () => {
        await eventsPage.gotoEdit(productUuid);
        await eventsPage.fillEditableEventsStep1({
          title: data.editedTitle,
          description: data.editedDescription,
          venue: data.editedVenue,
          address: data.editedAddress,
          startTime: data.editedStartTime,
          endTime: data.editedEndTime,
          datePosition: 'next-month',
        });
        editedDate = await eventsPage.readEventDateText();
        await eventsPage.continueToEventsDetails();
        await eventsPage.submitEventsPublishDetails();
        await expect.poll(async () => (await getProduct(page.request, productUuid)).title, { timeout: 20000 }).toBe(data.editedTitle);
        await productPurchasePage.gotoSharePath(sharePath);
        await productPurchasePage.expectEventsBuyerDetails({
          title: data.editedTitle,
          description: data.editedDescription,
          venue: data.editedVenue,
          address: data.editedAddress,
          eventDate: editedDate,
          startTime: data.editedStartTime,
          endTime: data.editedEndTime,
        });
      });

      await test.step('Version history keeps a timestamped entry naming what the edit changed', async () => {
        await eventsPage.gotoEdit(productUuid);
        await expectVersionHistory(page, { changedField: 'Title' });
      });

      await test.step('Set Inactive takes the event off sale and the same switch puts it back', async () => {
        const listResponse = productsPage.waitForListResponse();
        await creatorNav.open('products');
        await listResponse;
        // Tab counts follow the search box, so read them with the event's title already searched.
        await productsPage.searchProductsUntilVisible(data.editedTitle);
        const active = await productsPage.readStatusCount('Active');
        const inactive = await productsPage.readStatusCount('Inactive');
        await productsPage.setProductInactive(data.editedTitle);
        expect((await getProduct(page.request, productUuid)).status).toBe('inactive');
        await expect.poll(() => productsPage.readStatusCount('Active')).toBe(active - 1);
        await expect.poll(() => productsPage.readStatusCount('Inactive')).toBe(inactive + 1);
        await productPurchasePage.gotoSharePath(sharePath);
        await productPurchasePage.expectProductPageNotFound();

        await creatorNav.open('products');
        await productsPage.selectStatusTab('Inactive');
        await productsPage.searchProductsUntilVisible(data.editedTitle);
        await productsPage.setProductActive(data.editedTitle);
        expect((await getProduct(page.request, productUuid)).status).toBe('active');
        await productPurchasePage.gotoSharePath(sharePath);
        await productPurchasePage.expectEventsBuyerDetails({
          title: data.editedTitle,
          description: data.editedDescription,
          venue: data.editedVenue,
          address: data.editedAddress,
          eventDate: editedDate,
          startTime: data.editedStartTime,
          endTime: data.editedEndTime,
        });
      });
    } finally {
      if (productUuid) await deleteProduct(page.request, productUuid).catch(() => undefined);
    }
  });

  test('Event & Tickets — Guest List, Guest List Summary, Check In Guest - Button Access, Search Guest, Filter Guests, Guest List Pagination, Guest Summary Copy, Guest Count Consistency', {
    tag: ['@AUT-EVT-008', '@products', '@creator', '@regression'],
    annotation: { type: 'issue', description: 'L-10' },
  }, async ({ eventGuestsPage }) => {
    test.setTimeout(180000);
    // Known bug L-10: the attendee stat is spelled "Attandee". Last step.
    test.fail(true, 'L-10: guest summary label reads Attandee');
    let registered = 0;

    await test.step('The guest table lists Name, Email, Phone, Status, Checked-in Time and Registered Time', async () => {
      await eventGuestsPage.goto();
      await eventGuestsPage.expectLoaded();
      await eventGuestsPage.expectGuestTableColumns();
    });

    await test.step('The summary shows the attendee, registered and capacity figures', async () => {
      const summary = await eventGuestsPage.readGuestSummary();
      registered = summary.registered;
      expect(registered).toBeGreaterThan(0);
      expect(summary.capacity).toBeGreaterThan(0);
    });

    await test.step('Registered equals the guest rows across every page', async () => {
      expect(await eventGuestsPage.readTotalGuestRowCountAcrossPages()).toBe(registered);
    });

    await test.step('The table pages ten guests at a time with page numbers and Next', async () => {
      await eventGuestsPage.goToGuestPage(1);
      await eventGuestsPage.expectGuestPagination(Math.ceil(registered / eventsGuestsData.rowsPerPage));
      await eventGuestsPage.expectGuestRowCount(eventsGuestsData.rowsPerPage);
      await eventGuestsPage.goToGuestPage(2);
      expect(await eventGuestsPage.readGuestRowCountOnCurrentPage()).toBe(registered - eventsGuestsData.rowsPerPage);
      await eventGuestsPage.goToGuestPage(1);
    });

    await test.step('Search narrows the list to the matching name, and clearing it restores the list', async () => {
      const name = await eventGuestsPage.readFirstGuestName();
      await eventGuestsPage.searchGuest(name);
      await eventGuestsPage.expectGuestRowsMatch(name);
      await eventGuestsPage.searchGuest('');
      await eventGuestsPage.expectGuestRowCount(eventsGuestsData.rowsPerPage);
    });

    await test.step('The Status filter narrows to Active guests, and Reset restores every status', async () => {
      await eventGuestsPage.openFilterPanel();
      await eventGuestsPage.expectFilterStatusOptions();
      await eventGuestsPage.setStatusFilterChecked('Used', false);
      await eventGuestsPage.setStatusFilterChecked('Cancelled', false);
      await eventGuestsPage.applyFilter();
      await eventGuestsPage.expectGuestRowStatusesAllEqual('Active');
      await eventGuestsPage.openFilterPanel();
      await eventGuestsPage.resetFilter();
      await eventGuestsPage.expectFilterStatusOptions();
      await eventGuestsPage.closeFilterPanel();
    });

    await test.step('Check in Guest opens the QR scanner', async () => {
      await eventGuestsPage.openCheckInScanner();
      await eventGuestsPage.expectQrScannerMounted();
      await eventGuestsPage.closeCheckInScanner();
    });

    await test.step('The summary labels read Attendee and Registered', async () => {
      await eventGuestsPage.expectGuestSummaryLabels(eventsGuestsData.summaryLabels);
    });
  });

  test('Event & Tickets — Basic Info - Title Length, Description Counter Unit, Schedule - Past Date Guard, Accessibility - Control Names, Online Venue - Platform Options, On-site Venue - Map Link Field, Schedule - Recurrence', {
    tag: ['@AUT-EVT-009', '@products', '@creator', '@regression'],
    annotation: [{ type: 'issue', description: 'M-46' }, { type: 'issue', description: 'M-26' }, { type: 'issue', description: 'L-43' }],
  }, async ({ eventsPage }) => {
    test.setTimeout(180000);
    // Known bugs M-46 (no title limit), M-26 (counter counts words) and L-43 (unnamed controls). Last three steps.
    test.fail(true, 'M-46 / M-26 / L-43: title limit, description counter, accessible names');

    await test.step('The event date picker disables every day before today', async () => {
      await eventsPage.goto();
      await eventsPage.expectLoaded();
      await eventsPage.expectPastEventDatesDisabled();
    });

    await test.step('Schedule is a single date, start and end time, All Day and a searchable timezone, with no recurrence', async () => {
      await eventsPage.expectScheduleControls(eventsBasicInfoData.timezonePicker);
    });

    await test.step('On-site asks only for Venue Name and Address', async () => {
      await eventsPage.expectOnSiteVenueFields();
    });

    await test.step('Online offers Google Meet, preselected, and Custom — no None', async () => {
      await eventsPage.selectOnlineLocation();
      await eventsPage.expectOnlinePlatformOptions(eventsBasicInfoData.platformOptions, 'Google Meet');
    });

    await test.step('The title stops at its documented maximum', async () => {
      await eventsPage.fillEventsTitle('T'.repeat(eventsBasicInfoData.overlongTitleLength));
      await eventsPage.expectEventsTitleLimited();
    });

    await test.step('The description counter counts characters', async () => {
      await eventsPage.fillEventsDescription(eventsBasicInfoData.counterSample);
      await eventsPage.expectDescriptionCounter(`${eventsBasicInfoData.counterSample.length} / 500`);
    });

    await test.step('Location radios and the All Day switch have accessible names', async () => {
      await eventsPage.expectFormControlsNamed();
    });
  });

  test('Event & Tickets — After-Sales Link Dialog, Completeness Meter, Guest Filter Options, Check-in QR Scanner, After-Sales Default State on Create, Ticket Tier Controls, Post-Event Materials', {
    tag: ['@AUT-EVT-010', '@products', '@creator', '@regression'],
  }, async ({ eventsPage, eventGuestsPage, page }) => {
    test.setTimeout(240000);
    const linkData = digitalProductValidationData.linkValidation;
    const label = generateEventsAfterSalesLabel();
    const [link] = generateEventsAfterSalesLinks();
    const extraTier = eventsTicketsData.defaultTierName(1);
    let completionOnArrival = 0;

    await test.step('On a new event Customize Message is already on, with the editor and a 0/1000 counter', async () => {
      await eventsPage.goto();
      await eventsPage.expectLoaded();
      await eventsPage.fillMinimalEventsStep1({ title: generateEventsTitle(), description: generateEventsDescription() });
      await eventsPage.continueToEventsDetails();
      await eventsPage.expectAfterSalesDefaultState();
    });

    await test.step('Step 2 opens below 100% completed', async () => {
      completionOnArrival = await eventsPage.readCompletionPercentage();
      expect(completionOnArrival).toBeGreaterThan(0);
      expect(completionOnArrival).toBeLessThan(100);
    });

    await test.step('Step 2 has no recording or attachment upload — only the image thumbnail and gallery, and links in After Sales', async () => {
      await eventsPage.expectEventsDetailsSections(eventsBasicInfoData.detailsSections);
      await eventsPage.expectNoAttachmentUpload(eventsMediaData.acceptList);
    });

    await test.step('Add Link puts URL above a 40-character label, refuses an unschemed URL and saves a valid one', async () => {
      await eventsPage.enableAfterSalesLinks();
      await eventsPage.openGlobalAfterSalesLinkDialog();
      await eventsPage.expectAfterSalesLinkFieldOrder();
      await eventsPage.fillAfterSalesLink(linkData.invalidUrl, label);
      await eventsPage.expectInvalidAfterSalesLink(label.length);
      await eventsPage.fillAfterSalesLink(link.url, linkData.longLabel);
      expect(await eventsPage.readAfterSalesLinkLabel()).toBe(linkData.truncatedLongLabel);
      await eventsPage.fillAfterSalesLink(link.url, link.label);
      await eventsPage.saveAfterSalesLink();
      await eventsPage.expectAfterSalesLinks([link.label]);
    });

    await test.step('A tier collapses and expands, and Delete removes it without asking', async () => {
      await eventsPage.addAnotherTicketType();
      await eventsPage.expectTicketTier(extraTier);
      await eventsPage.expectTicketTierCollapsible(1, extraTier);
      await eventsPage.deleteTicketTier(extraTier);
    });

    await test.step('Filling the thumbnail, tier and sales period brings the meter to 100%', async () => {
      await eventsPage.fillTicketDescription(0, generateEventsTicketDescription());
      await eventsPage.fillTicketSalesPeriod(0);
      await uploadHero(page, eventsMediaData.heroImagePath);
      expect(await eventsPage.readCompletionPercentage()).toBe(100);
    });

    await test.step('The guest Filter offers Active, Used and Cancelled; one status narrows the list, Reset restores it', async () => {
      await eventGuestsPage.goto();
      await eventGuestsPage.expectLoaded();
      const all = await eventGuestsPage.readGuestRowCountOnCurrentPage();
      await eventGuestsPage.openFilterPanel();
      await eventGuestsPage.expectFilterStatusOptions();
      await eventGuestsPage.setStatusFilterChecked('Active', false);
      await eventGuestsPage.setStatusFilterChecked('Cancelled', false);
      await eventGuestsPage.applyFilter();
      await expect.poll(() => eventGuestsPage.readGuestRowCountOnCurrentPage(), { timeout: 15000 }).toBeLessThan(all);
      await eventGuestsPage.openFilterPanel();
      await eventGuestsPage.resetFilter();
      await eventGuestsPage.applyFilter();
      await eventGuestsPage.expectGuestRowCount(all);
    });

    await test.step('Check in Guest mounts the camera preview for scanning tickets', async () => {
      await eventGuestsPage.openCheckInScanner();
      await eventGuestsPage.expectQrScannerMounted();
      await eventGuestsPage.closeCheckInScanner();
    });
  });
});
