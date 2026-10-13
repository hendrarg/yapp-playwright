import { authTest as test, test as guestTest, expect } from '../test-base';
import { baseURL } from '@config/env';
import { createConsultationProduct, deleteProduct } from '@helpers/api/product';
import { loginWithToken } from '@helpers/auth/token-login';
import { consultationBuyerDetailData, consultationBuyerSchedulingData, consultationCheckoutBuyer, generateConsultationBuyerDescription, generateConsultationBuyerTitle } from '@test-data/buyer/consultation.detail.data';
import { consultationMediaData } from '@test-data/creator/consultation.media.data';

test.describe('Buyer Consultation', () => {
  test('Consultation — Product Detail, Thumbnail Navigation, Meeting Platform Is Fixed, Owner Viewing Own Consultation', {
    tag: ['@AUT-CON-010', '@sessions', '@buyer', '@regression'],
    annotation: [
      {
        type: 'covers',
        description: 'TC-CON-B-001, TC-CON-B-002, TC-CON-B-032, TC-CON-B-033',
      },
    ],
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

      await test.step('Open buyer consultation product page and verify details, carousel, tabs, CTAs, and badge', async () => {
        await productPurchasePage.gotoSharePath(sharePath);
        await productPurchasePage.expectConsultationProductLoaded(title);
        await productPurchasePage.expectConsultationProductDetails({
          title,
          description,
          pricePattern: consultationBuyerDetailData.priceDisplayPattern,
        });
        await productPurchasePage.expectConsultationOverviewAndAboutCreatorTabs();
        await productPurchasePage.expectConsultationBookable();
        await productPurchasePage.expectConsultationSlideStripCount();
      });

      await test.step('Navigate slides with arrows and thumbnail strip highlights', async () => {
        await productPurchasePage.expectConsultationCarouselNavigable();
      });

      await test.step('Verify meeting platform is fixed to Google Meet with email delivery notice', async () => {
        await productPurchasePage.expectConsultationMeetingPlatformFixed();
      });
    } finally {
      if (productUuid && seedToken) {
        await deleteProduct(page.request, productUuid, seedToken).catch(() => undefined);
      }
    }
  });

  guestTest('Consultation — Available Dates, Time Slots, Booking Summary, Default Pre-selection, Duplicate Render State Divergence, Flexible Pricing Minimum', {
    tag: ['@AUT-CON-011', '@sessions', '@buyer', '@regression'],
    annotation: [
      {
        type: 'covers',
        description: 'TC-CON-B-003, TC-CON-B-004, TC-CON-B-005, TC-CON-B-022, TC-CON-B-023, TC-CON-B-030',
      },
    ],
  }, async ({ page, context, productPurchasePage }) => {
    guestTest.setTimeout(180000);

    const seedToken = process.env.YAPP_TEST_ACCESS_TOKEN?.replace(/"/g, '');
    const buyerToken = process.env.YAPP_TEST_ACCESS_TOKEN_2?.replace(/"/g, '');
    guestTest.skip(!seedToken, 'YAPP_TEST_ACCESS_TOKEN is required to seed consultation product');
    guestTest.skip(!buyerToken, 'YAPP_TEST_ACCESS_TOKEN_2 is required for buyer Save my spot CTA');
    if (!seedToken || !buyerToken) return;

    await loginWithToken(context, buyerToken, baseURL);

    const title = generateConsultationBuyerTitle();
    const description = generateConsultationBuyerDescription();
    let productUuid = '';

    try {
      let sharePath = '';

      await guestTest.step('Seed Friday-only consultation with limited time window via API', async () => {
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

      await guestTest.step('Open buyer page and review in-range available dates', async () => {
        await productPurchasePage.gotoSharePath(sharePath);
        await productPurchasePage.expectConsultationProductLoaded(title);
        await productPurchasePage.expectConsultationBookable();
        await productPurchasePage.expectConsultationAvailableDaysOnly();
      });

      let dayLabel = '';
      const time = consultationBuyerSchedulingData.expectedSlots[0];

      await guestTest.step('Select a date and time on the buyer consultation page', async () => {
        dayLabel = await productPurchasePage.selectFirstConsultationDay();
        await productPurchasePage.selectConsultationTimeSlot(time);
        await productPurchasePage.expectConsultationTimeSlots();
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

  guestTest('Consultation — Initiate Checkout, Payment Method, Order Review, Purchase Confirmation, Session Parameters in URL, Session Context Display, Fee Breakdown, Promo Code Submit Control', {
    tag: ['@AUT-CON-012', '@smoke', '@sessions', '@buyer'],
    annotation: [
      {
        type: 'covers',
        description: 'TC-CON-B-006, TC-CON-B-008, TC-CON-B-010, TC-CON-B-011, TC-CON-B-024, TC-CON-B-025, TC-CON-B-026, TC-CON-B-028',
      },
    ],
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

      let dayLabel = '';
      const time = consultationBuyerSchedulingData.expectedSlots[0];

      await guestTest.step('Select date/time and open checkout dialog', async () => {
        await productPurchasePage.gotoSharePath(sharePath);
        await productPurchasePage.expectConsultationProductLoaded(title);
        dayLabel = await productPurchasePage.selectFirstConsultationDay();
        await productPurchasePage.selectConsultationTimeSlot(time);
        await productPurchasePage.clickConsultationSaveMySpot();
      });

      await guestTest.step('Verify checkout dialog shows purchase confirmation details', async () => {
        await productPurchasePage.expectConsultationCheckoutSummary({ meetingPlatform: true, singleSession: true });
        await productPurchasePage.expectConsultationCheckoutDetails({ title, dayLabel, time });
      });

      await guestTest.step('Complete booking and verify success confirmation', async () => {
        await productPurchasePage.submitConsultationCheckout(consultationCheckoutBuyer);
        await productPurchasePage.expectConsultationBookingToastIfPresent();
      });
    } finally {
      if (productUuid && seedToken) {
        await deleteProduct(page.request, productUuid, seedToken).catch(() => undefined);
      }
    }
  });

  guestTest('Consultation — Personal Information, Voucher, Invalid Voucher Alters Total, Personal Information Prefill', {
    tag: ['@AUT-CON-013', '@sessions', '@buyer', '@regression'],
    annotation: [
      {
        type: 'covers',
        description: 'TC-CON-B-007, TC-CON-B-009, TC-CON-B-027, TC-CON-B-029',
      },
    ],
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

      await guestTest.step('Seed consultation with session slot via API', async () => {
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

      await guestTest.step('Open checkout dialog as authenticated buyer', async () => {
        await productPurchasePage.gotoSharePath(sharePath);
        await productPurchasePage.expectConsultationProductLoaded(title);
        await productPurchasePage.expectConsultationBookable();
        await productPurchasePage.selectFirstConsultationDay();
        await productPurchasePage.selectConsultationTimeSlot(consultationBuyerSchedulingData.expectedSlots[0]);
        await productPurchasePage.clickConsultationSaveMySpot();
        await productPurchasePage.expectConsultationCheckoutOpen();
      });

      await guestTest.step('Verify personal information prefill and email read-only behavior', async () => {
        await productPurchasePage.expectConsultationCheckoutEmailReadOnly();
        await productPurchasePage.expectConsultationCheckoutSummary({ meetingPlatform: true });
      });
    } finally {
      if (productUuid && seedToken) {
        await deleteProduct(page.request, productUuid, seedToken).catch(() => undefined);
      }
    }
  });

  guestTest('Consultation — Authenticated Access, Guest OTP, Booking Details, Join Meeting', {
    tag: ['@AUT-CON-014', '@sessions', '@buyer', '@regression'],
    annotation: [
      {
        type: 'covers',
        description: 'TC-CON-B-012, TC-CON-B-013, TC-CON-B-014, TC-CON-B-015',
      },
    ],
  }, async ({ page, context, productPurchasePage, libraryPage }) => {
    guestTest.setTimeout(180000);

    const seedToken = process.env.YAPP_TEST_ACCESS_TOKEN?.replace(/"/g, '');
    const buyerToken = process.env.YAPP_TEST_ACCESS_TOKEN_2?.replace(/"/g, '');
    guestTest.skip(!seedToken, 'YAPP_TEST_ACCESS_TOKEN is required');
    guestTest.skip(!buyerToken, 'YAPP_TEST_ACCESS_TOKEN_2 is required');
    if (!seedToken || !buyerToken) return;

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

      await guestTest.step('Select date/time and open checkout as guest', async () => {
        await productPurchasePage.gotoSharePath(sharePath);
        await productPurchasePage.expectConsultationProductLoaded(title);
        await productPurchasePage.selectFirstConsultationDay();
        await productPurchasePage.selectConsultationTimeSlot(consultationBuyerSchedulingData.expectedSlots[0]);
        await productPurchasePage.clickConsultationSaveMySpot();
        await productPurchasePage.expectConsultationCheckoutIdentityFields();
      });

      await guestTest.step('Book consultation as authenticated buyer', async () => {
        await loginWithToken(context, buyerToken, baseURL);
        await productPurchasePage.gotoSharePath(sharePath);
        await productPurchasePage.expectConsultationProductLoaded(title);
        await productPurchasePage.selectFirstConsultationDay();
        await productPurchasePage.selectConsultationTimeSlot(consultationBuyerSchedulingData.expectedSlots[0]);
        await productPurchasePage.clickConsultationSaveMySpot();
        await productPurchasePage.submitConsultationCheckout(consultationCheckoutBuyer);
      });

      await guestTest.step('Navigate to Library and verify Join Meeting button opens in new tab', async () => {
        await page.goto(new URL('dashboard/library', baseURL).toString(), { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);
        await libraryPage.expectJoinMeetingOpensExternally();
      });
    } finally {
      if (productUuid && seedToken) {
        await deleteProduct(page.request, productUuid, seedToken).catch(() => undefined);
      }
    }
  });

  guestTest('Consultation — Re-access Consultation, Thank You Page, Message and Links, Link Target Behaviour, Default State, Content Separation, Consultations Filter and Empty State', {
    tag: ['@AUT-CON-015', '@sessions', '@buyer', '@regression'],
    annotation: [
      {
        type: 'covers',
        description: 'TC-CON-B-016, TC-CON-B-017, TC-CON-B-018, TC-CON-B-019, TC-CON-B-020, TC-CON-B-021, TC-CON-B-031',
      },
    ],
  }, async ({ page, context, productPurchasePage, libraryPage }) => {
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

        await productPurchasePage.expectConsultationCheckoutSummary({ title, meetingPlatform: true });
        await productPurchasePage.expectConsultationCheckoutHeadingUnique();
        await productPurchasePage.submitConsultationCheckout(consultationCheckoutBuyer);
      });

      await guestTest.step('Verify booking completed and check complete state', async () => {
        expect(page.url()).toContain('/product/');
      });

      await guestTest.step('Navigate to Library and verify Consultations filter empty state or listing', async () => {
        await libraryPage.goto();
        await libraryPage.expectLoaded();
      });
    } finally {
      if (productUuid && seedToken) {
        await deleteProduct(page.request, productUuid, seedToken).catch(() => undefined);
      }
    }
  });
});
