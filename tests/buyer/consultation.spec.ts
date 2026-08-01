import { authTest as test } from '../test-base';
import { createConsultationProduct, deleteProduct } from '@helpers/api/product';
import { consultationBuyerDetailData, generateConsultationBuyerDescription, generateConsultationBuyerTitle } from '@test-data/buyer/consultation.detail.data';
import { consultationMediaData } from '@test-data/creator/consultation.media.data';

test.describe('Buyer Consultation', () => {
  test('Validate Consultation Pricing, Vouchers, and Fees — Part 2', {
    tag: ['@AUT-FV-027', '@sessions', '@buyer', '@regression'],
    annotation: [{ type: 'covers', description: 'TC-CON-B-001' }],
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
    annotation: [{ type: 'covers', description: 'TC-CON-B-002' }],
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
});
