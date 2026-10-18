import { authTest as test, expect } from '../test-base';
import { createDiscordMembershipProduct, deleteProduct, productSharePath } from '@helpers/api/product';
import { loginWithToken } from '@helpers/auth/token-login';
import { ProductPurchasePage } from '@pages/buyer/ProductPurchasePage';
import { baseURL } from '@config/env';
import { generateDiscordMembershipDescription, generateDiscordMembershipTitle } from '@test-data/creator/membership.data';
import { testImages } from '@test-data/creator/post.data';
import { testAccounts } from '@test-data/users';

const creatorToken = () => process.env[testAccounts.creator.envVar]?.replace(/"/g, '');

test.describe('Buyer Discord Membership', () => {
  test('Discord Membership — Product Detail, Thumbnail Navigation, Duration Display, Owner View, Single Image Carousel', {
    tag: ['@AUT-DM-008', '@membership', '@buyer', '@regression'],
    annotation: [
      { type: 'issue', description: 'M-07' },
    ],
  }, async ({ page, browser }) => {
    test.setTimeout(240000);
    test.fail(true, 'M-07: membership duration not shown to buyer');
    const token = creatorToken();
    test.skip(!token, 'Creator token is required to seed Discord Membership');
    if (!token) return;

    const productMulti = {
      title: generateDiscordMembershipTitle(),
      description: generateDiscordMembershipDescription(),
    };
    const productSingle = {
      title: generateDiscordMembershipTitle(),
      description: generateDiscordMembershipDescription(),
    };
    const productUuids: string[] = [];
    let sharePathMulti = '';
    let sharePathSingle = '';

    const purchasePage = new ProductPurchasePage(page, baseURL);

    try {
      await test.step('Seed multi-image Discord Membership and single-image Discord Membership', async () => {
        const createdMulti = await createDiscordMembershipProduct(page.request, {
          ...productMulti,
          thumbnailImagePath: testImages.claude,
          imagePaths: [testImages.gemini, testImages.gpt],
          price: 25000,
        }, token);
        productUuids.push(createdMulti.productUuid);
        sharePathMulti = productSharePath(createdMulti);

        const createdSingle = await createDiscordMembershipProduct(page.request, {
          ...productSingle,
          thumbnailImagePath: testImages.claude,
          price: 25000,
        }, token);
        productUuids.push(createdSingle.productUuid);
        sharePathSingle = productSharePath(createdSingle);
      });

      await test.step('Display Discord Membership details on product page', async () => {
        await purchasePage.gotoSharePath(sharePathMulti);
        await purchasePage.expectDiscordMembershipProductDetails({
          title: productMulti.title,
          description: productMulti.description,
          pricePattern: /Rp\s?25[.,]000/,
          creatorName: testAccounts.creator.username,
        });
      });

      await test.step('Navigate all thumbnails on multi-image Discord Membership product', async () => {
        // Multi-image product has 3 slides (1 thumbnail + 2 gallery images)
        await purchasePage.expectOnlineCourseThumbnailNavigation();
      });

      await test.step('Membership duration should be shown to the buyer', async () => {
        // Known bug M-07: duration is never shown to the buyer on product page
        await purchasePage.expectDiscordDurationShown();
      });

      await test.step('Creator viewing own membership cannot purchase it and sees Edit Product', async () => {
        const ownerContext = await browser.newContext({ viewport: page.viewportSize() });
        try {
          await loginWithToken(ownerContext, token, baseURL);
          const ownerPage = await ownerContext.newPage();
          const ownerView = new ProductPurchasePage(ownerPage, baseURL);
          await ownerView.gotoSharePath(sharePathMulti);
          await ownerView.expectOwnerEventView();
        } finally {
          await ownerContext.close();
        }
      });

      await test.step('Single-image product renders no carousel controls', async () => {
        await purchasePage.gotoSharePath(sharePathSingle);
        await purchasePage.expectSingleImageNoCarouselControls();
      });
    } finally {
      for (const uuid of productUuids) {
        await deleteProduct(page.request, uuid, token).catch(() => undefined);
      }
    }
  });
});
