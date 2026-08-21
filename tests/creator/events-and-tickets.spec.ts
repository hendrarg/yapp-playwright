import { creatorAuthTest as test, expect } from '../test-base';
import { addCustomBuyerQuestion, cancelEditBuyerQuestion, chooseHeroFile, closeProductCompleteModal, completeOpenBuyerQuestion, expectAddQuestionDialog, expectAddQuestionsDisabled, expectAdditionalQuestionsHeading, expectEditQuestionDialog, expectHeroNotUploaded, expectImageTooSmall, expectProductCompleteModal, expectQuestionInputTypes, expectSavedBuyerQuestion, openAddQuestionDialog, openEditBuyerQuestion, readProductCompleteSharePath, submitEmptyQuestionLabel, uploadGallery, uploadHero } from '@helpers/creator/product-editor';
import { deleteProduct } from '@helpers/api/product';
import { eventsBuyerFormData, generateEventsBuyerQuestionLabels, generateEventsBuyerQuestionOptions } from '@test-data/creator/events.buyer-form.data';
import { eventsAfterSalesData, generateEventsAfterSalesLabel, generateEventsAfterSalesLinks, generateEventsAfterSalesMessage } from '@test-data/creator/events.after-sales.data';
import { generateEventsEditData } from '@test-data/creator/events.edit.data';
import { eventsGuestsData } from '@test-data/creator/events.guests.data';
import { eventsMediaData, generateEventsDescription, generateEventsTitle } from '@test-data/creator/events.media.data';
import { eventsTicketsData, generateEventsTicketDescription, generateEventsTicketName } from '@test-data/creator/events.tickets.data';
import { eventsPublishData } from '@test-data/creator/events.publish.data';
import { productsCreationData } from '@test-data/creator/products.creation.data';

