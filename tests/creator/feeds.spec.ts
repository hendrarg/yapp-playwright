import { creatorAuthTest as test, expect } from '../test-base';
import { baseURL } from '@config/env';
import { loginWithToken } from '@helpers/auth/token-login';
import { createPost, deletePost, isPostPurchased, setLifetimePrice, waitForLifetimeOffer } from '@helpers/api/post';
import { createOnlineCourseProduct, deleteProduct } from '@helpers/api/product';
import { depositWebhook } from '@helpers/api/webhook';
import { FeedsPage as BuyerFeedsPage } from '@pages/buyer/FeedsPage';
import { ProfilePage } from '@pages/buyer/ProfilePage';
import { TransactionPage } from '@pages/buyer/TransactionPage';
import { creatorFeedsLabels, generatePostData, testImages } from '@test-data/creator/post.data';
import { testAccounts } from '@test-data/users';

const token = (envVar: string) => process.env[envVar]?.replace(/"/g, '');
const rupiah = (n: number) => `Rp${new Intl.NumberFormat('id-ID').format(n)}`;
const minPrice = creatorFeedsLabels.minPrice;

test.describe('Creator Feeds', () => {
  test('injected "at" token loads the feeds page without redirecting to auth', { tag: ['@feeds', '@creator', '@smoke'] }, async ({ creatorNav }) => {
    await creatorNav.open('feeds');
  });

  test('Feeds and Exclusive — Pay per view Price, Exclusive Toggle, Exclusive Publish, Preview Teaser, Linked Products, Unlock All Configuration, Edit Exclusive Description, Edit PPV Price', {
    tag: ['@AUT-FE-002', '@feeds', '@creator', '@smoke'],
  }, async ({ creatorFeedsPage, browser, page }) => {
    test.setTimeout(300000);
    // The TCs still quote a Rp20.000 floor; the app enforces Rp10.000 (clarification CL-AUT-023).
    const creatorToken = token(testAccounts.creator.envVar);
    test.skip(!creatorToken, 'Creator token is required');
    if (!creatorToken) return;

    const stamp = Date.now();
    const teaser = `Exclusive teaser ${stamp}`;
    const productTitle = `Exclusive linked product ${stamp}`;
    const edited = `${teaser} edited`;
    const postIds: string[] = [];
    let productUuid = '';
    const guestContext = await browser.newContext({ viewport: page.viewportSize() });
    const guestPage = await guestContext.newPage();
    const guestFeeds = new BuyerFeedsPage(guestPage, baseURL);
    const guestProfile = new ProfilePage(guestPage, baseURL);

    try {
      await test.step('Pay per view with the price left at Rp0 is not published and the creator is told why', async () => {
        await creatorFeedsPage.goto();
        await creatorFeedsPage.openComposer();
        await creatorFeedsPage.fillComposer(`Rp0 attempt ${stamp}`);
        await creatorFeedsPage.choosePayPerView();
        await creatorFeedsPage.dismissPriceDialog();
        await creatorFeedsPage.expectZeroPricePublishBlocked();
      });

      await test.step('Pay per view exposes a mandatory price whose Confirm only accepts the minimum and up', async () => {
        await creatorFeedsPage.goto();
        await creatorFeedsPage.openComposer();
        await creatorFeedsPage.choosePayPerView();
        await creatorFeedsPage.expectMinimumPriceHint();
        for (const [raw, enabled] of [['', false], ['1', false], ['5000', false], [String(minPrice - 1), false], [String(minPrice), true], ['25000', true]] as const) {
          expect((await creatorFeedsPage.typedPriceValue(raw)).enabled, `Confirm at "${raw}"`).toBe(enabled);
        }
      });

      await test.step('An exclusive post with a teaser body, an image and a linked product is published', async () => {
        productUuid = (await createOnlineCourseProduct(page.request, { title: productTitle, description: 'Linked to an exclusive post', thumbnailImagePath: testImages.claude, price: 15000 }, creatorToken)).productUuid;
        postIds.push(await creatorFeedsPage.publishPost({ content: teaser, imagePath: testImages.claude, price: minPrice, productTitles: [productTitle] }));
      });

      await test.step('A non-buyer sees it locked on the public profile, with the teaser and the product but not the media', async () => {
        await guestProfile.goto(testAccounts.creator.username);
        await guestProfile.switchToTab('feeds');
        await guestProfile.expectCreatorPostLocked(teaser);
        await guestFeeds.gotoPost(postIds[0]);
        await guestFeeds.expectLockedPostDetail({ signedIn: false });
        await guestFeeds.expectPostBodyVisible(teaser);
        await guestFeeds.expectLinkedProduct(productTitle, /Rp15[.,]000/);
      });

      await test.step('The Unlock All (lifetime) pricing configuration is offered', async () => {
        await creatorFeedsPage.openLifetimeConfiguration();
        await creatorFeedsPage.setLifetimeSwitch(true);
        await creatorFeedsPage.expectLifetimePriceAvailable();
      });

      await test.step('Editing the description and the price updates what future buyers see', async () => {
        await creatorFeedsPage.editPost(teaser, { content: edited, price: 25000 });
        await guestFeeds.gotoPost(postIds[0]);
        await guestFeeds.expectPostBodyVisible(edited);
        await guestFeeds.expectLockedPostDetail({ signedIn: false });
        await guestFeeds.openUnlockPreview(25000);
      });
    } finally {
      for (const id of postIds) await deletePost(page.request, id, creatorToken).catch(() => undefined);
      if (productUuid) await deleteProduct(page.request, productUuid, creatorToken).catch(() => undefined);
      await guestContext.close();
    }
  });

  test('Feeds and Exclusive — PPV Pricing, PPV Price Validation, Pay per view Price (negative & boundary)', {
    tag: ['@AUT-FE-006', '@feeds', '@creator', '@regression'],
    annotation: { type: 'issue', description: 'M-11' },
  }, async ({ creatorFeedsPage, page }) => {
    test.setTimeout(240000);
    // Known bug M-11: the server accepts any PPV price; the last step checks it and fails until fixed.
    test.fail(true, 'M-11: the PPV price floor is only enforced by the client');
    const creatorToken = token(testAccounts.creator.envVar);
    test.skip(!creatorToken, 'Creator token is required');
    if (!creatorToken) return;
    const stamp = Date.now();
    const postIds: string[] = [];

    try {
      await test.step('A PPV post publishes at exactly the minimum price', async () => {
        postIds.push(await creatorFeedsPage.publishPost({ content: `PPV at minimum ${stamp}`, imagePath: testImages.claude, price: minPrice }));
      });

      await test.step('A PPV post publishes above the minimum with the entered price', async () => {
        postIds.push(await creatorFeedsPage.publishPost({ content: `PPV above minimum ${stamp}`, imagePath: testImages.claude, price: 37500 }));
      });

      await test.step('Empty, zero, negative, below-minimum and non-numeric prices cannot be confirmed', async () => {
        await creatorFeedsPage.goto();
        await creatorFeedsPage.openComposer();
        await creatorFeedsPage.choosePayPerView();
        await creatorFeedsPage.expectMinimumPriceHint();
        for (const raw of ['', '0', '-5000', String(minPrice - 1)]) {
          expect((await creatorFeedsPage.typedPriceValue(raw)).enabled, `Confirm at "${raw}"`).toBe(false);
        }
        expect((await creatorFeedsPage.typedPriceValue('abc')).value, 'letters are dropped').toBe('');
        const mixed = await creatorFeedsPage.typedPriceValue('1a2b345');
        expect(mixed.value.replace(/\D/g, ''), 'only the digits are kept').toBe('12345');
      });

      await test.step('The server also refuses PPV prices below the minimum', async () => {
        for (const price of [0, 5000]) {
          const { postId } = await createPost(page.request, { ...generatePostData({ content: `Server floor ${price} ${stamp}`, visibility: 'pay_per_view' }), price }, creatorToken)
            .catch((e: Error) => ({ postId: '', error: e }));
          if (postId) postIds.push(postId);
          expect(postId, `POST with price ${price} should be rejected`).toBe('');
        }
      });
    } finally {
      for (const id of postIds) await deletePost(page.request, id, creatorToken).catch(() => undefined);
    }
  });

  test('Feeds and Exclusive — Unlock All Configuration, Save Configuration, Edit Lifetime Price, Preserve Existing Buyers, Disable Unlock All, Individual PPV Availability, Single Purchase Entitlement, Lifetime Entitlement', {
    tag: ['@AUT-FE-008', '@feeds', '@creator', '@payment', '@regression'],
  }, async ({ creatorFeedsPage, dbFixtures, browser, page }) => {
    test.setTimeout(480000);
    const creatorToken = token(testAccounts.creator.envVar);
    const buyerToken = token(testAccounts.qa.envVar);
    const otherBuyerToken = token(testAccounts.sundanese.envVar);
    test.skip(!creatorToken || !buyerToken || !otherBuyerToken, 'Creator, buyer and second-account tokens are required');
    test.skip(process.env.YAPP_DB_FIXTURES !== '1', 'YAPP_DB_FIXTURES=1 is required to revoke the lifetime purchase');
    if (!creatorToken || !buyerToken || !otherBuyerToken) return;

    const creator = testAccounts.creator;
    const stamp = Date.now();
    const posts = [1, 2].map((n) => `Unlock All config ${n} ${stamp}`);
    const postIds: string[] = [];
    const firstPrice = 15000;
    const secondPrice = 20000;
    const phone = `812${stamp.toString().slice(-9)}`;

    const buyerContext = await browser.newContext({ viewport: page.viewportSize() });
    await loginWithToken(buyerContext, buyerToken, baseURL);
    const buyerPage = await buyerContext.newPage();
    const buyerFeeds = new BuyerFeedsPage(buyerPage, baseURL);
    const buyerProfile = new ProfilePage(buyerPage, baseURL);
    const buyerTransaction = new TransactionPage(buyerPage, baseURL);
    // A second account that never buys: it stands for "future buyers".
    const otherContext = await browser.newContext({ viewport: page.viewportSize() });
    await loginWithToken(otherContext, otherBuyerToken, baseURL);
    const otherPage = await otherContext.newPage();
    const otherFeeds = new BuyerFeedsPage(otherPage, baseURL);
    const otherProfile = new ProfilePage(otherPage, baseURL);

    try {
      await test.step('Seed two image pay-per-view posts', async () => {
        for (const content of posts) postIds.push((await createPost(page.request, { ...generatePostData({ content, visibility: 'pay_per_view' }), price: minPrice, imagePath: testImages.claude }, creatorToken)).postId);
      });

      await test.step('Turning Unlock All on makes the lifetime price field available', async () => {
        await creatorFeedsPage.openLifetimeConfiguration();
        await creatorFeedsPage.setLifetimeSwitch(true);
        await creatorFeedsPage.expectLifetimePriceAvailable();
      });

      await test.step('A saved lifetime price is offered to buyers', async () => {
        await creatorFeedsPage.setLifetimeSwitch(true);
        expect((await creatorFeedsPage.lifetimePriceAccepted(String(firstPrice))).enabled).toBe(true);
        expect(await creatorFeedsPage.saveLifetime()).toBe(firstPrice);
        await waitForLifetimeOffer(page.request, creator.username, true, buyerToken);
        await buyerProfile.goto(creator.username);
        await buyerProfile.switchToTab('feeds');
        await buyerProfile.openLifetimeCheckout(rupiah(firstPrice));
      });

      await test.step('A single PPV purchase unlocks only that post', async () => {
        await buyerFeeds.gotoPost(postIds[0]);
        await buyerFeeds.expectLockedPostDetail();
        await buyerFeeds.openUnlockPreview(minPrice);
        const orderId = await buyerFeeds.submitUnlockPayment(`Buyer ${stamp}`, phone);
        await depositWebhook(page.request, orderId);
        await expect.poll(() => isPostPurchased(page.request, postIds[0], buyerToken), { timeout: 20000 }).toBe(true);
        expect(await isPostPurchased(page.request, postIds[1], buyerToken)).toBe(false);
        await buyerFeeds.gotoPost(postIds[1]);
        await buyerFeeds.expectLockedPostDetail();
      });

      await test.step('An Unlock All purchase unlocks every exclusive post', async () => {
        await buyerProfile.goto(creator.username);
        await buyerProfile.switchToTab('feeds');
        const orderId = await buyerProfile.buyLifetime(rupiah(firstPrice), phone);
        await depositWebhook(page.request, orderId);
        await buyerTransaction.expectLifetimePaymentSuccess(creator.username);
        await expect.poll(() => isPostPurchased(page.request, postIds[1], buyerToken), { timeout: 20000 }).toBe(true);
        for (const [i, content] of posts.entries()) {
          await buyerFeeds.gotoPost(postIds[i]);
          await buyerFeeds.expectUnlockedExclusivePost(content);
        }
      });

      await test.step('A new lifetime price applies to future buyers', async () => {
        expect(await creatorFeedsPage.configureLifetime(secondPrice)).toBe(secondPrice);
        // Buyers are served the old price for about a minute after a change.
        await expect(async () => {
          await otherProfile.goto(creator.username);
          await otherProfile.switchToTab('feeds');
          await otherProfile.openLifetimeCheckout(rupiah(secondPrice));
        }).toPass({ timeout: 150000, intervals: [10000] });
      });

      await test.step('The earlier lifetime buyer keeps full access after the price change', async () => {
        for (const [i, content] of posts.entries()) {
          await buyerFeeds.gotoPost(postIds[i]);
          await buyerFeeds.expectUnlockedExclusivePost(content);
        }
      });

      await test.step('Turning Unlock All off hides the offer and single posts stay purchasable', async () => {
        expect(await creatorFeedsPage.configureLifetime(null)).toBe(0);
        await waitForLifetimeOffer(page.request, creator.username, false, otherBuyerToken);
        await otherProfile.goto(creator.username);
        await otherProfile.switchToTab('feeds');
        await otherProfile.expectNoLifetimeOffer();
        await otherProfile.expectCreatorPostLocked(posts[0]);
        await otherFeeds.gotoPost(postIds[0]);
        await otherFeeds.expectLockedPostDetail();
        await otherFeeds.openUnlockPreview(minPrice);
      });
    } finally {
      await dbFixtures.retireLifetimePurchases(testAccounts.qa.uuid, creator.uuid);
      await setLifetimePrice(page.request, 0, creatorToken);
      for (const id of postIds) await deletePost(page.request, id, creatorToken).catch(() => undefined);
      await buyerContext.close();
      await otherContext.close();
    }
  });

  test('Feeds and Exclusive — Lifetime Price Validation, Future Content Entitlement, Exclusive Empty State, Shop Empty State', {
    tag: ['@AUT-FE-009', '@feeds', '@creator', '@regression'],
  }, async ({ creatorFeedsPage, dbFixtures, browser, page }) => {
    test.setTimeout(360000);
    // C-064 / C-067 (empty states) and C-080 (Rp20.000 floor) wait on clarification (CL-AUT-026..028).
    const creatorToken = token(testAccounts.creator.envVar);
    const buyerToken = token(testAccounts.qa.envVar);
    test.skip(!creatorToken || !buyerToken, 'Creator and buyer tokens are required');
    test.skip(process.env.YAPP_DB_FIXTURES !== '1', 'YAPP_DB_FIXTURES=1 is required to revoke the lifetime purchase');
    if (!creatorToken || !buyerToken) return;

    const creator = testAccounts.creator;
    const stamp = Date.now();
    const postIds: string[] = [];
    const buyerContext = await browser.newContext({ viewport: page.viewportSize() });
    await loginWithToken(buyerContext, buyerToken, baseURL);
    const buyerPage = await buyerContext.newPage();
    const buyerFeeds = new BuyerFeedsPage(buyerPage, baseURL);
    const buyerProfile = new ProfilePage(buyerPage, baseURL);
    const buyerTransaction = new TransactionPage(buyerPage, baseURL);

    try {
      await test.step('The lifetime price is accepted at exactly the minimum and saved', async () => {
        expect(await creatorFeedsPage.configureLifetime(minPrice)).toBe(minPrice);
      });

      await test.step('A numeric lifetime price above the minimum is saved', async () => {
        expect(await creatorFeedsPage.configureLifetime(27500)).toBe(27500);
      });

      await test.step('Empty, zero, negative and below-minimum prices cannot be saved and the saved price stays', async () => {
        await creatorFeedsPage.openLifetimeConfiguration();
        await creatorFeedsPage.setLifetimeSwitch(true);
        for (const raw of ['', '0', '-5000', String(minPrice - 1)]) {
          expect((await creatorFeedsPage.lifetimePriceAccepted(raw)).enabled, `Save at "${raw}"`).toBe(false);
        }
        await page.keyboard.press('Escape');
        await creatorFeedsPage.openLifetimeConfiguration();
        await creatorFeedsPage.expectSavedLifetimePrice(/27[.,]500/);
      });

      await test.step('Non-numeric characters are dropped from the lifetime price', async () => {
        await creatorFeedsPage.setLifetimeSwitch(true);
        expect((await creatorFeedsPage.lifetimePriceAccepted('abc')).value).toBe('');
        const mixed = await creatorFeedsPage.lifetimePriceAccepted('1a2b345');
        expect(mixed.value.replace(/\D/g, '')).toBe('12345');
        await page.keyboard.press('Escape');
      });

      await test.step('A lifetime buyer gets an exclusive post published afterwards without paying again', async () => {
        expect(await creatorFeedsPage.configureLifetime(minPrice)).toBe(minPrice);
        await waitForLifetimeOffer(page.request, creator.username, true, buyerToken);
        await buyerProfile.goto(creator.username);
        await buyerProfile.switchToTab('feeds');
        const orderId = await buyerProfile.buyLifetime(rupiah(minPrice), `812${stamp.toString().slice(-9)}`);
        await depositWebhook(page.request, orderId);
        await buyerTransaction.expectLifetimePaymentSuccess(creator.username);
        const later = `Published after lifetime ${stamp}`;
        postIds.push(await creatorFeedsPage.publishPost({ content: later, imagePath: testImages.claude, price: 30000 }));
        await expect.poll(() => isPostPurchased(page.request, postIds[0], buyerToken), { timeout: 20000 }).toBe(true);
        await buyerFeeds.gotoPost(postIds[0]);
        await buyerFeeds.expectUnlockedExclusivePost(later);
      });
    } finally {
      await dbFixtures.retireLifetimePurchases(testAccounts.qa.uuid, creator.uuid);
      await setLifetimePrice(page.request, 0, creatorToken);
      for (const id of postIds) await deletePost(page.request, id, creatorToken).catch(() => undefined);
      await buyerContext.close();
    }
  });
});
