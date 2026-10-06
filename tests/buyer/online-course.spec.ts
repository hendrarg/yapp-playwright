import { authTest as test, expect } from '../test-base';
import { getAccount } from '@helpers/api/account';
import { createOnlineCourseProduct, deleteProduct, productSharePath } from '@helpers/api/product';
import { createPromotion, deletePromotion, getPromotionId } from '@helpers/api/promotion';
import { depositWebhook } from '@helpers/api/webhook';
import { markInboxStart, testmailConfig, waitForEmail } from '@helpers/otp/testmail';
import { generateOnlineCourseBuyerDescription, generateOnlineCourseBuyerTitle, generateOnlineCourseInvalidVoucherCode, onlineCourseBuyerDetailData, onlineCourseCheckoutData } from '@test-data/buyer/online-course.detail.data';
import { promotionData } from '@test-data/buyer/promotion.data';
import { generatePromotionData } from '@test-data/creator/promotion.data';

test.describe('Buyer Online Course', () => {
  test('Online Course — Product Detail, Thumbnail Navigation, Initiate Checkout, Personal Information, Payment Method, Voucher, Order Review, Purchase Confirm', {
    tag: ['@AUT-OC-009', '@products', '@buyer', '@smoke'],
  }, async ({ productPurchasePage, transactionPage, page }) => {
    test.setTimeout(300000);

    const seedToken = process.env.YAPP_TEST_ACCESS_TOKEN?.replace(/"/g, '');
    test.skip(!seedToken, 'YAPP_TEST_ACCESS_TOKEN is required to seed the courses and the promotion');
    if (!seedToken) return;

    const creator = await getAccount(page.request, seedToken);
    // The product page shows the creator's display name, or the username when it has none.
    const creatorName = creator.name || creator.username;
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
      await test.step('Seed a paid course with a gallery, a free course and an active promotion', async () => {
        const paid = await createOnlineCourseProduct(page.request, {
          title: paidTitle,
          description,
          thumbnailImagePath: onlineCourseBuyerDetailData.thumbnailImagePath,
          productImagePaths: [...onlineCourseBuyerDetailData.carouselImagePaths],
          price: onlineCourseBuyerDetailData.price,
        }, seedToken);
        paidUuid = paid.productUuid;
        paidSharePath = productSharePath(paid);
        const free = await createOnlineCourseProduct(page.request, {
          title: freeTitle,
          description,
          thumbnailImagePath: onlineCourseBuyerDetailData.thumbnailImagePath,
          price: 0,
        }, seedToken);
        freeUuid = free.productUuid;
        freeSharePath = productSharePath(free);
        promotionId = getPromotionId(await createPromotion(page.request, promotion, seedToken));
      });

      await test.step('The product page shows carousel, creator, price, description, tabs, CTA and badge', async () => {
        await productPurchasePage.gotoSharePath(paidSharePath);
        await productPurchasePage.expectOnlineCourseProductDetails({
          title: paidTitle,
          description,
          pricePattern: onlineCourseBuyerDetailData.priceDisplayPattern,
          creatorName,
        });
        await productPurchasePage.expectOnlineCourseOverviewAndAboutCreatorTabs(creatorName);
        await productPurchasePage.expectOnlineCourseCarouselNavigable();
      });

      await test.step('Arrows and the thumbnail strip cycle the images and highlight the active one', async () => {
        await productPurchasePage.gotoSharePath(paidSharePath);
        await productPurchasePage.expectOnlineCourseProductLoaded(paidTitle);
        await productPurchasePage.expectOnlineCourseThumbnailNavigation();
      });

      await test.step('Purchase opens checkout with the product, its creator and quantity 1', async () => {
        await productPurchasePage.openOnlineCourseCheckout(paidTitle, paidSharePath);
        await productPurchasePage.expectOnlineCourseCheckoutInitiated({ title: paidTitle, creatorName });
      });

      await test.step('Buyer fields prefill from the account and required fields block submission', async () => {
        await productPurchasePage.expectOnlineCourseCheckoutPrefill();
        await productPurchasePage.expectOnlineCourseCheckoutRequiredValidation();
      });

      await test.step('The chosen payment method is reflected, and a free course totals zero', async () => {
        await productPurchasePage.selectOnlineCoursePaymentMethod(/credit card/i);
        await productPurchasePage.expectOnlineCoursePaymentMethod(/credit card/i);
        await productPurchasePage.selectOnlineCoursePaymentMethod(/qris/i);
        await productPurchasePage.expectOnlineCoursePaymentMethod(/qris/i);
        await productPurchasePage.expectOnlineCourseFreeCheckout(freeTitle, freeSharePath);
      });

      await test.step('A valid voucher recalculates the order and an unknown code is rejected', async () => {
        await productPurchasePage.openOnlineCourseCheckout(paidTitle, paidSharePath);
        await productPurchasePage.openOnlineCourseVoucherDialog();
        const before = await productPurchasePage.getOrderSummary();
        await productPurchasePage.applyPromotion(promotion.code);
        await productPurchasePage.expectActiveDiscount(before, onlineCourseCheckoutData.activePromotionDiscountPercent);

        await productPurchasePage.openOnlineCourseCheckout(paidTitle, paidSharePath);
        await productPurchasePage.openOnlineCourseVoucherDialog();
        const rejectedBefore = await productPurchasePage.getOrderSummary();
        await productPurchasePage.applyPromotion(invalidCode);
        await productPurchasePage.expectRejectedPromotion(rejectedBefore, promotionData.rejection.notFound);
      });

      await test.step('The order review shows subtotal, total and a Pay CTA with the total', async () => {
        await productPurchasePage.openOnlineCourseCheckout(paidTitle, paidSharePath);
        await productPurchasePage.expectOnlineCourseOrderReview({ subtotal: onlineCourseBuyerDetailData.price });
      });

      await test.step('A completed payment shows the success modal and sends the enrollment email', async () => {
        const inboxStart = markInboxStart();
        const orderId = await productPurchasePage.payOnlineCourseCheckout({ name: 'QA Buyer', phone: `812${Date.now().toString().slice(-9)}` });
        await depositWebhook(page.request, orderId);
        await transactionPage.expectProductPurchaseSuccess({ title: paidTitle, creatorName });
        const email = await waitForEmail(testmailConfig(), inboxStart, paidTitle);
        expect(email.subject).toContain(onlineCourseCheckoutData.enrollmentEmailSubject);
        expect(email.text).toContain(creatorName);
      });
    } finally {
      if (paidUuid) await deleteProduct(page.request, paidUuid, seedToken).catch(() => undefined);
      if (freeUuid) await deleteProduct(page.request, freeUuid, seedToken).catch(() => undefined);
      if (promotionId) await deletePromotion(page.request, promotionId, seedToken).catch(() => undefined);
    }
  });
});