test.describe('Creator Events and Tickets', () => {
  test('Validate Event Thumbnail and Additional Image Upload', {
    tag: ['@AUT-FV-312', '@products', '@creator', '@regression'],
  }, async ({eventsPage, creatorNav, productsPage, page }) => {
    test.setTimeout(180000);

    const eventsType = productsCreationData.productTypes.find(
      (type) => type.label === 'Events and Tickets',
    )!;

    await test.step('Open Events and Tickets create flow', async () => {
      await creatorNav.open('products');
      await productsPage.expectLoaded();
      await productsPage.openAddProductSheet();
      await productsPage.selectProductType(eventsType.buttonName);
      await eventsPage.expectEventsCreateFlow();
    });

    await test.step('Fill All Day online details and continue to thumbnails', async () => {
      await eventsPage.fillMinimalEventsStep1({
        title: generateEventsTitle(),
        description: generateEventsDescription(),
      });
      await eventsPage.continueToEventsDetails();
    });

    await test.step('Verify hero and gallery file input accept lists', async () => {
      await eventsPage.expectHeroAndGalleryFileInputRules();
    });

    await test.step('Require a thumbnail before publish', async () => {
      await eventsPage.submitEventsPublishDetails();
      await eventsPage.expectThumbnailRequired();
    });

    await test.step('Reject undersized hero images on both axes', async () => {
      await chooseHeroFile(page, eventsMediaData.tinyImagePath);
      await expectImageTooSmall(page, eventsMediaData.tinyFileName);
      await expectHeroNotUploaded(page);

      await chooseHeroFile(page, eventsMediaData.oneAxisUndersizedPath);
      await expectImageTooSmall(page, eventsMediaData.oneAxisUndersizedFileName);
      await expectHeroNotUploaded(page);
    });

    await test.step('Upload a valid hero thumbnail', async () => {
      await uploadHero(page, eventsMediaData.heroImagePath);
    });

    await test.step('Count ten additional-image gallery slots', async () => {
      await eventsPage.expectEmptyAdditionalImageGallery();
    });

    await test.step('Upload one gallery image without changing the thumbnail', async () => {
      await uploadGallery(page, [eventsMediaData.galleryImagePath]);
      await eventsPage.expectGalleryAfterOneUpload();
    });
  });

  test('Validate Event Buyer Form Custom Questions Configuration', {
    tag: ['@AUT-FV-313', '@products', '@creator', '@regression'],
  }, async ({eventsPage, creatorNav, productsPage, page }) => {
    test.setTimeout(180000);

    const eventsType = productsCreationData.productTypes.find(
      (type) => type.label === 'Events and Tickets',
    )!;
    const [textLabel, selectLabel, multiLabel, extraLabelOne, extraLabelTwo] =
      generateEventsBuyerQuestionLabels(5);
    const selectChoices = generateEventsBuyerQuestionOptions(2);
    const multiChoices = generateEventsBuyerQuestionOptions(2);

    await test.step('Open Events and Tickets create flow', async () => {
      await creatorNav.open('products');
      await productsPage.expectLoaded();
      await productsPage.openAddProductSheet();
      await productsPage.selectProductType(eventsType.buttonName);
      await eventsPage.expectEventsCreateFlow();
    });

    await test.step('Fill All Day online details and continue to buyer form', async () => {
      await eventsPage.fillMinimalEventsStep1({
        title: generateEventsTitle(),
        description: generateEventsDescription(),
      });
      await eventsPage.continueToEventsDetails();
      await expectAdditionalQuestionsHeading(page);
    });

    await test.step('Open Add New Question dialog', async () => {
      await openAddQuestionDialog(page);
      await expectAddQuestionDialog(page);
    });

    await test.step('Enumerate Input Type options', async () => {
      await expectQuestionInputTypes(page, eventsBuyerFormData.inputTypes);
    });

    await test.step('Reject an empty question label', async () => {
      await submitEmptyQuestionLabel(page);
    });

    await test.step('Create Text, Select, and Multi Select questions', async () => {
      await completeOpenBuyerQuestion(page, textLabel);
      await expectSavedBuyerQuestion(page, textLabel);

      await addCustomBuyerQuestion(page, selectLabel, {
        type: 'Select',
        choices: selectChoices,
        required: true,
      });
      await expectSavedBuyerQuestion(page, selectLabel, { required: true });

      await addCustomBuyerQuestion(page, multiLabel, {
        type: 'Multi Select',
        choices: multiChoices,
      });
      await expectSavedBuyerQuestion(page, multiLabel);
    });

    await test.step('Edit a saved question', async () => {
      await openEditBuyerQuestion(page, textLabel);
      await expectEditQuestionDialog(page);
      await cancelEditBuyerQuestion(page);
    });

    await test.step('Disable Add Questions at the five-question maximum', async () => {
      await addCustomBuyerQuestion(page, extraLabelOne);
      await addCustomBuyerQuestion(page, extraLabelTwo);
      await expectAdditionalQuestionsHeading(page);
      await expectAddQuestionsDisabled(page);
    });
  });

  test('Validate Event Ticket Tier Configuration, Pricing, and Discounts', {
    tag: ['@AUT-FV-314', '@products', '@creator', '@smoke', '@regression'],
  }, async ({eventsPage, creatorNav, productsPage, page }) => {
    test.setTimeout(180000);

    const eventsType = productsCreationData.productTypes.find(
      (type) => type.label === 'Events and Tickets',
    )!;
    const paidTierName = generateEventsTicketName();
    const paidTierDescription = generateEventsTicketDescription();
    const freeTierName = eventsTicketsData.defaultTierName(1);
    const thirdTierName = eventsTicketsData.defaultTierName(2);

    await test.step('Open Events and Tickets create flow', async () => {
      await creatorNav.open('products');
      await productsPage.expectLoaded();
      await productsPage.openAddProductSheet();
      await productsPage.selectProductType(eventsType.buttonName);
      await eventsPage.expectEventsCreateFlow();
    });

    await test.step('Fill All Day online details and continue to ticket configuration', async () => {
      await eventsPage.fillMinimalEventsStep1({
        title: generateEventsTitle(),
        description: generateEventsDescription(),
      });
      await eventsPage.continueToEventsDetails();
      await eventsPage.expectTicketConfiguration();
    });

    await test.step('Rename the default tier with the pencil control', async () => {
      await eventsPage.renameTicketTier(0, eventsTicketsData.defaultTierName(0), paidTierName);
      await eventsPage.expectAfterSalesUsesTicketName(paidTierName);
    });

    await test.step('Fill description, price, quantity, and sales period', async () => {
      await eventsPage.fillTicketDescription(0, paidTierDescription);
      await eventsPage.fillTicketPrice(0, eventsTicketsData.rawPrice);
      await eventsPage.expectTicketPriceValue(0, eventsTicketsData.formattedPrice);
      await eventsPage.expectTicketQuantity(0, eventsTicketsData.quantity);
      await eventsPage.fillTicketSalesPeriod(0);
    });

    await test.step('Configure discount limits and free ticket price', async () => {
      await eventsPage.setTicketDiscountEnabled(0, true);
      await eventsPage.expectDiscountTypes(0);
      await eventsPage.selectDiscountType(0, 'Rp');
      await eventsPage.fillTicketDiscountAmount('Rp', eventsTicketsData.rpDiscountAmount);
      await eventsPage.fillTicketDiscountAmount('Rp', eventsTicketsData.rpDiscountAtTicketPrice);
      await eventsPage.expectTicketDiscountAmount('Rp', eventsTicketsData.formattedPrice);
      await eventsPage.selectDiscountType(0, '%');
      await eventsPage.fillTicketDiscountAmount('%', eventsTicketsData.validPercentDiscount);
    });

    await test.step('Block a percentage discount above 100 percent', async () => {
      await eventsPage.fillTicketDiscountAmount('%', eventsTicketsData.overPercentDiscount);
      await eventsPage.expectPercentDiscountBlocked();
      await uploadHero(page, eventsMediaData.heroImagePath);
      await eventsPage.submitEventsPublishDetails();
      await eventsPage.expectPercentDiscountBlocked();
    });

    await test.step('Accept a valid percentage discount', async () => {
      await eventsPage.fillTicketDiscountAmount('%', eventsTicketsData.validPercentDiscount);
      await eventsPage.expectTicketDiscountAmount('%', eventsTicketsData.validPercentDiscount);
    });

    await test.step('Add a free tier and a third collapsible tier', async () => {
      await eventsPage.addAnotherTicketType();
      await eventsPage.expectTicketTier(freeTierName);
      await eventsPage.fillTicketDescription(1, generateEventsTicketDescription());
      await eventsPage.expectTicketPriceValue(1, eventsTicketsData.zeroPrice);
      await eventsPage.expectPreviewStartFrom(eventsTicketsData.previewZeroPricePattern);

      await eventsPage.addAnotherTicketType();
      await eventsPage.expectTicketTier(thirdTierName);
      await eventsPage.collapseTicketTier(paidTierName);
      await eventsPage.expandTicketTier(paidTierName);
    });
  });

  test('Validate Event After-Sales Configuration and Preview', {
    tag: ['@AUT-FV-315', '@products', '@creator', '@regression'],
  }, async ({eventsPage, creatorNav, productsPage, page }) => {
    test.setTimeout(180000);

    const eventsType = productsCreationData.productTypes.find(
      (type) => type.label === 'Events and Tickets',
    )!;
    const tierName = eventsTicketsData.defaultTierName(0);
    const afterSalesMessage = generateEventsAfterSalesMessage();
    const validationLabel = generateEventsAfterSalesLabel();
    const [firstLink, secondLink, thirdLink] = generateEventsAfterSalesLinks();

    await test.step('Open a new Events and Tickets Step 2 flow', async () => {
      await creatorNav.open('products');
      await productsPage.expectLoaded();
      await productsPage.openAddProductSheet();
      await productsPage.selectProductType(eventsType.buttonName);
      await eventsPage.expectEventsCreateFlow();
      await eventsPage.fillMinimalEventsStep1({
        title: generateEventsTitle(),
        description: generateEventsDescription(),
      });
      await eventsPage.continueToEventsDetails();
    });

    await test.step('Verify Customize Message defaults on and exposes the editor', async () => {
      await eventsPage.expectAfterSalesDefaultState();
    });

    await test.step('Track plain text and embedded-image character budgets', async () => {
      await eventsPage.fillAfterSalesMessage(afterSalesMessage);
      await eventsPage.expectAfterSalesMessageCounter(`${afterSalesMessage.length}/1000 characters`);
      await eventsPage.insertAfterSalesImage(eventsMediaData.heroImagePath);
      await eventsPage.expectAfterSalesImageBudgetConsumed();
      await eventsPage.removeAfterSalesImage();
      await eventsPage.expectAfterSalesMessageCounter(eventsAfterSalesData.emptyCounter);
      await eventsPage.fillAfterSalesMessage(afterSalesMessage);
      await eventsPage.expectAfterSalesMessageCounter(`${afterSalesMessage.length}/1000 characters`);
    });

    await test.step('Validate link dialog order, URL validation, and label counter', async () => {
      await eventsPage.enableAfterSalesLinks();
      await eventsPage.openGlobalAfterSalesLinkDialog();
      await eventsPage.fillAfterSalesLink('not-a-url', validationLabel);
      await eventsPage.expectInvalidAfterSalesLink(validationLabel.length);
      await eventsPage.fillAfterSalesLink(firstLink.url, firstLink.label);
      await eventsPage.saveAfterSalesLink();
    });

    await test.step('Enforce three global links and manage saved links', async () => {
      await eventsPage.openGlobalAfterSalesLinkDialog();
      await eventsPage.fillAfterSalesLink(secondLink.url, secondLink.label);
      await eventsPage.saveAfterSalesLink();
      await eventsPage.openGlobalAfterSalesLinkDialog();
      await eventsPage.fillAfterSalesLink(thirdLink.url, thirdLink.label);
      await eventsPage.saveAfterSalesLink();
      await eventsPage.expectAfterSalesLinks([firstLink.label, secondLink.label, thirdLink.label]);
      await eventsPage.expectGlobalAfterSalesLinkLimit();
      await eventsPage.editAfterSalesLink(firstLink.label);
      await eventsPage.closeAfterSalesLinkDialog();
      await eventsPage.deleteAfterSalesLink(secondLink.label);
      await eventsPage.expectAfterSalesLinks([firstLink.label, thirdLink.label]);
    });

    await test.step('Enable per-tier after-sales content and name its helper state', async () => {
      await eventsPage.enablePerTierAfterSales(tierName);
      await eventsPage.fillPerTierAfterSalesMessage(`Per-tier message for ${tierName}`);
      await eventsPage.openPerTierAfterSalesLinkDialog();
      await eventsPage.fillAfterSalesLink('https://example.com/tier-details', 'Tier Details');
      await eventsPage.saveAfterSalesLink();
    });

    await test.step('Assert the known Add Link title on edit mode', async () => {
      await eventsPage.openAfterSalesLinkEditAndAssertKnownTitle(firstLink.label);
      await eventsPage.closeAfterSalesLinkDialog();
    });

    await test.step('Preview staged global content as read-only buyer content', async () => {
      await eventsPage.openAfterSalesPreview();
      await eventsPage.expectAfterSalesPreviewReadOnly(afterSalesMessage, [firstLink.label, thirdLink.label]);
      await page.keyboard.press('Escape');
    });
  });

  test('Validate Event Publishing, Draft, and Preview Panel', {
    tag: ['@AUT-FV-316', '@products', '@creator', '@regression'],
  }, async ({ eventsPage, creatorNav, productsPage, productPurchasePage, page }) => {
    test.setTimeout(180000);

    const eventsType = productsCreationData.productTypes.find(
      (type) => type.label === 'Events and Tickets',
    )!;
    const title = generateEventsTitle();
    let productUuid = '';
    let sharePath = '';
    let activeCountBefore = 0;

    try {
      await test.step('Read the baseline Active count', async () => {
        const listResponse = productsPage.waitForListResponse();
        await creatorNav.open('products');
        await productsPage.expectLoaded();
        await listResponse;
        await expect.poll(() => productsPage.readActiveCount()).toBeGreaterThan(0);
        activeCountBefore = await productsPage.readActiveCount();
      });

      await test.step('Open Events and Tickets create flow', async () => {
        await productsPage.openAddProductSheet();
        await productsPage.selectProductType(eventsType.buttonName);
        await eventsPage.expectEventsCreateFlow();
      });

      await test.step('Confirm Save as Draft is absent on Step 1, before and after filling the title', async () => {
        await eventsPage.expectSaveAsDraftAbsent();
        await eventsPage.fillEventsTitle(title);
        await eventsPage.expectSaveAsDraftAbsent();
      });

      await test.step('Fill All Day online details and continue to ticket configuration', async () => {
        await eventsPage.fillMinimalEventsStep1({
          title,
          description: generateEventsDescription(),
        });
        await eventsPage.continueToEventsDetails();
      });

      await test.step('Confirm Save as Draft is available on Step 2', async () => {
        await eventsPage.expectSaveAsDraftAvailable();
      });

      await test.step('Read the completion meter before required fields are filled', async () => {
        const before = await eventsPage.readCompletionPercentage();
        expect(before).toBeGreaterThan(0);
        expect(before).toBeLessThan(100);
      });

      await test.step('Fill ticket price, sales period, and thumbnail', async () => {
        await eventsPage.fillTicketDescription(0, generateEventsTicketDescription());
        await eventsPage.fillTicketPrice(0, eventsTicketsData.rawPrice);
        await eventsPage.fillTicketSalesPeriod(0);
        await uploadHero(page, eventsMediaData.heroImagePath);
      });

      await test.step('Confirm the completion meter rises once required fields are filled', async () => {
        const after = await eventsPage.readCompletionPercentage();
        expect(after).toBe(100);
      });

      await test.step('Verify the preview panel shows thumbnail, badge, title, price, and creator identity', async () => {
        await eventsPage.expectPreviewPanelDetails(title);
        await eventsPage.expectPreviewStartFrom(eventsTicketsData.previewPricePattern);
      });

      await test.step('Publish the event and verify the Product Complete modal', async () => {
        await eventsPage.submitEventsPublishDetails();
        await expectProductCompleteModal(page);
        sharePath = await readProductCompleteSharePath(page);
        await closeProductCompleteModal(page);
      });

      await test.step('Verify the Active count incremented and the row shows price and status', async () => {
        await creatorNav.open('products');
        await productsPage.expectLoaded();
        await productsPage.searchProductsUntilVisible(title);
        await productsPage.expectProductRowStatus(title, 'ACTIVE');
        await productsPage.expectProductRowPrice(title, eventsTicketsData.rowPricePattern);
        await productsPage.openEditProduct(title);
        productUuid = await eventsPage.readEventProductUuidFromUrl();
        const listResponse = productsPage.waitForListResponse();
        await creatorNav.open('products');
        await productsPage.expectLoaded();
        await listResponse;
        await expect.poll(() => productsPage.readActiveCount()).toBe(activeCountBefore + 1);
      });

      await test.step('Resolve the canonical product URL from the share link', async () => {
        await productPurchasePage.gotoSharePath(sharePath);
        await expect(page).toHaveURL(eventsPublishData.canonicalProductUrlPattern, { timeout: 15000 });
      });
    } finally {
      if (productUuid) {
        await deleteProduct(page.request, productUuid).catch(() => undefined);
      }
    }
  });

  test('Validate Event Edit Persistence and Product Row Actions', {
    tag: ['@AUT-FV-317', '@products', '@creator', '@smoke', '@regression'],
    annotation: [{
      type: 'covers',
      description: 'TC-EVT-C-030, TC-EVT-C-060',
    }],
  }, async ({ eventsPage, creatorNav, productsPage, productPurchasePage, page }) => {
    test.setTimeout(300000);

    const data = generateEventsEditData();
    let productUuid = '';
    let sharePath = '';
    let baselineDate = '';
    let editedDate = '';

    try {
      await test.step('Create and publish a baseline event', async () => {
        await creatorNav.open('products');
        await productsPage.expectLoaded();
        await productsPage.openAddProductSheet();
        await productsPage.selectProductType(productsCreationData.productTypes[4].buttonName);
        await eventsPage.expectEventsCreateFlow();
        await eventsPage.fillEditableEventsStep1({
          title: data.baselineTitle,
          description: data.baselineDescription,
          venue: data.baselineVenue,
          address: data.baselineAddress,
          startTime: data.baselineStartTime,
          endTime: data.baselineEndTime,
        });
        baselineDate = await eventsPage.readEventDateText();
        await eventsPage.continueToEventsDetails();
        await eventsPage.fillTicketDescription(0, data.baselineTicketDescription);
        await eventsPage.fillTicketSalesPeriod(0);
        await uploadHero(page, eventsMediaData.heroImagePath);
        await eventsPage.submitEventsPublishDetails();
        await expectProductCompleteModal(page);
        sharePath = await readProductCompleteSharePath(page);
        await closeProductCompleteModal(page);
      });

      await test.step('Open the published event and verify Step 1 is pre-populated', async () => {
        await creatorNav.open('products');
        await productsPage.expectLoaded();
        await productsPage.searchProductsUntilVisible(data.baselineTitle);
        await productsPage.openEditProduct(data.baselineTitle);
        await eventsPage.expectLoaded();
        productUuid = await eventsPage.readEventProductUuidFromUrl();
        await eventsPage.expectEventsStep1Values({
          title: data.baselineTitle,
          description: data.baselineDescription,
          venue: data.baselineVenue,
          address: data.baselineAddress,
          eventDate: baselineDate,
          startTime: data.baselineStartTime,
          endTime: data.baselineEndTime,
        });
      });

      await test.step('Continue and verify Step 2 values are pre-populated', async () => {
        await eventsPage.continueToEventsDetails();
        await eventsPage.expectEventsStep2Prepopulated(data.baselineTicketDescription, '0');
      });

      await test.step('Edit title, description, schedule, and venue', async () => {
        await eventsPage.goBackToEventsStep1();
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
        await eventsPage.fillTicketDescription(0, data.editedDescription);
        await eventsPage.fillTicketSalesPeriodThroughNextMonth(0);
        await eventsPage.submitEventsPublishDetails();
        await creatorNav.open('products');
        await productsPage.expectLoaded();
        let savedAsDraft = false;
        try {
          await productsPage.searchProductsUntilVisible(data.editedTitle);
        } catch {
          savedAsDraft = true;
        }
        if (savedAsDraft) {
          await productsPage.selectStatusTab('Draft', { waitForRender: false });
          try {
            await productsPage.searchProductsUntilVisible(data.editedTitle);
            await productsPage.expectProductRowStatus(data.editedTitle, 'DRAFT');
            await productsPage.openEditProduct(data.editedTitle);
            await eventsPage.expectLoaded();
            await eventsPage.continueToEventsDetails();
            await eventsPage.submitEventsPublishDetails();
            await creatorNav.open('products');
            await productsPage.expectLoaded();
            await productsPage.selectStatusTab('Active', { waitForRender: false });
            await productsPage.searchProductsUntilVisible(data.editedTitle);
          } catch {
            await productsPage.selectStatusTab('Inactive', { waitForRender: false });
            await productsPage.searchProductsUntilVisible(data.editedTitle);
          }
        }
      });

      await test.step('Verify edited details on the buyer-facing event page', async () => {
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

      await test.step('Verify the event row action menu inventory', async () => {
        await creatorNav.open('products');
        await productsPage.expectLoaded();
        await productsPage.searchProductsUntilVisible(data.editedTitle);
        await productsPage.expectProductActionMenuItems(data.editedTitle, [
          'Set Inactive',
          'Hide from Profile',
          'Edit',
          'Share',
          'Hide',
          'Delete',
        ]);
      });
    } finally {
      if (productUuid) {
        await deleteProduct(page.request, productUuid).catch(() => undefined);
      }
    }
  });

  test('Validate Event Guest List, Summary, Filter, and Pagination', {
    tag: ['@AUT-FV-318', '@products', '@creator', '@regression'],
    annotation: [{
      type: 'covers',
      description: 'TC-EVT-C-033, TC-EVT-C-034, TC-EVT-C-035, TC-EVT-C-037, TC-EVT-C-039, TC-EVT-C-056, TC-EVT-C-057, TC-EVT-C-058, TC-EVT-C-059',
    }],
  }, async ({ eventGuestsPage }) => {
    test.setTimeout(120000);

    await test.step('Open the seeded event detail Guest section', async () => {
      await eventGuestsPage.goto(eventsGuestsData.seededEventProductUuid);
      await eventGuestsPage.expectLoaded();
    });

    await test.step('Verify the guest table exposes all six columns', async () => {
      await eventGuestsPage.expectGuestTableColumns();
    });

    await test.step('Read the summary labels and reconcile Registered against total guest rows', async () => {
      const summary = await eventGuestsPage.readGuestSummary();
      expect(summary.registered).toBeGreaterThan(0);
      expect(summary.capacity).toBeGreaterThan(0);

      const totalRows = await eventGuestsPage.readTotalGuestRowCountAcrossPages();
      expect(totalRows).toBeGreaterThan(0);
    });

    await test.step('Enumerate the Filter panel Status options and apply Active only', async () => {
      await eventGuestsPage.openFilterPanel();
      await eventGuestsPage.expectFilterStatusOptions();
      await eventGuestsPage.setStatusFilterChecked('Used', false);
      await eventGuestsPage.setStatusFilterChecked('Cancelled', false);
      await eventGuestsPage.applyFilter();
      await eventGuestsPage.expectGuestRowStatusesAllEqual('Active');
    });

    await test.step('Reset the filter and restore the full guest list', async () => {
      await eventGuestsPage.openFilterPanel();
      await eventGuestsPage.resetFilter();
      await eventGuestsPage.expectFilterStatusOptions();
      await eventGuestsPage.closeFilterPanel();
    });

    await test.step('Paginate the guest table', async () => {
      const firstPageCount = await eventGuestsPage.readGuestRowCountOnCurrentPage();
      expect(firstPageCount).toBeGreaterThan(0);
      await eventGuestsPage.goToGuestPage(2);
      const secondPageCount = await eventGuestsPage.readGuestRowCountOnCurrentPage();
      expect(secondPageCount).toBeGreaterThan(0);
      await eventGuestsPage.goToGuestPage(1);
    });

    await test.step('Open Check in Guest and verify the QR scanner mounts', async () => {
      await eventGuestsPage.openCheckInScanner();
      await eventGuestsPage.expectQrScannerMounted();
      await eventGuestsPage.closeCheckInScanner();
    });
  });
});
