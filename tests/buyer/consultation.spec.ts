import { authTest as test, test as guestTest, expect } from '../test-base';
import { baseURL } from '@config/env';
import { createConsultationProduct, deleteProduct } from '@helpers/api/product';
import { loginWithToken } from '@helpers/auth/token-login';
import { consultationBuyerDetailData, consultationBuyerSchedulingData, generateConsultationBuyerDescription, generateConsultationBuyerTitle } from '@test-data/buyer/consultation.detail.data';
import { consultationMediaData } from '@test-data/creator/consultation.media.data';

test.describe('Buyer Consultation', () => {
  test('Validate Consultation Pricing, Vouchers, and Fees — Part 2', {
    tag: ['@AUT-FV-027', '@sessions', '@buyer', '@regression'],
  }, async ({ productPurchasePage, page }) => {
    test.setTimeout(180000);

    const seedToken = process.env.YAPP_TEST_ACCESS_TOKEN?.replace(/"/g, '');
    test.skip(!seedToken, 'YAPP_TEST_ACCESS_TOKEN is required to seed consultation product');
    if (!seedToken) return;

    const title = generateConsultationBuyerTitle();
    const description = generateConsultationBuyerDescription();
    let productUuid = '';

    try {
      let sharePath = '';

      await test.step('Seed published consultation via API', async () => {
        const product = await createConsultationProduct(
          page.request,
          {
            title,
            description,
            thumbnailImagePath: consultationMediaData.heroImagePath,
            productImagePaths: [...consultationMediaData.additionalImagePaths],
            price: Number(consultationBuyerDetailData.price),
          },
          seedToken,
        );
        productUuid = product.productUuid;
        sharePath = product.sharePath;
      });

      await test.step('Open buyer consultation product page', async () => {
        await productPurchasePage.gotoSharePath(sharePath);
        await productPurchasePage.expectConsultationProductLoaded(title);
      });

      await test.step('Review carousel, creator, price, description, tabs, CTAs, and badge', async () => {
        await productPurchasePage.expectConsultationProductDetails({
          title,
          description,
          pricePattern: consultationBuyerDetailData.priceDisplayPattern,
        });
        await productPurchasePage.expectConsultationOverviewAndAboutCreatorTabs();
        await productPurchasePage.expectConsultationBookable();
      });
    } finally {
      if (productUuid && seedToken) {
        await deleteProduct(page.request, productUuid, seedToken).catch(() => undefined);
      }
    }
  });

  test('Preview Consultation Media and Verify Navigation', {
    tag: ['@AUT-FV-028', '@sessions', '@buyer', '@regression'],
  }, async ({ productPurchasePage, page }) => {
    test.setTimeout(180000);

    const seedToken = process.env.YAPP_TEST_ACCESS_TOKEN?.replace(/"/g, '');
    test.skip(!seedToken, 'YAPP_TEST_ACCESS_TOKEN is required to seed consultation product');
    if (!seedToken) return;

    const title = generateConsultationBuyerTitle();
    const description = generateConsultationBuyerDescription();
    let productUuid = '';

    try {
      let sharePath = '';

      await test.step('Seed multi-image consultation via API', async () => {
        const product = await createConsultationProduct(
          page.request,
          {
            title,
            description,
            thumbnailImagePath: consultationMediaData.heroImagePath,
            productImagePaths: [...consultationMediaData.additionalImagePaths],
            price: Number(consultationBuyerDetailData.price),
          },
          seedToken,
        );
        productUuid = product.productUuid;
        sharePath = product.sharePath;
      });

      await test.step('Open product page with multiple images', async () => {
        await productPurchasePage.gotoSharePath(sharePath);
        await productPurchasePage.expectConsultationProductLoaded(title);
        await productPurchasePage.expectConsultationSlideStripCount();
      });

      await test.step('Navigate slides with arrows and thumbnail strip highlights', async () => {
        await productPurchasePage.expectConsultationCarouselNavigable();
      });
    } finally {
      if (productUuid && seedToken) {
        await deleteProduct(page.request, productUuid, seedToken).catch(() => undefined);
      }
    }
  });

  test('Validate Consultation Scheduling, Availability, and Time Rules — Part 2', {
    tag: ['@AUT-FV-029', '@sessions', '@buyer', '@regression'],
  }, async ({ productPurchasePage, page }) => {
    test.setTimeout(180000);

    const seedToken = process.env.YAPP_TEST_ACCESS_TOKEN?.replace(/"/g, '');
    test.skip(!seedToken, 'YAPP_TEST_ACCESS_TOKEN is required to seed consultation product');
    if (!seedToken) return;

    const title = generateConsultationBuyerTitle();
    const description = generateConsultationBuyerDescription();
    let productUuid = '';

    try {
      let sharePath = '';

      await test.step('Seed Friday-only consultation with limited time window via API', async () => {
        const product = await createConsultationProduct(
          page.request,
          {
            title,
            description,
            thumbnailImagePath: consultationMediaData.heroImagePath,
            productImagePaths: [consultationMediaData.heroImagePath],
            price: consultationBuyerSchedulingData.freePrice,
            dayOfWeek: consultationBuyerSchedulingData.dayOfWeek,
            startTime: consultationBuyerSchedulingData.startTime,
            endTime: consultationBuyerSchedulingData.endTime,
            appointmentDurationValue: consultationBuyerSchedulingData.appointmentDurationValue,
            appointmentDurationUnit: consultationBuyerSchedulingData.appointmentDurationUnit,
            availabilityRangeValue: consultationBuyerSchedulingData.availabilityRangeValue,
            availabilityRangeUnit: consultationBuyerSchedulingData.availabilityRangeUnit,
            minimumNoticeValue: consultationBuyerSchedulingData.minimumNoticeValue,
            minimumNoticeUnit: consultationBuyerSchedulingData.minimumNoticeUnit,
          },
          seedToken,
        );
        productUuid = product.productUuid;
        sharePath = product.sharePath;
      });

      await test.step('Open buyer page and review only in-range available dates', async () => {
        await productPurchasePage.gotoSharePath(sharePath);
        await productPurchasePage.expectConsultationProductLoaded(title);
        await productPurchasePage.expectConsultationBookable();
        await productPurchasePage.expectConsultationAvailableDaysOnly();
      });

      await test.step('Open time slots and verify unavailable times are not selectable', async () => {
        await productPurchasePage.selectFirstConsultationDay();
        await productPurchasePage.expectConsultationTimeSlots();
      });
    } finally {
      if (productUuid && seedToken) {
        await deleteProduct(page.request, productUuid, seedToken).catch(() => undefined);
      }
    }
  });

  guestTest('Verify Consultation Session Selection & Booking Summary', {
    tag: ['@AUT-FV-030', '@sessions', '@buyer', '@regression'],
  }, async ({ page, context, productPurchasePage }) => {
    guestTest.setTimeout(180000);

    const seedToken = process.env.YAPP_TEST_ACCESS_TOKEN?.replace(/"/g, '');
    const buyerToken = process.env.YAPP_TEST_ACCESS_TOKEN_2?.replace(/"/g, '');
    guestTest.skip(!seedToken, 'YAPP_TEST_ACCESS_TOKEN is required to seed consultation product');
    guestTest.skip(!buyerToken, 'YAPP_TEST_ACCESS_TOKEN_2 is required for buyer Save my spot CTA');
    if (!seedToken || !buyerToken) return;

    // One browser: API seed with token1 headers; UI as token2 buyer (owner sees Edit Product).
    await loginWithToken(context, buyerToken, baseURL);

    const title = generateConsultationBuyerTitle();
    const description = generateConsultationBuyerDescription();
    let productUuid = '';

    try {
      let sharePath = '';

      await guestTest.step('Seed consultation with an available session slot via API', async () => {
        const product = await createConsultationProduct(
          page.request,
          {
            title,
            description,
            thumbnailImagePath: consultationMediaData.heroImagePath,
            productImagePaths: [consultationMediaData.heroImagePath],
            price: consultationBuyerSchedulingData.freePrice,
            dayOfWeek: consultationBuyerSchedulingData.dayOfWeek,
            startTime: consultationBuyerSchedulingData.startTime,
            endTime: consultationBuyerSchedulingData.endTime,
            appointmentDurationValue: consultationBuyerSchedulingData.appointmentDurationValue,
            appointmentDurationUnit: consultationBuyerSchedulingData.appointmentDurationUnit,
            availabilityRangeValue: consultationBuyerSchedulingData.availabilityRangeValue,
            availabilityRangeUnit: consultationBuyerSchedulingData.availabilityRangeUnit,
            minimumNoticeValue: consultationBuyerSchedulingData.minimumNoticeValue,
            minimumNoticeUnit: consultationBuyerSchedulingData.minimumNoticeUnit,
          },
          seedToken,
        );
        productUuid = product.productUuid;
        sharePath = product.sharePath;
      });

      let dayLabel = '';
      const time = consultationBuyerSchedulingData.expectedSlots[0];

      await guestTest.step('Select a date and time on the buyer consultation page', async () => {
        await productPurchasePage.gotoSharePath(sharePath);
        await productPurchasePage.expectConsultationProductLoaded(title);
        await productPurchasePage.expectConsultationBookable();
        dayLabel = await productPurchasePage.selectFirstConsultationDay();
        await productPurchasePage.selectConsultationTimeSlot(time);
      });

      await guestTest.step('Review booking summary and Save my spot CTA', async () => {
        await productPurchasePage.expectConsultationBookingSummary({ dayLabel, time });
      });
    } finally {
      if (productUuid && seedToken) {
        await deleteProduct(page.request, productUuid, seedToken).catch(() => undefined);
      }
    }
  });

  guestTest('Verify Consultation Integrations and External Services', {
    tag: ['@AUT-FV-031', '@sessions', '@buyer', '@regression'],
    annotation: [{ type: 'covers', description: 'TC-CON-B-006, TC-CON-B-007' }],
  }, async ({ page, context, productPurchasePage }) => {
    guestTest.setTimeout(180000);

    const seedToken = process.env.YAPP_TEST_ACCESS_TOKEN?.replace(/"/g, '');
    const buyerToken = process.env.YAPP_TEST_ACCESS_TOKEN_2?.replace(/"/g, '');
    guestTest.skip(!seedToken, 'YAPP_TEST_ACCESS_TOKEN is required to seed consultation product');
    guestTest.skip(!buyerToken, 'YAPP_TEST_ACCESS_TOKEN_2 is required for buyer checkout CTA');
    if (!seedToken || !buyerToken) return;

    await loginWithToken(context, buyerToken, baseURL);

    const title = generateConsultationBuyerTitle();
    const description = generateConsultationBuyerDescription();
    let productUuid = '';

    try {
      let sharePath = '';

      await guestTest.step('Seed consultation with an available session slot via API', async () => {
        const product = await createConsultationProduct(
          page.request,
          {
            title,
            description,
            thumbnailImagePath: consultationMediaData.heroImagePath,
            productImagePaths: [consultationMediaData.heroImagePath],
            price: consultationBuyerSchedulingData.freePrice,
            dayOfWeek: consultationBuyerSchedulingData.dayOfWeek,
            startTime: consultationBuyerSchedulingData.startTime,
            endTime: consultationBuyerSchedulingData.endTime,
            appointmentDurationValue: consultationBuyerSchedulingData.appointmentDurationValue,
            appointmentDurationUnit: consultationBuyerSchedulingData.appointmentDurationUnit,
            availabilityRangeValue: consultationBuyerSchedulingData.availabilityRangeValue,
            availabilityRangeUnit: consultationBuyerSchedulingData.availabilityRangeUnit,
            minimumNoticeValue: consultationBuyerSchedulingData.minimumNoticeValue,
            minimumNoticeUnit: consultationBuyerSchedulingData.minimumNoticeUnit,
          },
          seedToken,
        );
        productUuid = product.productUuid;
        sharePath = product.sharePath;
      });

      await guestTest.step('Block checkout until date and time are selected', async () => {
        await productPurchasePage.gotoSharePath(sharePath);
        await productPurchasePage.expectConsultationProductLoaded(title);
        await productPurchasePage.expectConsultationBookable();
        await productPurchasePage.expectConsultationCheckoutBlocked();

        await productPurchasePage.gotoSharePath(sharePath);
        await productPurchasePage.expectConsultationProductLoaded(title);
        await productPurchasePage.selectFirstConsultationDay();
        await productPurchasePage.expectConsultationCheckoutBlockedUntilTimeSelected();
      });

      let dayLabel = '';
      const time = consultationBuyerSchedulingData.expectedSlots[0];

      await guestTest.step('Carry selected session into checkout', async () => {
        await productPurchasePage.gotoSharePath(sharePath);
        await productPurchasePage.expectConsultationProductLoaded(title);
        dayLabel = await productPurchasePage.selectFirstConsultationDay();
        await productPurchasePage.selectConsultationTimeSlot(time);
        await productPurchasePage.clickConsultationSaveMySpot();
        await productPurchasePage.expectConsultationCheckoutDetails({ title, dayLabel, time });
      });
    } finally {
      if (productUuid && seedToken) {
        await deleteProduct(page.request, productUuid, seedToken).catch(() => undefined);
      }
    }
  });

  guestTest('Validate Consultation Booking and After Sales Separation', {
    tag: ['@AUT-FV-038', '@sessions', '@buyer', '@regression'],
    annotation: [{ type: 'covers', description: 'TC-CON-B-022' }],
  }, async ({ page, context, productPurchasePage }) => {
    guestTest.setTimeout(180000);

    const seedToken = process.env.YAPP_TEST_ACCESS_TOKEN?.replace(/"/g, '');
    const buyerToken = process.env.YAPP_TEST_ACCESS_TOKEN_2?.replace(/"/g, '');
    guestTest.skip(!seedToken, 'YAPP_TEST_ACCESS_TOKEN is required');
    guestTest.skip(!buyerToken, 'YAPP_TEST_ACCESS_TOKEN_2 is required');
    if (!seedToken || !buyerToken) return;

    await loginWithToken(context, buyerToken, baseURL);

    const title = generateConsultationBuyerTitle();
    let productUuid = '';

    try {
      let sharePath = '';

      await guestTest.step('Seed consultation with session slot via API', async () => {
        const product = await createConsultationProduct(page.request, {
          title,
          description: generateConsultationBuyerDescription(),
          thumbnailImagePath: consultationMediaData.heroImagePath,
          productImagePaths: [consultationMediaData.heroImagePath],
          price: consultationBuyerSchedulingData.freePrice,
          dayOfWeek: consultationBuyerSchedulingData.dayOfWeek,
          startTime: consultationBuyerSchedulingData.startTime,
          endTime: consultationBuyerSchedulingData.endTime,
          appointmentDurationValue: consultationBuyerSchedulingData.appointmentDurationValue,
          appointmentDurationUnit: consultationBuyerSchedulingData.appointmentDurationUnit,
          availabilityRangeValue: consultationBuyerSchedulingData.availabilityRangeValue,
          availabilityRangeUnit: consultationBuyerSchedulingData.availabilityRangeUnit,
          minimumNoticeValue: consultationBuyerSchedulingData.minimumNoticeValue,
          minimumNoticeUnit: consultationBuyerSchedulingData.minimumNoticeUnit,
        }, seedToken);
        productUuid = product.productUuid;
        sharePath = product.sharePath;
      });

      await guestTest.step('Select date/time and open checkout dialog', async () => {
        await productPurchasePage.gotoSharePath(sharePath);
        await productPurchasePage.expectConsultationProductLoaded(title);
        await productPurchasePage.expectConsultationBookable();
        await productPurchasePage.selectFirstConsultationDay();
        await productPurchasePage.selectConsultationTimeSlot(consultationBuyerSchedulingData.expectedSlots[0]);
        await productPurchasePage.clickConsultationSaveMySpot();
      });

      await guestTest.step('Verify checkout dialog shows consultation details without duplication', async () => {
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible({ timeout: 10000 });
        await expect(dialog.getByText(consultationBuyerSchedulingData.checkoutHeading, { exact: true })).toBeVisible({ timeout: 5000 });
        await expect(dialog.getByText(consultationBuyerSchedulingData.consultationDetailsLabel, { exact: true })).toBeVisible({ timeout: 5000 });
        await expect(dialog.getByText(consultationBuyerSchedulingData.dateAndTimeLabel, { exact: true })).toBeVisible({ timeout: 5000 });
      });
    } finally {
      if (productUuid && seedToken) {
        await deleteProduct(page.request, productUuid, seedToken).catch(() => undefined);
      }
    }
  });

  guestTest('Validate Consultation Booking Completion and Navigation', {
    tag: ['@AUT-FV-036', '@sessions', '@buyer', '@regression'],
    annotation: [{ type: 'covers', description: 'TC-CON-B-018' }],
  }, async ({ page, context, productPurchasePage }) => {
    guestTest.setTimeout(180000);

    const seedToken = process.env.YAPP_TEST_ACCESS_TOKEN?.replace(/"/g, '');
    const buyerToken = process.env.YAPP_TEST_ACCESS_TOKEN_2?.replace(/"/g, '');
    guestTest.skip(!seedToken, 'YAPP_TEST_ACCESS_TOKEN is required');
    guestTest.skip(!buyerToken, 'YAPP_TEST_ACCESS_TOKEN_2 is required');
    if (!seedToken || !buyerToken) return;

    await loginWithToken(context, buyerToken, baseURL);

    const title = generateConsultationBuyerTitle();
    let productUuid = '';

    try {
      let sharePath = '';

      await guestTest.step('Seed consultation with session slot via API', async () => {
        const product = await createConsultationProduct(page.request, {
          title,
          description: generateConsultationBuyerDescription(),
          thumbnailImagePath: consultationMediaData.heroImagePath,
          productImagePaths: [consultationMediaData.heroImagePath],
          price: consultationBuyerSchedulingData.freePrice,
          dayOfWeek: consultationBuyerSchedulingData.dayOfWeek,
          startTime: consultationBuyerSchedulingData.startTime,
          endTime: consultationBuyerSchedulingData.endTime,
          appointmentDurationValue: consultationBuyerSchedulingData.appointmentDurationValue,
          appointmentDurationUnit: consultationBuyerSchedulingData.appointmentDurationUnit,
          availabilityRangeValue: consultationBuyerSchedulingData.availabilityRangeValue,
          availabilityRangeUnit: consultationBuyerSchedulingData.availabilityRangeUnit,
          minimumNoticeValue: consultationBuyerSchedulingData.minimumNoticeValue,
          minimumNoticeUnit: consultationBuyerSchedulingData.minimumNoticeUnit,
        }, seedToken);
        productUuid = product.productUuid;
        sharePath = product.sharePath;
      });

      await guestTest.step('Select date/time, open checkout and complete booking', async () => {
        await productPurchasePage.gotoSharePath(sharePath);
        await productPurchasePage.expectConsultationProductLoaded(title);
        await productPurchasePage.selectFirstConsultationDay();
        await productPurchasePage.selectConsultationTimeSlot(consultationBuyerSchedulingData.expectedSlots[0]);
        await productPurchasePage.clickConsultationSaveMySpot();

        const dialog = page.getByRole('dialog');

        // Fill buyer form fields if present
        const nameInput = dialog.getByPlaceholder(/name/i).first();
        if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await nameInput.fill('Test Buyer');
        }
        const emailInput = dialog.getByPlaceholder(/email/i).first();
        if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await emailInput.fill('buyer.qa@inbox.testmail.app');
        }

        await dialog.getByRole('button', { name: 'Join' }).click();
        await page.waitForTimeout(2000);
      });

      await guestTest.step('Verify booking completed and remains on product page', async () => {
        expect(page.url()).toContain('/product/');
        expect(page.url()).toContain('/hendrarg/');
      });
    } finally {
      if (productUuid && seedToken) {
        await deleteProduct(page.request, productUuid, seedToken).catch(() => undefined);
      }
    }
  });

  guestTest('Verify Consultation Thank You Page Default State', {
    tag: ['@AUT-FV-037', '@sessions', '@buyer', '@regression'],
    annotation: [{ type: 'covers', description: 'TC-CON-B-021' }],
  }, async ({ page, context, productPurchasePage }) => {
    guestTest.setTimeout(180000);

    const seedToken = process.env.YAPP_TEST_ACCESS_TOKEN?.replace(/"/g, '');
    const buyerToken = process.env.YAPP_TEST_ACCESS_TOKEN_2?.replace(/"/g, '');
    guestTest.skip(!seedToken, 'YAPP_TEST_ACCESS_TOKEN is required');
    guestTest.skip(!buyerToken, 'YAPP_TEST_ACCESS_TOKEN_2 is required');
    if (!seedToken || !buyerToken) return;

    await loginWithToken(context, buyerToken, baseURL);

    const title = generateConsultationBuyerTitle();
    let productUuid = '';

    try {
      let sharePath = '';

      await guestTest.step('Seed consultation with session slot via API', async () => {
        const product = await createConsultationProduct(page.request, {
          title,
          description: generateConsultationBuyerDescription(),
          thumbnailImagePath: consultationMediaData.heroImagePath,
          productImagePaths: [consultationMediaData.heroImagePath],
          price: consultationBuyerSchedulingData.freePrice,
          dayOfWeek: consultationBuyerSchedulingData.dayOfWeek,
          startTime: consultationBuyerSchedulingData.startTime,
          endTime: consultationBuyerSchedulingData.endTime,
          appointmentDurationValue: consultationBuyerSchedulingData.appointmentDurationValue,
          appointmentDurationUnit: consultationBuyerSchedulingData.appointmentDurationUnit,
          availabilityRangeValue: consultationBuyerSchedulingData.availabilityRangeValue,
          availabilityRangeUnit: consultationBuyerSchedulingData.availabilityRangeUnit,
          minimumNoticeValue: consultationBuyerSchedulingData.minimumNoticeValue,
          minimumNoticeUnit: consultationBuyerSchedulingData.minimumNoticeUnit,
        }, seedToken);
        productUuid = product.productUuid;
        sharePath = product.sharePath;
      });

      await guestTest.step('Select date/time and open checkout dialog', async () => {
        await productPurchasePage.gotoSharePath(sharePath);
        await productPurchasePage.expectConsultationProductLoaded(title);
        await productPurchasePage.selectFirstConsultationDay();
        await productPurchasePage.selectConsultationTimeSlot(consultationBuyerSchedulingData.expectedSlots[0]);
        await productPurchasePage.clickConsultationSaveMySpot();
      });

      await guestTest.step('Verify checkout dialog shows complete default state without broken content', async () => {
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible({ timeout: 10000 });
        await expect(dialog.getByText(consultationBuyerSchedulingData.checkoutHeading, { exact: true })).toBeVisible({ timeout: 5000 });
        await expect(dialog.getByText(title)).toBeVisible({ timeout: 5000 });
        await expect(dialog.getByText(consultationBuyerSchedulingData.consultationDetailsLabel, { exact: true })).toBeVisible({ timeout: 5000 });
        await expect(dialog.getByText(consultationBuyerSchedulingData.dateAndTimeLabel, { exact: true })).toBeVisible({ timeout: 5000 });
        await expect(dialog.getByText(consultationBuyerSchedulingData.meetingPlatformLabel, { exact: true })).toBeVisible({ timeout: 5000 });

        // Verify no broken/duplicate content
        const headingCount = await dialog.getByText(consultationBuyerSchedulingData.checkoutHeading, { exact: true }).count();
        expect(headingCount, 'checkout heading should appear exactly once').toBeLessThanOrEqual(1);
      });
    } finally {
      if (productUuid && seedToken) {
        await deleteProduct(page.request, productUuid, seedToken).catch(() => undefined);
      }
    }
  });
});
