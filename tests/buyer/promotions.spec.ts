import { test, expect } from '../test-base';
import { createPromotion } from '@helpers/api/promotion';
import { openGuestCheckout, PromoFixtures } from '@helpers/buyer/promotion-checkout';
import { promotionData } from '@test-data/buyer/promotion.data';
import { generatePromotionData } from '@test-data/creator/promotion.data';

const creatorToken = () => process.env.YAPP_TEST_ACCESS_TOKEN?.replace(/"/g, '');

test.describe('Guest promotion redemption', () => {
  test('Promotion — Checkout Redemption', {
    tag: ['@AUT-PRM-008', '@promotions', '@buyer', '@smoke'],
  }, async ({ productPurchasePage, page }) => {
    test.setTimeout(240000);
    const token = creatorToken();
    test.skip(!token, 'YAPP_TEST_ACCESS_TOKEN is required to seed the products and promotions');
    if (!token) return;
    const fx = new PromoFixtures(page.request);

    try {
      const stamp = Date.now();
      const target = await fx.course(`Promo target ${stamp}`, token);
      const other = await fx.course(`Promo other ${stamp}`, token);
      const allCode = await fx.promo(generatePromotionData('active'), token);
      const scopedCode = await fx.promo(generatePromotionData('active', { promoProductType: 'selected_product', productUUIDs: [target.uuid] }), token);
      const expiredCode = await fx.promo(generatePromotionData('expired'), token);

      await test.step('Use Now stays disabled until a code is typed', async () => {
        await openGuestCheckout(page, productPurchasePage, target);
        await productPurchasePage.expectUseNowEnabledOnlyWithCode(allCode);
      });

      await test.step('A guest redeems a valid code and the discount applies at once', async () => {
        const before = await productPurchasePage.getOrderSummary();
        await productPurchasePage.applyPromotion(allCode);
        await productPurchasePage.expectActiveDiscount(before, promotionData.activeDiscountPercent);
      });

      await test.step('The × next to an applied code removes it and restores the summary', async () => {
        await openGuestCheckout(page, productPurchasePage, target);
        const before = await productPurchasePage.getOrderSummary();
        await productPurchasePage.applyPromotion(allCode);
        await productPurchasePage.expectActiveDiscount(before, promotionData.activeDiscountPercent);
        await productPurchasePage.removePromotion(allCode);
        await productPurchasePage.expectPromotionCleared(before);
      });

      await test.step('The × also clears a rejected code', async () => {
        await openGuestCheckout(page, productPurchasePage, target);
        const before = await productPurchasePage.getOrderSummary();
        const unknown = `NOPE${stamp.toString().slice(-6)}`;
        await productPurchasePage.applyPromotion(unknown);
        await productPurchasePage.expectRejectedPromotion(before, promotionData.rejection.notFound);
        await productPurchasePage.removePromotion(unknown);
        await productPurchasePage.expectPromotionCleared(before);
      });

      await test.step('A product-scoped code works on its product and is refused on another one', async () => {
        await openGuestCheckout(page, productPurchasePage, target);
        const onTarget = await productPurchasePage.getOrderSummary();
        await productPurchasePage.applyPromotion(scopedCode);
        await productPurchasePage.expectActiveDiscount(onTarget, promotionData.activeDiscountPercent);

        await openGuestCheckout(page, productPurchasePage, other);
        const onOther = await productPurchasePage.getOrderSummary();
        await productPurchasePage.applyPromotion(scopedCode);
        await productPurchasePage.expectRejectedPromotion(onOther, promotionData.rejection.notApplicable);

        await openGuestCheckout(page, productPurchasePage, other);
        await productPurchasePage.applyPromotion(allCode);
        await productPurchasePage.expectActiveDiscount(onOther, promotionData.activeDiscountPercent);
      });

      await test.step('The buyer is told the real reason for each rejection', async () => {
        for (const [code, reason] of [
          [expiredCode, promotionData.rejection.expired],
          [`NOPE${stamp.toString().slice(-5)}X`, promotionData.rejection.notFound],
          [scopedCode, promotionData.rejection.notApplicable],
        ] as const) {
          await openGuestCheckout(page, productPurchasePage, code === scopedCode ? other : target);
          const before = await productPurchasePage.getOrderSummary();
          await productPurchasePage.applyPromotion(code);
          await productPurchasePage.expectRejectedPromotion(before, reason);
        }
      });
    } finally {
      await fx.cleanup();
    }
  });

  test('Promotion — Order Summary, Voucher Code', {
    tag: ['@AUT-PRM-009', '@promotions', '@buyer', '@regression'],
  }, async ({ productPurchasePage, page }) => {
    test.setTimeout(240000);
    const token = creatorToken();
    test.skip(!token, 'YAPP_TEST_ACCESS_TOKEN is required to seed the products and promotions');
    if (!token) return;
    const fx = new PromoFixtures(page.request);

    try {
      const stamp = Date.now();
      const course = await fx.course(`Promo summary ${stamp}`, token);
      const other = await fx.course(`Promo summary other ${stamp}`, token);
      const allCode = await fx.promo(generatePromotionData('active'), token);
      const scopedCode = await fx.promo(generatePromotionData('active', { promoProductType: 'selected_product', productUUIDs: [other.uuid] }), token);
      const expiredCode = await fx.promo(generatePromotionData('expired'), token);
      const usedUpCode = await fx.promo(generatePromotionData('active', { maxUsed: 0 }), token);
      const overPriceCode = await fx.promo(generatePromotionData('active', { discountType: 'flat', discount: promotionData.coursePrice + 51000 }), token);

      await test.step('A valid code updates discount, subtotal, fees and total', async () => {
        await openGuestCheckout(page, productPurchasePage, course);
        const before = await productPurchasePage.getOrderSummary();
        await productPurchasePage.applyPromotion(allCode);
        await productPurchasePage.expectActiveDiscount(before, promotionData.activeDiscountPercent);
      });

      await test.step('Every rejected code drops the fee rows and applies no discount', async () => {
        for (const [code, reason] of [
          [`NOPE${stamp.toString().slice(-6)}`, promotionData.rejection.notFound],
          [expiredCode, promotionData.rejection.expired],
          [usedUpCode, promotionData.rejection.usageLimit],
          [scopedCode, promotionData.rejection.notApplicable],
        ] as const) {
          await openGuestCheckout(page, productPurchasePage, course);
          const before = await productPurchasePage.getOrderSummary();
          await productPurchasePage.applyPromotion(code);
          await productPurchasePage.expectRejectedPromotion(before, reason);
        }
      });

      await test.step('Codes match regardless of case and surrounding spaces', async () => {
        for (const variant of [allCode, allCode.toLowerCase(), `  ${allCode}  `]) {
          await openGuestCheckout(page, productPurchasePage, course);
          const before = await productPurchasePage.getOrderSummary();
          await productPurchasePage.applyPromotion(variant);
          await productPurchasePage.expectActiveDiscount(before, promotionData.activeDiscountPercent);
        }
      });

      await test.step('A discount larger than the price is capped, so the total never goes negative', async () => {
        await expect(createPromotion(page.request, generatePromotionData('active', { discount: 150 }), token), 'percentages above 100 are refused').rejects.toThrow(/at most 100/);
        await openGuestCheckout(page, productPurchasePage, course);
        await productPurchasePage.applyPromotion(overPriceCode);
        await expect.poll(async () => (await productPurchasePage.getOrderSummary()).discount, { timeout: 10000 }).toBe(promotionData.coursePrice);
        const after = await productPurchasePage.getOrderSummary();
        expect(after.subtotal).toBe(0);
        expect(after.total).toBe(0);
      });
    } finally {
      await fx.cleanup();
    }
  });

  test('Promotion — Checkout Redemption (negative & boundary)', {
    tag: ['@AUT-PRM-010', '@promotions', '@buyer', '@regression'],
  }, async ({ productPurchasePage, page }) => {
    test.setTimeout(240000);
    const token = creatorToken();
    const otherCreatorToken = process.env.YAPP_TEST_ACCESS_TOKEN_2?.replace(/"/g, '');
    test.skip(!token || !otherCreatorToken, 'Creator (token1) and a second creator (token2) are required');
    if (!token || !otherCreatorToken) return;
    const fx = new PromoFixtures(page.request);

    try {
      const stamp = Date.now();
      const course = await fx.course(`Promo negative ${stamp}`, token);
      const otherCreatorCourse = await fx.course(`Promo other creator ${stamp}`, otherCreatorToken);
      const allCode = await fx.promo(generatePromotionData('active'), token);
      const expiredCode = await fx.promo(generatePromotionData('expired'), token);
      const usedUpCode = await fx.promo(generatePromotionData('active', { maxUsed: 0 }), token);

      for (const [label, code, reason] of [
        ['A code that does not exist is rejected', `NOPE${stamp.toString().slice(-6)}`, promotionData.rejection.notFound],
        ['An expired code is rejected', expiredCode, promotionData.rejection.expired],
        ['A code at its usage limit is rejected', usedUpCode, promotionData.rejection.usageLimit],
      ] as const) {
        await test.step(label, async () => {
          await openGuestCheckout(page, productPurchasePage, course);
          const before = await productPurchasePage.getOrderSummary();
          await productPurchasePage.applyPromotion(code);
          await productPurchasePage.expectRejectedPromotion(before, reason);
        });
      }

      await test.step("A creator's code is rejected on another creator's product", async () => {
        await openGuestCheckout(page, productPurchasePage, otherCreatorCourse);
        const before = await productPurchasePage.getOrderSummary();
        await productPurchasePage.applyPromotion(allCode);
        // Codes are looked up per creator, so another creator's code reads as unknown here.
        await productPurchasePage.expectRejectedPromotion(before, promotionData.rejection.notFound);
      });
    } finally {
      await fx.cleanup();
    }
  });
});
