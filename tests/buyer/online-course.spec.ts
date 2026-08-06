import { test as guestTest, expect } from '../test-base';
import { createOnlineCourseProduct, deleteProduct } from '@helpers/api/product';
import { createPromotion, deletePromotion, getPromotionId } from '@helpers/api/promotion';
import { loginWithToken } from '@helpers/auth/token-login';
import { isTokenExpired } from '@helpers/auth/token-utils';
import { refreshAccountTokenViaOtp } from '@helpers/auth/refresh-token-otp';
import { testAccounts } from '@test-data/users';
import { baseURL } from '@config/env';
import { generateOnlineCourseBuyerDescription, generateOnlineCourseBuyerTitle, generateOnlineCourseInvalidVoucherCode, onlineCourseBuyerDetailData, onlineCourseCheckoutData } from '@test-data/buyer/online-course.detail.data';
import { generatePromotionData } from '@test-data/creator/promotion.data';

guestTest.describe('Buyer Online Course', () => {
  guestTest('Validate Online Course Product Detail Information', {
    tag: ['@AUT-FV-169', '@products', '@buyer', '@regression'],
    annotation: [{ type: 'covers', description: 'TC-OC-B-001' }],
  }, async ({ productPurchasePage, page }) => {
    guestTest.setTimeout(180000);

    const seedToken = process.env.YAPP_TEST_ACCESS_TOKEN?.replace(/"/g, '');
    guestTest.skip(!seedToken, 'YAPP_TEST_ACCESS_TOKEN is required to seed online course product');
    if (!seedToken) return;

    const title = generateOnlineCourseBuyerTitle();
    const description = generateOnlineCourseBuyerDescription();
    let productUuid = '';

    try {
      let sharePath = '';

      await guestTest.step('Seed published Online Course with gallery images via API', async () => {
        const product = await createOnlineCourseProduct(
          page.request,
          {
            title,
            description,
            thumbnailImagePath: onlineCourseBuyerDetailData.thumbnailImagePath,
            productImagePaths: [...onlineCourseBuyerDetailData.carouselImagePaths],
            price: onlineCourseBuyerDetailData.price,
          },
          seedToken,
        );
        productUuid = product.productUuid;
        const body = product.body as {
          data?: { shortUrl?: string; product?: { shortUrl?: string } };
          shortUrl?: string;
        };
        const shortUrl = body?.data?.shortUrl ?? body?.data?.product?.shortUrl ?? body?.shortUrl;
        expect(shortUrl, 'created online course must include a short URL').toBeTruthy();
        sharePath = `/s/${shortUrl as string}`;
      });

      await guestTest.step('Open buyer Online Course product page', async () => {
        await productPurchasePage.gotoSharePath(sharePath);
        await productPurchasePage.expectOnlineCourseProductLoaded(title);
      });

      await guestTest.step('Review carousel, creator, price, description, tabs, CTAs, and badge', async () => {
        await productPurchasePage.expectOnlineCourseProductDetails({
          title,
          description,
          pricePattern: onlineCourseBuyerDetailData.priceDisplayPattern,
        });
        await productPurchasePage.expectOnlineCourseOverviewAndAboutCreatorTabs();
      });

      await guestTest.step('Navigate the gallery carousel', async () => {
        await productPurchasePage.expectOnlineCourseCarouselNavigable();
      });
    } finally {
      if (productUuid && seedToken) {
        await deleteProduct(page.request, productUuid, seedToken).catch(() => undefined);
      }
    }
  });

  guestTest('Validate Online Course Thumbnail Navigation', {
    tag: ['@AUT-FV-170', '@products', '@buyer', '@regression'],
    annotation: [{ type: 'covers', description: 'TC-OC-B-002' }],
  }, async ({ productPurchasePage, page }) => {
    guestTest.setTimeout(180000);

    const seedToken = process.env.YAPP_TEST_ACCESS_TOKEN?.replace(/"/g, '');
    guestTest.skip(!seedToken, 'YAPP_TEST_ACCESS_TOKEN is required to seed online course product');
    if (!seedToken) return;

    const title = generateOnlineCourseBuyerTitle();
    const description = generateOnlineCourseBuyerDescription();
    let productUuid = '';

    try {
      let sharePath = '';

      await guestTest.step('Seed published Online Course with multiple thumbnails via API', async () => {
        const product = await createOnlineCourseProduct(
          page.request,
          {
            title,
            description,
            thumbnailImagePath: onlineCourseBuyerDetailData.thumbnailImagePath,
            productImagePaths: [...onlineCourseBuyerDetailData.carouselImagePaths],
            price: onlineCourseBuyerDetailData.price,
          },
          seedToken,
        );
        productUuid = product.productUuid;
        const body = product.body as {
          data?: { shortUrl?: string; product?: { shortUrl?: string } };
          shortUrl?: string;
        };
        const shortUrl = body?.data?.shortUrl ?? body?.data?.product?.shortUrl ?? body?.shortUrl;
        expect(shortUrl, 'created online course must include a short URL').toBeTruthy();
        sharePath = `/s/${shortUrl as string}`;
      });

      await guestTest.step('Open buyer Online Course product page', async () => {
        await productPurchasePage.gotoSharePath(sharePath);
        await productPurchasePage.expectOnlineCourseProductLoaded(title);
      });

      await guestTest.step('Navigate thumbnails with arrows and thumbnail strip', async () => {
        await productPurchasePage.expectOnlineCourseThumbnailNavigation();
      });
    } finally {
      if (productUuid && seedToken) {
        await deleteProduct(page.request, productUuid, seedToken).catch(() => undefined);
      }
    }
  });

  guestTest('Validate Online Course Checkout Flow', {
    tag: ['@AUT-FV-171', '@products', '@buyer', '@smoke', '@regression'],
    annotation: [{ type: 'covers', description: 'TC-OC-B-003, TC-OC-B-004, TC-OC-B-005, TC-OC-B-006, TC-OC-B-007' }],
  }, async ({ productPurchasePage, page, context }) => {
    guestTest.setTimeout(300000);

    const seedToken = process.env.YAPP_TEST_ACCESS_TOKEN?.replace(/"/g, '');
    let buyerToken = process.env.YAPP_TEST_ACCESS_TOKEN_2?.replace(/"/g, '');
    guestTest.skip(!seedToken, 'YAPP_TEST_ACCESS_TOKEN is required to seed online course products and promotion');
    guestTest.skip(!buyerToken && !process.env.TESTMAIL_API_KEY, 'A valid YAPP_TEST_ACCESS_TOKEN_2 or TESTMAIL_API_KEY is required for the buyer checkout session');
    if (!seedToken) return;

    if (!buyerToken || isTokenExpired(buyerToken)) {
      buyerToken = await refreshAccountTokenViaOtp(context, testAccounts.sundanese, baseURL);
    }
    if (!buyerToken) return;
    await loginWithToken(context, buyerToken, baseURL);

    const paidTitle = generateOnlineCourseBuyerTitle();
    const freeTitle = generateOnlineCourseBuyerTitle();
    const description = generateOnlineCourseBuyerDescription();
    const promotion = generatePromotionData('active');
    const invalidCode = generateOnlineCourseInvalidVoucherCode();
    let paidUuid = '';
    let freeUuid = '';
    let promotionId = '';
    let paidSharePath = '';
    let freeSharePath = '';

    try {
      await guestTest.step('Seed paid and free Online Course plus active promotion via API', async () => {
        const paid = await createOnlineCourseProduct(
          page.request,
          {
            title: paidTitle,
            description,
            thumbnailImagePath: onlineCourseBuyerDetailData.thumbnailImagePath,
            productImagePaths: [...onlineCourseBuyerDetailData.carouselImagePaths],
            price: onlineCourseBuyerDetailData.price,
          },
          seedToken,
        );
        paidUuid = paid.productUuid;
        const paidBody = paid.body as { data?: { shortUrl?: string }; shortUrl?: string };
        const paidShortUrl = paidBody?.data?.shortUrl ?? paidBody?.shortUrl;
        expect(paidShortUrl, 'paid course must include a short URL').toBeTruthy();
        paidSharePath = `/s/${paidShortUrl as string}`;

        const free = await createOnlineCourseProduct(
          page.request,
          {
            title: freeTitle,
            description,
            thumbnailImagePath: onlineCourseBuyerDetailData.thumbnailImagePath,
            price: 0,
          },
          seedToken,
        );
        freeUuid = free.productUuid;
        const freeBody = free.body as { data?: { shortUrl?: string }; shortUrl?: string };
        const freeShortUrl = freeBody?.data?.shortUrl ?? freeBody?.shortUrl;
        expect(freeShortUrl, 'free course must include a short URL').toBeTruthy();
        freeSharePath = `/s/${freeShortUrl as string}`;

        promotionId = getPromotionId(await createPromotion(page.request, promotion, seedToken));
      });

      await guestTest.step('Initiate checkout from Purchase and verify product, creator, quantity', async () => {
        await productPurchasePage.openOnlineCourseCheckout(paidTitle, paidSharePath);
        await productPurchasePage.expectOnlineCourseCheckoutInitiated({ title: paidTitle });
      });

      await guestTest.step('Validate buyer field prefill and required validation', async () => {
        await productPurchasePage.expectOnlineCourseCheckoutPrefill();
        await productPurchasePage.expectOnlineCourseCheckoutRequiredValidation();
      });

      await guestTest.step('Select payment method and verify free course zero total', async () => {
        await productPurchasePage.selectOnlineCoursePaymentMethod(/credit card/i);
        await productPurchasePage.expectOnlineCoursePaymentMethod(/credit card/i);
        await productPurchasePage.selectOnlineCoursePaymentMethod(/qris/i);
        await productPurchasePage.expectOnlineCoursePaymentMethod(/qris/i);
        await productPurchasePage.expectOnlineCourseFreeCheckout(freeTitle, freeSharePath);
      });

      await guestTest.step('Apply valid and invalid vouchers', async () => {
        await productPurchasePage.openOnlineCourseCheckout(paidTitle, paidSharePath);
        await productPurchasePage.openOnlineCourseVoucherDialog();
        const before = await productPurchasePage.getOrderSummary();
        await productPurchasePage.applyPromotion(promotion.code);
        await productPurchasePage.expectActiveDiscount(before, onlineCourseCheckoutData.activePromotionDiscountPercent);

        await productPurchasePage.openOnlineCourseCheckout(paidTitle, paidSharePath);
        await productPurchasePage.openOnlineCourseVoucherDialog();
        const rejectedBefore = await productPurchasePage.getOrderSummary();
        await productPurchasePage.applyPromotion(invalidCode);
        await productPurchasePage.expectRejectedPromotion(rejectedBefore);
      });

      await guestTest.step('Review subtotal, total, and Pay CTA', async () => {
        await productPurchasePage.expectOnlineCourseOrderReview({
          subtotal: onlineCourseBuyerDetailData.price,
        });
      });
    } finally {
      if (paidUuid) await deleteProduct(page.request, paidUuid, seedToken).catch(() => undefined);
      if (freeUuid) await deleteProduct(page.request, freeUuid, seedToken).catch(() => undefined);
      if (promotionId) await deletePromotion(page.request, promotionId, seedToken).catch(() => undefined);
    }
  });
});
