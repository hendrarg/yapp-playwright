import { test } from '../test-base';
import { createPromotion, deletePromotion } from '@helpers/api/promotion';
import { openGuestCheckout } from '@helpers/buyer/promotion-checkout';
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
  test('Verify Promotions Guest Voucher Redemption', {
    tag: ['@AUT-FV-247', '@promotions', '@buyer', '@smoke', '@regression'],
  }, async ({ productPurchasePage, page }) => {
    const seedToken = process.env.YAPP_TEST_ACCESS_TOKEN?.replace(/"/g, '');
    test.skip(!seedToken, 'YAPP_TEST_ACCESS_TOKEN for QA Tester is required to create the promotion');
    if (!seedToken) return;

    const promotion = generatePromotionData('active');
    let promotionId = '';
    try {
      await test.step('Create Hendra promotion via API', async () => {
        promotionId = getPromotionId(await createPromotion(page.request, promotion, seedToken));
      });

      await test.step('Open eligible direct purchase detail as guest', async () => {
        await openGuestCheckout(page, productPurchasePage, promotionData.eligibleProduct);
      });

      await test.step('Apply active promotion and verify acceptance', async () => {
        const before = await productPurchasePage.getOrderSummary();
        await productPurchasePage.applyPromotion(promotion.code);
        await productPurchasePage.expectActiveDiscount(before, 11);
      });
    } finally {
      if (promotionId) await deletePromotion(page.request, promotionId, seedToken);
    }
  });

  test('Verify Promotions Checkout Redemption Validation', {
    tag: ['@AUT-FV-248', '@promotions', '@buyer', '@regression'],
  }, async ({ productPurchasePage, page }) => {
    test.setTimeout(120_000);
    const seedToken = process.env.YAPP_TEST_ACCESS_TOKEN?.replace(/"/g, '');
    test.skip(!seedToken, 'YAPP_TEST_ACCESS_TOKEN for QA Tester is required to create the promotion');
    if (!seedToken) return;

    const promotion = generatePromotionData('active');
    let promotionId = '';

    try {
      await test.step('Create Hendra promotion via API', async () => {
        promotionId = getPromotionId(await createPromotion(page.request, promotion, seedToken));
      });

      await test.step('Apply active promotion and validate updated totals', async () => {
        await openGuestCheckout(page, productPurchasePage, promotionData.eligibleProduct);
        const before = await productPurchasePage.getOrderSummary();
        await productPurchasePage.applyPromotion(promotion.code);
        await productPurchasePage.expectActiveDiscount(before, 11);
      });

      for (const invalidPromotion of promotionData.invalid) {
        await test.step(`Reject ${invalidPromotion.label} promotion without changing totals`, async () => {
          await openGuestCheckout(page, productPurchasePage, promotionData.eligibleProduct);
          const before = await productPurchasePage.getOrderSummary();
          await productPurchasePage.applyPromotion(invalidPromotion.code);
          await productPurchasePage.expectRejectedPromotion(before);
        });
      }

      await test.step('Reject hendrarg promotion for another creator product', async () => {
        await openGuestCheckout(page, productPurchasePage, promotionData.creatorIneligibleProduct);
        const before = await productPurchasePage.getOrderSummary();
        await productPurchasePage.applyPromotion(promotionData.creatorIneligible.code);
        await productPurchasePage.expectRejectedPromotion(before, promotionData.creatorIneligible.error);
      });

      await test.step('Reject deleted promotion code', async () => {
        const deletedPromotion = generatePromotionData('active');
        const deletedPromotionId = getPromotionId(
          await createPromotion(page.request, deletedPromotion, seedToken),
        );
        await deletePromotion(page.request, deletedPromotionId, seedToken);

        await openGuestCheckout(page, productPurchasePage, promotionData.eligibleProduct);
        const before = await productPurchasePage.getOrderSummary();
        await productPurchasePage.applyPromotion(deletedPromotion.code);
        await productPurchasePage.expectRejectedPromotion(before);
      });
    } finally {
      if (promotionId) await deletePromotion(page.request, promotionId, seedToken);
    }
  });
});
