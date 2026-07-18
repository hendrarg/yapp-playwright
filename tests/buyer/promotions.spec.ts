import { test } from '../test-base';
import { promotionData } from '@test-data/buyer/promotion.data';

test.describe('Guest promotion redemption', () => {
  test('Promotion: Redeem valid voucher before payment', {
    tag: ['@AUT-FV-205', '@promotions', '@buyer', '@smoke', '@regression'],
  }, async ({ productPurchasePage }) => {
    await test.step('Open eligible direct purchase detail as guest', async () => {
      await productPurchasePage.openPurchase(promotionData.eligibleProduct);
    });

    await test.step('Apply active promotion and verify acceptance', async () => {
      const before = await productPurchasePage.getOrderSummary();
      await productPurchasePage.applyPromotion(promotionData.active.code);
      await productPurchasePage.expectActiveDiscount(before, promotionData.active.discountPercent);
    });
  });

  test('Promotion: Validate order summary and reject invalid vouchers', {
    tag: ['@AUT-FV-206', '@promotions', '@buyer', '@regression'],
  }, async ({ productPurchasePage }) => {
    test.setTimeout(60_000);

    await test.step('Apply active promotion and validate updated totals', async () => {
      await productPurchasePage.openPurchase(promotionData.eligibleProduct);
      const before = await productPurchasePage.getOrderSummary();
      await productPurchasePage.applyPromotion(promotionData.active.code);
      await productPurchasePage.expectActiveDiscount(before, promotionData.active.discountPercent);
    });

    for (const promotion of promotionData.invalid) {
      await test.step(`Reject ${promotion.label} promotion without changing totals`, async () => {
        await productPurchasePage.openPurchase(promotionData.eligibleProduct);
        const before = await productPurchasePage.getOrderSummary();
        await productPurchasePage.applyPromotion(promotion.code);
        await productPurchasePage.expectRejectedPromotion(before);
      });
    }

    await test.step('Reject hendrarg promotion for another creator product', async () => {
      await productPurchasePage.openPurchase(promotionData.creatorIneligibleProduct);
      const before = await productPurchasePage.getOrderSummary();
      await productPurchasePage.applyPromotion(promotionData.creatorIneligible.code);
      await productPurchasePage.expectRejectedPromotion(before, promotionData.creatorIneligible.error);
    });
  });
});
