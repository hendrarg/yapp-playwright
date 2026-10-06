import { creatorAuthTest as test, expect } from '../test-base';
import { baseURL } from '@config/env';
import { loginWithToken } from '@helpers/auth/token-login';
import { getAccount } from '@helpers/api/account';
import { createPost, deletePost, isPostPurchased, setLifetimePrice, waitForLifetimeOffer } from '@helpers/api/post';
import { createOnlineCourseProduct, deleteProduct } from '@helpers/api/product';
import { depositWebhook } from '@helpers/api/webhook';
import { FeedsPage } from '@pages/buyer/FeedsPage';
import { ProfilePage } from '@pages/buyer/ProfilePage';
import { TransactionPage } from '@pages/buyer/TransactionPage';
import { creatorFeedsLabels, generatePostData, testImages } from '@test-data/creator/post.data';
import { testAccounts } from '@test-data/users';

test.describe('E2E: exclusive pay-per-view content', () => {
  test('Unlock Exclusive PPV Content and Verify Access', {
    tag: ['@AUT-E2E-003', '@feeds', '@payment', '@creator', '@buyer', '@smoke'],
  }, async ({ creatorFeedsPage, dbFixtures, browser, page }) => {
    test.setTimeout(480000);
    // TC-FE-B-064 waits on clarification CL-AUT-020 (the buyer app now has /profile/settings).
    const creatorToken = process.env[testAccounts.creator.envVar]?.replace(/"/g, '');
    const buyerToken = process.env[testAccounts.qa.envVar]?.replace(/"/g, '');
    test.skip(!creatorToken || !buyerToken, 'Creator and buyer tokens are required');
    test.skip(process.env.YAPP_DB_FIXTURES !== '1', 'YAPP_DB_FIXTURES=1 is required to fail and revoke the lifetime purchase');
    if (!creatorToken || !buyerToken) return;

    const creator = testAccounts.creator;
    const buyer = testAccounts.qa;
    const minPrice = creatorFeedsLabels.minPrice;
    const higherPrice = minPrice + 15000;
    const stamp = Date.now();
    const atMinimum = `E2E PPV minimum ${stamp}`;
    const aboveMinimum = `E2E PPV above minimum ${stamp}`;
    const future = `E2E PPV after lifetime ${stamp}`;
    const linkedContent = `E2E linked product post ${stamp}`;
    const postIds: string[] = [];
    let linkedProductUuid = '';

    const buyerContext = await browser.newContext({ viewport: page.viewportSize() });
    await loginWithToken(buyerContext, buyerToken, baseURL);
    const buyerPage = await buyerContext.newPage();
    const buyerFeeds = new FeedsPage(buyerPage, baseURL);
    const buyerProfile = new ProfilePage(buyerPage, baseURL);
    const buyerTransaction = new TransactionPage(buyerPage, baseURL);
    const phone = `812${stamp.toString().slice(-9)}`;

    try {
      await test.step('The creator publishes a PPV post at the minimum price and one above it', async () => {
        postIds.push(await creatorFeedsPage.publishPost({ content: atMinimum, imagePath: testImages.claude, price: minPrice }));
        postIds.push(await creatorFeedsPage.publishPost({ content: aboveMinimum, imagePath: testImages.claude, price: higherPrice }));
      });

      await test.step('A non-buyer sees both posts locked on the creator profile and post detail', async () => {
        await buyerProfile.goto(creator.username);
        await buyerProfile.switchToTab('feeds');
        await buyerProfile.expectCreatorPostLocked(atMinimum);
        await buyerProfile.expectCreatorPostLocked(aboveMinimum);
        await buyerFeeds.gotoPost(postIds[0]);
        await buyerFeeds.expectLockedPostDetail();
        await buyerFeeds.openUnlockPreview(minPrice);
      });

      await test.step('Buying one post unlocks only that post', async () => {
        const orderId = await buyerFeeds.submitUnlockPayment(`Buyer ${stamp}`, phone);
        await depositWebhook(page.request, orderId);
        await expect.poll(() => isPostPurchased(page.request, postIds[0], buyerToken), { timeout: 20000 }).toBe(true);
        await buyerFeeds.gotoPost(postIds[0]);
        await buyerFeeds.expectUnlockedExclusivePost(atMinimum);
        expect(await isPostPurchased(page.request, postIds[1], buyerToken)).toBe(false);
        await buyerFeeds.gotoPost(postIds[1]);
        await buyerFeeds.expectLockedPostDetail();
      });

      await test.step('A failed Unlock All payment leaves the unpaid post locked', async () => {
        await setLifetimePrice(page.request, minPrice, creatorToken);
        await waitForLifetimeOffer(page.request, creator.username, true, buyerToken);
        await buyerProfile.goto(creator.username);
        await buyerProfile.switchToTab('feeds');
        await buyerProfile.openLifetimeCheckout('Rp10.000');
        const failedOrder = await buyerProfile.payLifetime(phone);
        await dbFixtures.failLifetimePayment(failedOrder);
        await buyerTransaction.reload();
        await buyerTransaction.expectPaymentFailed();
        expect(await isPostPurchased(page.request, postIds[1], buyerToken)).toBe(false);
        await buyerFeeds.gotoPost(postIds[1]);
        await buyerFeeds.expectLockedPostDetail();
      });

      await test.step('Buying Unlock All unlocks every existing exclusive post', async () => {
        await buyerProfile.goto(creator.username);
        await buyerProfile.switchToTab('feeds');
        const orderId = await buyerProfile.buyLifetime('Rp10.000', phone);
        await depositWebhook(page.request, orderId);
        await buyerTransaction.expectLifetimePaymentSuccess(creator.username);
        await expect.poll(() => isPostPurchased(page.request, postIds[1], buyerToken), { timeout: 20000 }).toBe(true);
        for (const [i, content] of [atMinimum, aboveMinimum].entries()) {
          await buyerFeeds.gotoPost(postIds[i]);
          await buyerFeeds.expectUnlockedExclusivePost(content);
        }
      });

      await test.step('A PPV post published after the lifetime purchase opens without paying again', async () => {
        postIds.push(await creatorFeedsPage.publishPost({ content: future, imagePath: testImages.claude, price: higherPrice }));
        await expect.poll(() => isPostPurchased(page.request, postIds[2], buyerToken), { timeout: 20000 }).toBe(true);
        await buyerFeeds.gotoPost(postIds[2]);
        await buyerFeeds.expectUnlockedExclusivePost(future);
      });

      await test.step('A post whose linked product was deleted still loads without the product', async () => {
        const productTitle = `E2E deleted product ${stamp}`;
        linkedProductUuid = (await createOnlineCourseProduct(page.request, { title: productTitle, description: 'Linked then deleted', thumbnailImagePath: testImages.claude, price: 15000 }, creatorToken)).productUuid;
        postIds.push((await createPost(page.request, { ...generatePostData({ content: linkedContent, visibility: 'public' }), productUuids: [linkedProductUuid] }, creatorToken)).postId);
        await deleteProduct(page.request, linkedProductUuid, creatorToken);
        linkedProductUuid = '';
        await buyerFeeds.gotoPost(postIds[3]);
        await buyerFeeds.expectPostBodyVisible(linkedContent);
        await buyerFeeds.expectLinkedProductHidden(productTitle);
      });

      await test.step('The buyer profile shows the identity and the way into account settings', async () => {
        const account = await getAccount(page.request, buyerToken);
        await buyerProfile.goto();
        await buyerProfile.expectOwnProfileIdentity(account.name);
        await buyerProfile.openAccountSettings();
        await expect(buyerPage).toHaveURL(/\/profile\/settings/);
      });
    } finally {
      await dbFixtures.retireLifetimePurchases(buyer.uuid, creator.uuid);
      await setLifetimePrice(page.request, 0, creatorToken);
      for (const id of postIds) await deletePost(page.request, id, creatorToken).catch(() => undefined);
      if (linkedProductUuid) await deleteProduct(page.request, linkedProductUuid, creatorToken).catch(() => undefined);
      await buyerContext.close();
    }
  });
});
