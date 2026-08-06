import { test as guestTest, expect } from '../test-base';
import { createOnlineCourseProduct, deleteProduct } from '@helpers/api/product';
import { generateOnlineCourseBuyerDescription, generateOnlineCourseBuyerTitle, onlineCourseBuyerDetailData } from '@test-data/buyer/online-course.detail.data';

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
});
