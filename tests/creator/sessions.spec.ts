import { creatorAuthTest as test, expect } from '../test-base';
import { createConsultationProduct, deleteProduct, waitForProductByTitle, getProduct } from '@helpers/api/product';
import { listCreatorTiers } from '@helpers/api/membership';
import { createOversizedImageFixture } from '@helpers/creator/oversized-image';
import { consultationAfterSalesData, generateConsultationAfterSalesLink, generateConsultationAfterSalesPreviewMessage } from '@test-data/creator/consultation.config.data';
import { consultationMediaData, generateConsultationDescription, generateConsultationTitle } from '@test-data/creator/consultation.media.data';
import { consultationAvailabilityData, consultationBookingRulesData, consultationLifecycleRulesData, consultationScheduleOptionsData, daysFromToday, weekdayAtLeastAWeekAhead, weekdayNames } from '@test-data/creator/consultation.availability.data';
import { ProductPurchasePage } from '@pages/buyer/ProductPurchasePage';
import { baseURL } from '@config/env';
import { consultationLifecycleData, consultationPublishData, consultationWeekdayLabel } from '@test-data/creator/consultation.lifecycle.data';
import { consultationPriceOptionsData, consultationPricingData } from '@test-data/creator/consultation.pricing.data';
import { consultationValidationData } from '@test-data/creator/consultation.validation.data';
import { digitalProductValidationData, productsCreationData } from '@test-data/creator/products.creation.data';
import { addCustomBuyerQuestion, expectEmbedLinkLabelCapped, expectMembershipTiersSelectable, expectPriceValue, readPricingEnabled, chooseHeroFile, closeProductCompleteModal, enableAfterSalesLinks, expectAddQuestionsDisabled, expectAddQuestionsEnabled, expectDescriptionContains, expectEmbedLinksSaved, expectGalleryCount, expectGalleryInputUnavailable, expectHeroNotUploaded, expectHeroRequired, expectImageTooLarge, expectImageTooSmall, expectInvalidEmbedLinkFeedback, expectMandatoryBuyerFieldsProtected, expectPreviewPaidPrice, expectProductCompleteModal, expectTitleValue, fillEmbedLink, fillPrice, openEmbedLinkDialog, readProductCompleteSharePath, removeCustomBuyerQuestion, saveCurrentEmbedLink, uploadGallery, uploadHero } from '@helpers/creator/product-editor';

const consultationType = productsCreationData.productTypes.find((type) => type.label === 'Consultation')!;

