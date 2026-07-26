import { test } from '../test-base';
import { createPromotion, deletePromotion } from '@helpers/api/promotion';
import { promotionData } from '@test-data/buyer/promotion.data';
import { generatePromotionData } from '@test-data/creator/promotion.data';

function getPromotionId(response: unknown): string {
  const body = response as {
    data?: { uuid?: string; id?: string };
    uuid?: string;
    id?: string;
  };
  const id = body.data?.uuid ?? body.data?.id ?? body.uuid ?? body.id;
  if (!id) throw new Error('Create promotion response did not include an ID');
  return id;
}

test.describe('Guest promotion redemption', () => {
  test('Promotion: Redeem valid voucher before payment', {
    tag: ['@AUT-FV-247', '@promotions', '@buyer', '@smoke', '@regression'],
  }, async ({ buyerNav, productPurchasePage, page }) => {
    const hendraToken = process.env.YAPP_TEST_ACCESS_TOKEN?.replace(/"/g, '');
    test.skip(!hendraToken, 'YAPP_TEST_ACCESS_TOKEN for Hendra is required to create the promotion');
    if (!hendraToken) return;

    const promotion = generatePromotionData('active');
    let promotionId = '';
    try {
      await test.step('Create Hendra promotion via API', async () => {
        promotionId = getPromotionId(await createPromotion(page.request, promotion, hendraToken));
      });

      await test.step('Open eligible direct purchase detail as guest', async () => {
        await buyerNav.open('productPurchase', { product: promotionData.eligibleProduct });
      });

      await test.step('Apply active promotion and verify acceptance', async () => {
        const before = await productPurchasePage.getOrderSummary();
        await productPurchasePage.applyPromotion(promotion.code);
        await productPurchasePage.expectActiveDiscount(before, 11);
      });
    } finally {
      if (promotionId) await deletePromotion(page.request, promotionId, hendraToken);
    }
  });

  test('Promotion: Validate order summary and reject invalid vouchers', {
    tag: ['@AUT-FV-248', '@promotions', '@buyer', '@regression'],
  }, async ({ buyerNav, productPurchasePage, page }) => {
    test.setTimeout(60_000);
    const hendraToken = process.env.YAPP_TEST_ACCESS_TOKEN?.replace(/"/g, '');
    test.skip(!hendraToken, 'YAPP_TEST_ACCESS_TOKEN for Hendra is required to create the promotion');
    if (!hendraToken) return;

    const promotion = generatePromotionData('active');
    let promotionId = '';

    try {
      await test.step('Create Hendra promotion via API', async () => {
        promotionId = getPromotionId(await createPromotion(page.request, promotion, hendraToken));
      });

      await test.step('Apply active promotion and validate updated totals', async () => {
        await buyerNav.open('productPurchase', { product: promotionData.eligibleProduct });
        const before = await productPurchasePage.getOrderSummary();
        await productPurchasePage.applyPromotion(promotion.code);
        await productPurchasePage.expectActiveDiscount(before, 11);
      });

      for (const invalidPromotion of promotionData.invalid) {
        await test.step(`Reject ${invalidPromotion.label} promotion without changing totals`, async () => {
          await buyerNav.open('productPurchase', { product: promotionData.eligibleProduct });
          const before = await productPurchasePage.getOrderSummary();
          await productPurchasePage.applyPromotion(invalidPromotion.code);
          await productPurchasePage.expectRejectedPromotion(before);
        });
      }

      await test.step('Reject hendrarg promotion for another creator product', async () => {
        await buyerNav.open('productPurchase', { product: promotionData.creatorIneligibleProduct });
        const before = await productPurchasePage.getOrderSummary();
        await productPurchasePage.applyPromotion(promotionData.creatorIneligible.code);
        await productPurchasePage.expectRejectedPromotion(before, promotionData.creatorIneligible.error);
      });
    } finally {
      if (promotionId) await deletePromotion(page.request, promotionId, hendraToken);
    }
  });
});