test.describe('Creator Sessions', () => {
  test('Consultation — Product Details, Description, Navigation, Pricing, Membership Benefits, Buyer Form, Product Details - Title Length, Description Counter', {
    tag: ['@AUT-CON-001', '@sessions', '@creator', '@regression'],
    annotation: [{ type: 'issue', description: 'M-13' }, { type: 'issue', description: 'M-46' }, { type: 'issue', description: 'M-26' }],
  }, async ({ consultationPage, creatorNav, productsPage, page }) => {
    test.setTimeout(240000);
    // Known bugs M-13 (no unsaved-changes guard), M-46 (no title limit), M-26 (counter counts words). Last three steps.
    test.fail(true, 'M-13 / M-46 / M-26: unsaved guard, title limit, description counter');

    await test.step('The title is required and the description stops at its 500 limit', async () => {
      await creatorNav.open('products');
      await productsPage.openAddProductSheet();
      await productsPage.selectProductType(consultationType.buttonName);
      await consultationPage.expectConsultationCreateFlow();
      await consultationPage.fillConsultationDescription(consultationValidationData.descriptionWordsAtLimit);
      await consultationPage.appendConsultationDescription(consultationValidationData.descriptionOverflowWord);
      await consultationPage.expectConsultationDescriptionCounter(consultationValidationData.descriptionCounterMax);
      await consultationPage.submitConsultationDetails();
      await consultationPage.expectConsultationTitleRequired();
    });

    await test.step('Bold, italic and underline apply to the description', async () => {
      await consultationPage.fillConsultationTitle(generateConsultationTitle());
      await consultationPage.applyConsultationRichTextFormatting(generateConsultationDescription());
    });

    await test.step('Pricing starts on with 0, meaning Free, and takes a valid price', async () => {
      expect(await readPricingEnabled(page)).toBe(true);
      await expectPriceValue(page, consultationPricingData.zeroPrice);
      await expectPreviewPaidPrice(page, consultationPricingData.previewZeroPricePattern);
      await fillPrice(page, consultationPricingData.validPrice);
      await expectPreviewPaidPrice(page, consultationPricingData.previewPaidPricePattern);
    });

    await test.step('Membership benefits list every active tier', async () => {
      const tiers = (await listCreatorTiers(page.request)).filter((tier) => tier.isActive).map((tier) => tier.name);
      await expectMembershipTiersSelectable(page, tiers);
    });

    await test.step('Name, Email and Phone stay mandatory, and custom questions stop at five', async () => {
      await expectMandatoryBuyerFieldsProtected(page);
      for (const question of consultationValidationData.customQuestions) await addCustomBuyerQuestion(page, question);
      await expectAddQuestionsDisabled(page);
      await removeCustomBuyerQuestion(page, consultationValidationData.customQuestions[0]);
      await expectAddQuestionsEnabled(page);
    });

    await test.step('Next: Set Availability stays on screen while scrolling, and leaving with changes asks first', async () => {
      await consultationPage.useConsultationMobileViewport();
      await consultationPage.expectConsultationNextCtaStickyAfterScroll();
      await consultationPage.navigateAwayFromConsultationViaBack();
      await consultationPage.expectConsultationUnsavedChangesDialog();
    });

    await test.step('The title stops at its documented maximum', async () => {
      await consultationPage.fillConsultationTitle('T'.repeat(consultationValidationData.overlongTitleLength));
      expect((await consultationPage.readConsultationTitleValue()).length).toBeLessThan(consultationValidationData.overlongTitleLength);
      await consultationPage.expectConsultationTitleLimited();
    });

    await test.step('The description counter counts characters', async () => {
      await consultationPage.fillConsultationDescription(consultationValidationData.counterSample);
      await consultationPage.expectConsultationDescriptionCounter(`${consultationValidationData.counterSample.length} / 500`);
    });
  });

  test('Consultation — Thumbnail, Thumbnail Validation, Pricing Validation, Thumbnail Validation Feedback, Buyer Form Mandatory Fields', {
    tag: ['@AUT-CON-002', '@sessions', '@creator', '@regression'],
  }, async ({ consultationPage, page }) => {
    test.setTimeout(240000);

    await test.step('Continuing without a hero image is blocked, and oversized or undersized images are refused', async () => {
      await consultationPage.goto();
      await consultationPage.expectConsultationCreateFlow();
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
    });

    await test.step('An undersized image is refused with a message naming the file, and stays out of the slot', async () => {
      await chooseHeroFile(page, consultationMediaData.tinyImagePath);
      await expectImageTooSmall(page, 'tiny-1x1.png');
      await expectHeroNotUploaded(page);
    });

    await test.step('One hero and ten additional images are accepted, then the gallery closes', async () => {
      await uploadHero(page, consultationMediaData.heroImagePath);
      await uploadGallery(page, consultationMediaData.additionalImagePaths);
      await expectGalleryCount(page, consultationMediaData.maxAdditionalImages);
      await expectGalleryInputUnavailable(page);
    });

    await test.step('A price from 1 to 9.999 is refused, while 0 and Rp10.000 are accepted', async () => {
      await fillPrice(page, consultationPricingData.belowMinimumPrice);
      await consultationPage.submitConsultationDetails();
      await consultationPage.expectConsultationPriceError(true);
      await fillPrice(page, consultationPricingData.zeroPrice);
      await consultationPage.expectConsultationPriceError(false);
      await fillPrice(page, consultationPricingData.minimumPrice);
      await consultationPage.expectConsultationPriceError(false);
    });

    await test.step('Name, Email and Phone are fixed rows marked Mandatory with no control to remove them', async () => {
      await expectMandatoryBuyerFieldsProtected(page);
    });
  });

  test('Consultation — Weekly Schedule, Time Ranges, Appointment Duration, Buffer Time, Rescheduling, Timezone, Availability Range Options', {
    tag: ['@AUT-CON-003', '@sessions', '@creator', '@smoke', '@regression'],
  }, async ({ consultationPage, productPurchasePage, page }) => {
    test.setTimeout(300000);
    const data = consultationAvailabilityData;
    const [dayStart, dayEnd] = data.dayRange;
    let productUuid = '';
    let sharePath = '';

    try {
      await test.step('Availability Range is a preset list from 2 weeks to 1 year, 3 months by default', async () => {
        const product = await createConsultationProduct(page.request, {
          title: generateConsultationTitle(),
          description: generateConsultationDescription(),
          thumbnailImagePath: consultationMediaData.heroImagePath,
          status: 'active',
          dayOfWeek: 'sunday',
          startTime: dayStart,
          endTime: dayEnd,
        });
        productUuid = product.productUuid;
        sharePath = product.sharePath;
        await consultationPage.gotoEdit(productUuid, 'Availability');
        await consultationPage.expectSettingOptions('Availability Range', data.availabilityRangeOptions, data.defaultAvailabilityRange);
      });

      await test.step('Every day from Monday to Sunday takes a time range', async () => {
        for (const day of data.weekdays.filter((day) => day !== 'Sun')) await consultationPage.addTimeRange(day, dayStart, dayEnd);
        await consultationPage.expectWeeklyTimeControlCount(data.weeklyTimeControls);
      });

      await test.step('The end-time list offers all 96 slots, including times before the start', async () => {
        await consultationPage.expectEndTimeOptions('Mon', data.timeOptionCount);
      });

      await test.step('A day takes a second range, and a range can be removed again', async () => {
        await consultationPage.addTimeRange('Mon', ...data.eveningRange);
        await consultationPage.expectTimeRanges('Mon', [data.dayRange, data.eveningRange]);
        await consultationPage.expectTimeRangeLimitReached('Mon');
        await consultationPage.addTimeRange('Tue', ...data.eveningRange);
        await consultationPage.removeTimeRange('Tue', 0);
        await consultationPage.expectTimeRanges('Tue', [data.eveningRange]);
      });

      await test.step('Appointment Duration always holds a preset value, 1 hour by default', async () => {
        await consultationPage.expectSettingOptions('Appointment Duration', data.durationOptions, data.defaultDuration);
      });

      await test.step('Buffer Time starts off and adds a before and an after buffer', async () => {
        await consultationPage.expectAvailabilitySwitch('Buffer Time', false);
        await consultationPage.setAvailabilitySwitch('Buffer Time', true);
        await consultationPage.expectSettingValue('Before Event', data.defaultBuffer);
        await consultationPage.expectSettingValue('After Event', data.defaultBuffer);
      });

      await test.step('Rescheduling starts off and takes a minimum number of days', async () => {
        await consultationPage.expectAvailabilitySwitch('Allow Buyers to reschedule', false);
        await consultationPage.setAvailabilitySwitch('Allow Buyers to reschedule', true);
        await consultationPage.fillSettingNumber('Allow Buyers to reschedule', data.rescheduleDays);
      });

      await test.step('The schedule, buffer, reschedule policy and timezone persist after saving', async () => {
        await consultationPage.expectAvailabilityTimezone(data.timezone);
        await consultationPage.saveAndPublishConsultationFromEdit();
        await consultationPage.gotoEdit(productUuid, 'Availability');
        for (const day of data.weekdays.filter((day) => day !== 'Mon' && day !== 'Tue')) await consultationPage.expectTimeRanges(day, [data.dayRange]);
        await consultationPage.expectTimeRanges('Mon', [data.dayRange, data.eveningRange]);
        await consultationPage.expectTimeRanges('Tue', [data.eveningRange]);
        await consultationPage.expectAvailabilitySwitch('Buffer Time', true);
        await consultationPage.expectAvailabilitySwitch('Allow Buyers to reschedule', true);
        await consultationPage.expectSettingNumber('Allow Buyers to reschedule', data.rescheduleDays);
        await consultationPage.expectAvailabilityTimezone(data.timezone);
      });

      await test.step('Buyers get Jakarta-time slots spaced by duration plus buffer, never crossing a range end', async () => {
        await productPurchasePage.gotoSharePath(sharePath);
        await productPurchasePage.selectConsultationDateFromCalendar(weekdayAtLeastAWeekAhead(1));
        await productPurchasePage.expectCalendarSlotsExactly(data.bufferedMondaySlots);
      });
    } finally {
      if (productUuid) await deleteProduct(page.request, productUuid).catch(() => undefined);
    }
  });

  test('Consultation — Availability Range, Minimum Notice, Booking Frequency, Availability Required, Appointment Duration Options, Minimum Notice Configuration', {
    tag: ['@AUT-CON-004', '@sessions', '@creator', '@regression'],
    annotation: { type: 'issue', description: 'P-C-11' },
  }, async ({ consultationPage, browser, page }) => {
    test.setTimeout(360000);
    // Known bug P-C-11: buyers can book past the Availability Range (2 weeks lets them book a month out). Last step.
    test.fail(true, 'P-C-11: Availability Range is not enforced on the buyer calendar');
    const rules = consultationBookingRulesData;
    const avail = consultationAvailabilityData;
    const title = generateConsultationTitle();
    const guest = { name: generateConsultationTitle(), email: `qa.consult.${Date.now()}@yopmail.com`, phone: '81234567890' };
    let productUuid = '';
    let sharePath = '';

    const asGuest = async (check: (buyer: ProductPurchasePage) => Promise<void>) => {
      const context = await browser.newContext();
      try {
        const buyer = new ProductPurchasePage(await context.newPage(), baseURL);
        await buyer.gotoSharePath(sharePath);
        await check(buyer);
      } finally {
        await context.close();
      }
    };

    try {
      await test.step('A consultation with every day unavailable cannot be created until one day has a slot', async () => {
        await consultationPage.goto();
        await consultationPage.expectConsultationCreateFlow();
        await consultationPage.fillConsultationTitle(title);
        await consultationPage.fillConsultationDescription(generateConsultationDescription());
        await uploadHero(page, consultationMediaData.heroImagePath);
        await consultationPage.submitConsultationDetails();
        await consultationPage.expectConsultationAvailabilityStep();
        await consultationPage.expectAllDaysUnavailable(avail.weekdays);
        await consultationPage.createConsultation();
        await consultationPage.expectConsultationFeedback(rules.noAvailabilityError, true);
        for (const day of avail.weekdays) await consultationPage.addTimeRange(day, ...rules.morningRange);
        await consultationPage.expectConsultationFeedback(rules.noAvailabilityError, false);
      });

      await test.step('Appointment Duration is a preset list that always holds a value', async () => {
        await consultationPage.expectSettingOptions('Appointment Duration', avail.durationOptions, avail.defaultDuration);
      });

      await test.step('Minimum Notice is a number from 0 with a Minutes, Hours or Days unit, 12 hours by default', async () => {
        await consultationPage.expectSettingNumber('Minimum Notice', rules.defaultNotice.value, rules.defaultNotice.min);
        await consultationPage.expectSettingOptions('Minimum Notice', avail.noticeUnits, rules.defaultNotice.unit);
        await consultationPage.fillSettingNumber('Minimum Notice', rules.notice.value);
        await consultationPage.selectSetting('Minimum Notice', rules.notice.unit);
      });

      await test.step('Availability Range narrows to 2 weeks', async () => {
        await consultationPage.selectSetting('Availability Range', rules.range);
      });

      await test.step('Booking frequency is one count over a single period: per day, week or month', async () => {
        await consultationPage.setAvailabilitySwitch('Limit Booking Frequency', true);
        await consultationPage.expectSettingOptions('Limit Booking Frequency', rules.frequencyPeriods, rules.frequencyPeriods[0]);
        await consultationPage.expectSettingNumber('Limit Booking Frequency', rules.frequencyLimit);
      });

      await test.step('The notice and range persist after creating', async () => {
        await consultationPage.createConsultation();
        await expectProductCompleteModal(page);
        sharePath = await readProductCompleteSharePath(page);
        await closeProductCompleteModal(page);
        productUuid = (await waitForProductByTitle(page.request, title)).uuid;
        await consultationPage.gotoEdit(productUuid, 'Availability');
        await consultationPage.expectSettingNumber('Minimum Notice', rules.notice.value);
        await consultationPage.expectSettingValue('Minimum Notice', rules.notice.unit);
        await consultationPage.expectSettingValue('Availability Range', rules.range);
      });

      await test.step('Buyers cannot pick a date inside the minimum notice', async () => {
        await asGuest(async (buyer) => {
          await buyer.expectConsultationCalendarDate(daysFromToday(rules.insideNoticeDays), false);
          await buyer.expectConsultationCalendarDate(daysFromToday(rules.bookableDays), true);
        });
      });

      await test.step('Once a day reaches its one booking, no further booking can be made that day', async () => {
        await asGuest((buyer) => buyer.bookFreeConsultationAsGuest({ date: daysFromToday(rules.bookableDays), time: rules.bookedSlot, buyer: guest }));
        await asGuest(async (buyer) => {
          await expect.poll(async () => {
            await buyer.page.reload();
            return buyer.isConsultationCalendarDateOpen(daysFromToday(rules.bookableDays));
          }, { timeout: 60000, intervals: [3000] }).toBe(false);
        });
      });

      await test.step('Buyers cannot pick a date beyond the Availability Range', async () => {
        await asGuest((buyer) => buyer.expectConsultationCalendarDate(daysFromToday(rules.beyondRangeDays), false));
      });
    } finally {
      if (productUuid) await deleteProduct(page.request, productUuid).catch(() => undefined);
    }
  });

  test('Consultation — Draft, Publish, Save Control Labels, Publish versus Republish Copy, Save as Draft on Published Product', {
    tag: ['@AUT-CON-005', '@sessions', '@creator', '@regression'],
    annotation: { type: 'issue', description: 'L-07' },
  }, async ({ consultationPage, productPurchasePage, page }) => {
    test.setTimeout(300000);
    // Known bug L-07: create and edit name their save controls differently. Last step.
    test.fail(true, 'L-07: save and publish labels differ between create and edit');
    const titles = [generateConsultationTitle(), generateConsultationTitle()];
    const uuids: string[] = [];
    let createControls: string[] = [];
    let editControls: string[] = [];
    let sharePath = '';

    const reachAvailability = async (title: string) => {
      await consultationPage.goto();
      await consultationPage.expectConsultationCreateFlow();
      expect(await consultationPage.readSaveControls()).toEqual([]);
      await consultationPage.fillConsultationTitle(title);
      await consultationPage.fillConsultationDescription(generateConsultationDescription());
      await uploadHero(page, consultationMediaData.heroImagePath);
      await consultationPage.submitConsultationDetails();
      await consultationPage.expectConsultationAvailabilityStep();
      await consultationPage.addTimeRange('Mon', ...consultationAvailabilityData.dayRange);
    };

    try {
      await test.step('Save on create keeps a draft that buyers cannot open', async () => {
        await reachAvailability(titles[0]);
        createControls = await consultationPage.readSaveControls();
        await consultationPage.saveConsultationDraftOnCreate();
        const draft = await waitForProductByTitle(page.request, titles[0]);
        expect(draft?.status).toBe('draft');
        uuids.push(draft!.uuid);
        await productPurchasePage.gotoSharePath(`/s/${(await getProduct(page.request, draft!.uuid)).shortUrl}`);
        await productPurchasePage.expectProductPageNotFound();
      });

      await test.step('Create Consultation publishes it and shows Product Complete with the link, Copy Link and View Product Page', async () => {
        await reachAvailability(titles[1]);
        await consultationPage.createConsultation();
        await expectProductCompleteModal(page);
        sharePath = await readProductCompleteSharePath(page);
        await consultationPage.expectPublishModalCopy(consultationPublishData.firstPublish, sharePath);
        await closeProductCompleteModal(page);
        uuids.push((await waitForProductByTitle(page.request, titles[1])).uuid);
        expect((await getProduct(page.request, uuids[1])).status).toBe('active');
      });

      await test.step('Republishing an edit shows the live copy with the same share link', async () => {
        await consultationPage.gotoEdit(uuids[1]);
        await consultationPage.fillConsultationTitle(`${titles[1]} ${consultationLifecycleData.savedTitleSuffix}`);
        await consultationPage.openConsultationEditTab('Availability');
        await consultationPage.saveAndPublishConsultation();
        await consultationPage.expectPublishModalCopy(consultationPublishData.republish, sharePath);
        await closeProductCompleteModal(page);
      });

      await test.step('Save as Draft on the live consultation takes it down at once, with no warning', async () => {
        await consultationPage.gotoEdit(uuids[1], 'Availability');
        editControls = await consultationPage.readSaveControls();
        expect(editControls[0]).toBe('Save as Draft');
        await consultationPage.saveConsultationAsDraftFromEdit();
        await expect.poll(async () => (await getProduct(page.request, uuids[1])).status, { timeout: 20000 }).toBe('draft');
        await productPurchasePage.gotoSharePath(sharePath);
        await productPurchasePage.expectProductPageNotFound();
      });

      await test.step('Create and edit offer the same save and publish labels', async () => {
        expect(createControls).toEqual(consultationPublishData.createSaveControls);
        expect(editControls).toEqual(createControls);
      });
    } finally {
      for (const uuid of uuids) await deleteProduct(page.request, uuid).catch(() => undefined);
    }
  });

  test('Consultation — Section and Toggle, Message, Links, Preview, Edit Published, Create versus Edit Default, Link Label Truncation', {
    tag: ['@AUT-CON-006', '@sessions', '@creator', '@regression'],
  }, async ({ consultationPage, page }) => {
    test.setTimeout(300000);
    const { linkValidation } = digitalProductValidationData;
    const title = generateConsultationTitle();
    const message = generateConsultationAfterSalesPreviewMessage();
    const link = generateConsultationAfterSalesLink();
    const uuids: string[] = [];
    let editDefault: string | null = null;

    try {
      await test.step('On a new consultation Customize Message starts off under its purpose copy; switched on it shows the editor and 0/1000 counter', async () => {
        await consultationPage.goto();
        await consultationPage.expectConsultationCreateFlow();
        await consultationPage.expectAfterSalesDefaultOffThenEditable(consultationAfterSalesData.purposeCopy, consultationAfterSalesData.emptyCounter);
      });

      await test.step('The message counts toward 1000 characters', async () => {
        await consultationPage.fillConsultationAfterSalesMessage(message);
        await consultationPage.expectAfterSalesCounter(`${message.length}/1000 characters`);
      });

      await test.step('An unschemed link URL is refused inline, and a valid one saves', async () => {
        await enableAfterSalesLinks(page);
        await openEmbedLinkDialog(page);
        await fillEmbedLink(page, linkValidation.longLabel, linkValidation.invalidUrl);
        await expectInvalidEmbedLinkFeedback(page);
      });

      await test.step('A label past 40 characters is cut at 40 with no error', async () => {
        await fillEmbedLink(page, linkValidation.longLabel, link.url);
        await expectEmbedLinkLabelCapped(page);
        await fillEmbedLink(page, link.label, link.url);
        await saveCurrentEmbedLink(page);
        await expectEmbedLinksSaved(page, [link.label]);
      });

      await test.step('Preview shows the staged message and link read-only', async () => {
        await consultationPage.openConsultationAfterSalesPreview();
        await consultationPage.expectConsultationAfterSalesPreviewReadOnly({ message, linkLabel: link.label });
        await page.keyboard.press('Escape');
      });

      await test.step('On a published consultation the message persists, and switched off it stays off', async () => {
        await consultationPage.goto();
        await consultationPage.expectConsultationCreateFlow();
        await consultationPage.fillConsultationTitle(title);
        await consultationPage.fillConsultationDescription(generateConsultationDescription());
        await uploadHero(page, consultationMediaData.heroImagePath);
        await consultationPage.submitConsultationDetails();
        await consultationPage.addTimeRange('Mon', ...consultationAvailabilityData.dayRange);
        await consultationPage.createConsultation();
        await expectProductCompleteModal(page);
        await closeProductCompleteModal(page);
        uuids.push((await waitForProductByTitle(page.request, title)).uuid);
        await consultationPage.gotoEdit(uuids[0]);
        editDefault = await consultationPage.afterSalesSwitchChecked;
        await consultationPage.fillConsultationAfterSalesMessage(message);
        await consultationPage.openConsultationEditTab('Availability');
        await consultationPage.saveAndPublishConsultationFromEdit();
        await consultationPage.gotoEdit(uuids[0]);
        await consultationPage.expectConsultationAfterSalesMessage(message);
        await consultationPage.disableConsultationAfterSalesMessage();
        await consultationPage.openConsultationEditTab('Availability');
        await consultationPage.saveAndPublishConsultationFromEdit();
        await consultationPage.gotoEdit(uuids[0]);
        await consultationPage.expectAfterSalesToggleOff();
      });

      await test.step('Customize Message on with an empty message cannot be saved', async () => {
        await consultationPage.clearConsultationAfterSalesMessage();
        await consultationPage.openConsultationEditTab('Availability');
        await consultationPage.saveAndPublishConsultation();
        await consultationPage.expectAfterSalesMessageBlocked();
      });

      await test.step('A consultation published without touching After Sales opens on edit with the create default', async () => {
        expect(editDefault).toBe('false');
      });
    } finally {
      for (const uuid of uuids) await deleteProduct(page.request, uuid).catch(() => undefined);
    }
  });

  test('Consultation — Open Edit, Edit Details, Edit Availability, Active Status, Inactive Status, Republish, Edit Route', {
    tag: ['@AUT-CON-007', '@sessions', '@creator', '@regression'],
    annotation: [{ type: 'issue', description: 'P-C-12' }, { type: 'issue', description: 'M-02' }],
  }, async ({ consultationPage, creatorNav, productsPage, browser, page }) => {
    test.setTimeout(420000);
    // Known bugs P-C-12 (with Status off buyers can still book) and M-02: /products/update/consultation/<id> is a 404. Last two steps.
    test.fail(true, 'P-C-12 / M-02: paused consultation still takes bookings, consultation edit route');
    const rules = consultationLifecycleRulesData;
    const day = daysFromToday(consultationBookingRulesData.bookableDays);
    const title = generateConsultationTitle();
    const description = generateConsultationDescription();
    const editedTitle = `${title}${consultationLifecycleData.savedTitleSuffix}`;
    let productUuid = '';
    let sharePath = '';
    let transactionUrl = '';

    const asGuest = async (action: (buyer: ProductPurchasePage) => Promise<void>) => {
      const context = await browser.newContext();
      try {
        await action(new ProductPurchasePage(await context.newPage(), baseURL));
      } finally {
        await context.close();
      }
    };

    try {
      await test.step('Edit from the Products list opens the editor with details and availability filled in', async () => {
        const product = await createConsultationProduct(page.request, {
          title,
          description,
          thumbnailImagePath: consultationMediaData.heroImagePath,
          price: 0,
          dayOfWeek: weekdayNames[day.getDay()],
          startTime: rules.originalRange[0],
          endTime: rules.originalRange[1],
        });
        productUuid = product.productUuid;
        sharePath = product.sharePath;
        await creatorNav.open('products');
        await productsPage.searchProductsUntilVisible(title);
        await productsPage.openEditProduct(title);
        expect(await consultationPage.readAppointmentProductUuidFromUrl()).toBe(productUuid);
        await expectTitleValue(page, title);
        await expectDescriptionContains(page, description);
        await consultationPage.openConsultationEditTab('Availability');
        await consultationPage.expectTimeRanges(consultationWeekdayLabel(day), [rules.originalRange]);
      });

      await test.step('Unsaved edits are dropped on reload, saved edits persist', async () => {
        await consultationPage.openConsultationEditTab('Details');
        await consultationPage.fillConsultationTitle(`${title}${consultationLifecycleData.unsavedTitleSuffix}`);
        await consultationPage.reloadConsultationEditor();
        await expectTitleValue(page, title);
        await consultationPage.fillConsultationTitle(editedTitle);
        await consultationPage.openConsultationEditTab('Availability');
        await consultationPage.saveAndPublishConsultationFromEdit();
        await consultationPage.gotoEdit(productUuid);
        await expectTitleValue(page, editedTitle);
      });

      await test.step('While active, a buyer can book a slot', async () => {
        await asGuest(async (buyer) => {
          await buyer.gotoSharePath(sharePath);
          await buyer.bookFreeConsultationAsGuest({ date: day, time: rules.bookedSlot, buyer: { name: generateConsultationTitle(), email: `qa.consult.${Date.now()}@yopmail.com`, phone: '81234567890' } });
          transactionUrl = buyer.page.url();
        });
      });

      await test.step('Moving the availability changes future slots and leaves the existing booking in place', async () => {
        await consultationPage.gotoEdit(productUuid, 'Availability');
        await consultationPage.setTimeRange(consultationWeekdayLabel(day), 0, ...rules.movedRange);
        await consultationPage.saveAndPublishConsultationFromEdit();
        await asGuest(async (buyer) => {
          await buyer.gotoSharePath(sharePath);
          await buyer.selectConsultationDateFromCalendar(day);
          await buyer.expectCalendarSlotsExactly(rules.movedSlots);
          await buyer.page.goto(transactionUrl);
          await buyer.expectTransactionSuccessful();
        });
      });

      await test.step('Republishing applies the edit at once and keeps the share link', async () => {
        await consultationPage.gotoEdit(productUuid);
        await consultationPage.fillConsultationTitle(title);
        await consultationPage.openConsultationEditTab('Availability');
        await consultationPage.saveAndPublishConsultation();
        await consultationPage.expectConsultationLiveModalWithSharePath(sharePath);
        await closeProductCompleteModal(page);
        await creatorNav.open('products');
        await productsPage.searchProductsUntilVisible(title);
      });

      await test.step('Status off pauses new bookings while the existing booking stays reachable', async () => {
        await consultationPage.gotoEdit(productUuid, 'Availability');
        await consultationPage.setConsultationAcceptingBookings(false, rules.pauseConfirmCopy);
        await consultationPage.saveAndPublishConsultationFromEdit();
        await asGuest(async (buyer) => {
          await buyer.page.goto(transactionUrl);
          await buyer.expectTransactionSuccessful();
          await buyer.gotoSharePath(sharePath);
          await buyer.expectConsultationTakingNoBookings();
        });
      });

      await test.step('The edit route matches the create route name', async () => {
        await consultationPage.gotoEditByConsultationRoute(productUuid);
      });
    } finally {
      if (productUuid) await deleteProduct(page.request, productUuid).catch(() => undefined);
    }
  });

  test('Consultation — Pricing Default State, Flexible Pricing Toggle, Enable Crypto Toggle, Set Discount, Create Form Gates and Route Naming', {
    tag: ['@AUT-CON-008', '@sessions', '@creator', '@regression'],
  }, async ({ consultationPage, browser, page }) => {
    test.setTimeout(420000);
    const prices = consultationPriceOptionsData;
    const titles = [generateConsultationTitle(), generateConsultationTitle()];
    const uuids: string[] = [];
    const sharePaths: string[] = [];

    const publish = async (title: string, onAvailabilityStep = false) => {
      if (!onAvailabilityStep) await consultationPage.submitConsultationDetails();
      await consultationPage.expectConsultationAvailabilityStep();
      await consultationPage.addTimeRange('Mon', ...consultationAvailabilityData.dayRange);
      await consultationPage.createConsultation();
      await expectProductCompleteModal(page);
      sharePaths.push(await readProductCompleteSharePath(page));
      await closeProductCompleteModal(page);
      uuids.push((await waitForProductByTitle(page.request, title)).uuid);
    };

    const asGuest = async (check: (buyer: ProductPurchasePage) => Promise<void>) => {
      const context = await browser.newContext();
      try {
        await check(new ProductPurchasePage(await context.newPage(), baseURL));
      } finally {
        await context.close();
      }
    };

    try {
      await test.step('A new consultation starts with pricing on at 0, and flexible price, crypto and discount off', async () => {
        await consultationPage.goto();
        await consultationPage.expectConsultationCreateFlow();
        await expect(page).toHaveURL(prices.createRoute);
        expect(await readPricingEnabled(page)).toBe(true);
        await expectPriceValue(page, consultationPricingData.zeroPrice);
        await expectPreviewPaidPrice(page, consultationPricingData.previewZeroPricePattern);
        await consultationPage.expectPriceOptionsOff();
      });

      await test.step('Step 1 holds until a hero image is added, and Step 2 until a day has availability', async () => {
        await consultationPage.fillConsultationTitle(titles[0]);
        await consultationPage.fillConsultationDescription(generateConsultationDescription());
        await consultationPage.submitConsultationDetails();
        await consultationPage.expectConsultationFeedback(prices.heroRequired, true);
        await uploadHero(page, consultationMediaData.heroImagePath);
        await consultationPage.enableFlexiblePrice(prices.flexibleMinimum);
        await consultationPage.submitConsultationDetails();
        await consultationPage.expectConsultationAvailabilityStep();
        await consultationPage.createConsultation();
        await consultationPage.expectConsultationFeedback(consultationBookingRulesData.noAvailabilityError, true);
        await publish(titles[0], true);
      });

      await test.step('The edit route is named appointment, unlike the consultation create route', async () => {
        await consultationPage.gotoEdit(uuids[0]);
        await expect(page).toHaveURL(prices.editRoute);
      });

      await test.step('Flexible pricing shows buyers a minimum and asks them to name a fair price', async () => {
        await asGuest(async (buyer) => {
          await buyer.gotoSharePath(sharePaths[0]);
          await buyer.expectConsultationFlexiblePricing(prices.buyerFlexibleMinimum);
        });
      });

      await test.step('A percentage discount shows buyers the reduced price beside the original', async () => {
        await consultationPage.goto();
        await consultationPage.expectConsultationCreateFlow();
        await consultationPage.fillConsultationTitle(titles[1]);
        await consultationPage.fillConsultationDescription(generateConsultationDescription());
        await uploadHero(page, consultationMediaData.heroImagePath);
        await fillPrice(page, prices.listPrice);
        await consultationPage.enableDiscount('Percentage', prices.discountPercent, prices.discountedFormPrice);
        await consultationPage.enableCrypto(prices.cryptoUsdt);
        await publish(titles[1]);
        await asGuest(async (buyer) => {
          await buyer.gotoSharePath(sharePaths[1]);
          await buyer.expectConsultationDiscountedPrice(prices.buyerDiscountedPrice);
        });
      });

      await test.step('With crypto enabled, checkout offers the crypto voucher', async () => {
        await asGuest(async (buyer) => {
          await buyer.gotoSharePath(sharePaths[1]);
          await buyer.openConsultationCheckout(weekdayAtLeastAWeekAhead(1), consultationAvailabilityData.dayRange[0]);
          await buyer.expectCryptoVoucherOffered(prices.cryptoVoucherCopy);
        });
      });
    } finally {
      for (const uuid of uuids) await deleteProduct(page.request, uuid).catch(() => undefined);
    }
  });

  test('Consultation — Buffer Time Options, Buffer Applied to Buyer Slots, Reschedule Policy Copy, Booking Frequency Period Scope, Timezone Picker', {
    tag: ['@AUT-CON-009', '@sessions', '@creator', '@regression'],
    annotation: { type: 'issue', description: 'L-06' },
  }, async ({ consultationPage, browser, page }) => {
    test.setTimeout(480000);
    // Known bug L-06: the reschedule helper text and its field label describe different rules. Last step.
    test.fail(true, 'L-06: reschedule helper text contradicts its field label');
    const avail = consultationAvailabilityData;
    const options = consultationScheduleOptionsData;
    const monday = weekdayAtLeastAWeekAhead(1);
    let productUuid = '';
    let sharePath = '';

    try {
      await test.step('Buffer Time starts off and offers Before and After presets from 5 minutes to 1 hour, with no free-text box', async () => {
        const product = await createConsultationProduct(page.request, {
          title: generateConsultationTitle(),
          description: generateConsultationDescription(),
          thumbnailImagePath: consultationMediaData.heroImagePath,
          price: 0,
          dayOfWeek: 'monday',
          startTime: avail.dayRange[0],
          endTime: avail.dayRange[1],
        });
        productUuid = product.productUuid;
        sharePath = product.sharePath;
        await consultationPage.gotoEdit(productUuid, 'Availability');
        await consultationPage.expectAvailabilitySwitch('Buffer Time', false);
        await consultationPage.setAvailabilitySwitch('Buffer Time', true);
        await consultationPage.expectSettingOptions('Before Event', avail.bufferOptions, avail.defaultBuffer);
        await consultationPage.expectSettingOptions('After Event', avail.bufferOptions, avail.defaultBuffer);
        await consultationPage.expectBufferHasNoTextInput();
      });

      await test.step('Booking frequency takes one period at a time, and the chosen one persists', async () => {
        await consultationPage.setAvailabilitySwitch('Limit Booking Frequency', true);
        await consultationPage.expectSettingOptions('Limit Booking Frequency', consultationBookingRulesData.frequencyPeriods, consultationBookingRulesData.frequencyPeriods[0]);
        await consultationPage.selectSetting('Limit Booking Frequency', options.frequencyPeriod);
        await consultationPage.addTimeRange('Mon', ...avail.eveningRange);
        await consultationPage.saveAndPublishConsultationFromEdit();
        await consultationPage.gotoEdit(productUuid, 'Availability');
        await consultationPage.expectSettingValue('Limit Booking Frequency', options.frequencyPeriod);
      });

      await test.step('The timezone picker defaults to Jakarta, lists 112 zones and filters by search', async () => {
        await consultationPage.expectTimezonePicker(options.timezonePicker);
      });

      await test.step('Buyer slots are spaced by duration plus both buffers and never cross a range end', async () => {
        const context = await browser.newContext();
        try {
          const buyer = new ProductPurchasePage(await context.newPage(), baseURL);
          await buyer.gotoSharePath(sharePath);
          await buyer.selectConsultationDateFromCalendar(monday);
          await buyer.expectCalendarSlotsExactly(avail.bufferedMondaySlots);
          await buyer.openConsultationCheckout(monday, avail.bufferedMondaySlots[0]);
          await buyer.expectConsultationCheckoutTimezone(options.checkoutTimezone, options.checkoutOffset);
        } finally {
          await context.close();
        }
      });

      await test.step('The reschedule helper text describes the same rule as its field label', async () => {
        await consultationPage.setAvailabilitySwitch('Allow Buyers to reschedule', true);
        await consultationPage.fillSettingNumber('Allow Buyers to reschedule', options.rescheduleDays);
        const copy = await consultationPage.readRescheduleCopy();
        expect(copy.helper).toContain('before');
        expect(copy.fieldLabel).toContain('before');
      });
    } finally {
      if (productUuid) await deleteProduct(page.request, productUuid).catch(() => undefined);
    }
  });
});
