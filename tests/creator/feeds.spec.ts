import { creatorAuthTest as test, expect } from '../test-base';
import { baseURL, creatorsBaseURL } from '@config/env';
import { loginWithToken } from '@helpers/auth/token-login';
import { createComment, createPost, deletePost, getMyPosts, getPost, getPostEngagement, getPublicPostIds, isPostPurchased, likePost, pinPost, setLifetimePrice, unpinPost, waitForLifetimeOffer } from '@helpers/api/post';
import { createOnlineCourseProduct, deleteProduct } from '@helpers/api/product';
import { depositWebhook } from '@helpers/api/webhook';
import { FeedsPage as BuyerFeedsPage } from '@pages/buyer/FeedsPage';
import { ProfilePage } from '@pages/buyer/ProfilePage';
import { TransactionPage } from '@pages/buyer/TransactionPage';
import { FeedsPage as CreatorFeedsPage } from '@pages/creator/FeedsPage';
import { creatorFeedsLabels, generateLinkedProductTitle, generatePostContent, generatePostData, scheduleTimeAhead, testImages } from '@test-data/creator/post.data';
import { testAccounts } from '@test-data/users';

const token = (envVar: string) => process.env[envVar]?.replace(/"/g, '');
const rupiah = (n: number) => `Rp${new Intl.NumberFormat('id-ID').format(n)}`;
const minPrice = creatorFeedsLabels.minPrice;
const menu = creatorFeedsLabels.menu;

/**
 * One pinned post per creator: remember whichever post the account had pinned, free the slot for the test,
 * and hand back a restore for `finally`.
 */
async function takeOverPin(request: Parameters<typeof getMyPosts>[0], accountToken: string) {
  const before = (await getMyPosts(request, 'published', accountToken)).find((p) => p.isPinned);
  if (before) await unpinPost(request, before.uuid, accountToken);
  return async () => {
    const now = (await getMyPosts(request, 'published', accountToken)).find((p) => p.isPinned);
    if (now && now.uuid !== before?.uuid) await unpinPost(request, now.uuid, accountToken).catch(() => undefined);
    if (before) await pinPost(request, before.uuid, true, accountToken);
  };
}

test.describe('Creator Feeds', () => {
  test('injected "at" token loads the feeds page without redirecting to auth', { tag: ['@feeds', '@creator', '@smoke'] }, async ({ creatorNav }) => {
    await creatorNav.open('feeds');
  });

  test('Feeds and Exclusive — Create Public Post, Optional Media, Optional Category, Linked Products, Successful Publish, Buyer Visibility, Save Draft', {
    tag: ['@AUT-FE-001', '@feeds', '@creator', '@regression'],
  }, async ({ creatorFeedsPage, browser, page }) => {
    test.setTimeout(300000);
    // TC-FE-C-004 (optional category) is not automated: the composer has no category control (CL-AUT-051).
    const creatorToken = token(testAccounts.creator.envVar);
    const buyerToken = token(testAccounts.qa.envVar);
    test.skip(!creatorToken || !buyerToken, 'Creator and buyer tokens are required');
    if (!creatorToken || !buyerToken) return;

    const [withImage, textOnly, withProduct, draft] = [1, 2, 3, 4].map(() => generatePostContent());
    const productTitle = generateLinkedProductTitle();
    const postIds: string[] = [];
    let productUuid = '';
    const buyerContext = await browser.newContext({ viewport: page.viewportSize() });
    await loginWithToken(buyerContext, buyerToken, baseURL);
    const buyerPage = await buyerContext.newPage();
    const buyerFeeds = new BuyerFeedsPage(buyerPage, baseURL);
    const buyerProfile = new ProfilePage(buyerPage, baseURL);

    try {
      await test.step('Post stays disabled on an empty composer, enables with content, and publishes', async () => {
        await creatorFeedsPage.goto();
        await creatorFeedsPage.openComposer();
        await creatorFeedsPage.expectPublishEnabled(false);
        await creatorFeedsPage.fillComposer(withImage);
        await creatorFeedsPage.expectPublishEnabled(true);
        postIds.push(await creatorFeedsPage.publishPost({ content: withImage, imagePath: testImages.claude }));
      });

      await test.step('A text-only post publishes without any media', async () => {
        postIds.push(await creatorFeedsPage.publishPost({ content: textOnly }));
        expect((await getPost(page.request, postIds[1], creatorToken)).data?.assets ?? []).toHaveLength(0);
      });

      await test.step('A post with a linked product publishes and buyers see the product', async () => {
        productUuid = (await createOnlineCourseProduct(page.request, { title: productTitle, description: generatePostContent(), thumbnailImagePath: testImages.claude, price: 15000 }, creatorToken)).productUuid;
        postIds.push(await creatorFeedsPage.publishPost({ content: withProduct, productTitles: [productTitle] }));
        await buyerFeeds.gotoPost(postIds[2]);
        await buyerFeeds.expectLinkedProduct(productTitle, /Rp15[.,]000/);
      });

      await test.step('A published post is listed under Published straight away', async () => {
        await creatorFeedsPage.goto();
        await creatorFeedsPage.expectPostListed(withImage);
      });

      await test.step('Buyers see the published post with its text and media on the creator profile', async () => {
        await buyerProfile.goto(testAccounts.creator.username);
        await buyerProfile.switchToTab('feeds');
        await buyerProfile.expectCreatorPostVisible(withImage);
        await buyerProfile.expectCreatorPostMediaCount(withImage, 1);
      });

      await test.step('Closing the composer with content offers Save to Draft and keeps it in Drafts', async () => {
        await creatorFeedsPage.goto();
        await creatorFeedsPage.openComposer();
        await creatorFeedsPage.fillComposer(draft);
        postIds.push(await creatorFeedsPage.closeComposerAsDraft());
        await creatorFeedsPage.expectPostListed(draft, 'draft');
      });

      await test.step('The composer takes BMP, SVG and video, several files, unlimited text, and has no title field', async () => {
        await creatorFeedsPage.goto();
        await creatorFeedsPage.openComposer();
        const composer = await creatorFeedsPage.composerConstraints();
        expect(composer.accept).toBe(creatorFeedsLabels.composerMediaAccept);
        expect(composer.multiple).toBe(true);
        expect(composer.maxLength).toBeNull();
        expect(composer.titleField).toBe(0);
        await creatorFeedsPage.expectPublishEnabled(false);
      });
    } finally {
      for (const id of postIds) await deletePost(page.request, id, creatorToken).catch(() => undefined);
      if (productUuid) await deleteProduct(page.request, productUuid, creatorToken).catch(() => undefined);
      await buyerContext.close();
    }
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

  test('Feeds and Exclusive — Draft Visibility, Resume Draft, Schedule Post, Auto Publish, Edit Schedule, Edit Content, Edit Media', {
    tag: ['@AUT-FE-004', '@feeds', '@creator', '@regression'],
    annotation: { type: 'issue', description: 'F&E-10' },
  }, async ({ creatorFeedsPage, browser, page }) => {
    test.setTimeout(900000);
    // Known bug L-15 (F&E-10): the Scheduled tab card says "Posted on" for a post not yet out. Last step.
    test.fail(true, 'L-15: Scheduled tab card reads "Posted on" for an upcoming post');
    const creatorToken = token(testAccounts.creator.envVar);
    const buyerToken = token(testAccounts.qa.envVar);
    test.skip(!creatorToken || !buyerToken, 'Creator and buyer tokens are required');
    if (!creatorToken || !buyerToken) return;

    const [draft, scheduled, rescheduled, published, edited, singleMedia, gallery, upcoming] = [1, 2, 3, 4, 5, 6, 7, 8].map(() => generatePostContent());
    const productTitle = generateLinkedProductTitle();
    const postIds: string[] = [];
    let productUuid = '';
    const buyerContext = await browser.newContext({ viewport: page.viewportSize() });
    await loginWithToken(buyerContext, buyerToken, baseURL);
    const buyerPage = await buyerContext.newPage();
    const buyerFeeds = new BuyerFeedsPage(buyerPage, baseURL);
    const buyerProfile = new ProfilePage(buyerPage, baseURL);
    const isListed = async (type: 'published' | 'scheduled', id: string) => (await getMyPosts(page.request, type, creatorToken)).some((p) => p.uuid === id);
    let firstAt = new Date();
    let movedFrom = new Date();
    let movedTo = new Date();
    let scheduledId = '';
    let rescheduledId = '';

    try {
      const publishedId = (await createPost(page.request, { content: published, visibility: 'public' }, creatorToken)).postId;
      postIds.push(publishedId);

      await test.step('A saved draft is not exposed to buyers', async () => {
        productUuid = (await createOnlineCourseProduct(page.request, { title: productTitle, description: generatePostContent(), thumbnailImagePath: testImages.claude, price: 15000 }, creatorToken)).productUuid;
        const draftId = await creatorFeedsPage.saveDraft({ content: draft, imagePath: testImages.claude, productTitles: [productTitle] });
        postIds.push(draftId);
        // The profile Feeds tab renders this list; the shared account gets new posts from other runs, so read it, not the page position.
        const publicIds = await getPublicPostIds(page.request, testAccounts.creator.uuid, buyerToken);
        expect(publicIds).toContain(publishedId);
        expect(publicIds).not.toContain(draftId);
        await buyerFeeds.gotoPost(draftId);
        await buyerProfile.expectTextAbsent(draft);
      });

      await test.step('Resuming the draft brings back its text, image and linked product', async () => {
        await creatorFeedsPage.resumeDraft(draft);
        await creatorFeedsPage.expectResumedDraft(draft, productTitle, 1);
      });

      await test.step('A post scheduled for a future time waits under Scheduled with that time', async () => {
        firstAt = scheduleTimeAhead(3);
        const result = await creatorFeedsPage.schedulePost(scheduled, firstAt);
        scheduledId = result.uuid;
        postIds.push(scheduledId);
        expect(new Date(result.scheduledAt).getTime()).toBe(firstAt.getTime());
        await creatorFeedsPage.expectPostListed(scheduled, 'scheduled');
        expect(await isListed('published', scheduledId)).toBe(false);
      });

      await test.step('A scheduled post can be moved to a later time', async () => {
        movedFrom = scheduleTimeAhead(3);
        movedTo = scheduleTimeAhead(6);
        rescheduledId = (await createPost(page.request, { content: rescheduled, visibility: 'public', scheduledAt: movedFrom.toISOString() }, creatorToken)).postId;
        postIds.push(rescheduledId);
        const saved = await creatorFeedsPage.reschedulePost(rescheduled, movedTo);
        expect(new Date(saved).getTime()).toBe(movedTo.getTime());
      });

      await test.step('Editing the text of a published post shows the new text to buyers', async () => {
        await creatorFeedsPage.editPost(published, { content: edited });
        await buyerFeeds.gotoPost(publishedId);
        await buyerFeeds.expectPostBodyVisible(edited);
      });

      await test.step('Replacing the media of a post serves the new file', async () => {
        const { postId } = await createPost(page.request, { content: singleMedia, visibility: 'public', imagePath: testImages.gallery1 }, creatorToken);
        postIds.push(postId);
        const before = (await getPost(page.request, postId, creatorToken)).data?.assets.map((a) => a.uuid) ?? [];
        await creatorFeedsPage.editPostMedia(singleMedia, { remove: 1, add: [testImages.gallery2] });
        const after = (await getPost(page.request, postId, creatorToken)).data?.assets.map((a) => a.uuid) ?? [];
        expect(after).toHaveLength(1);
        expect(after[0]).not.toBe(before[0]);
        await buyerFeeds.gotoPost(postId);
        await buyerFeeds.expectPostBodyVisible(singleMedia);
        await buyerFeeds.expectPostMediaCount(1);
      });

      await test.step('Removing one image of a three-image post keeps the other two', async () => {
        const { postId } = await createPost(page.request, { content: gallery, visibility: 'public', imagePaths: [testImages.gallery1, testImages.gallery2, testImages.gallery3] }, creatorToken);
        postIds.push(postId);
        await creatorFeedsPage.editPostMedia(gallery, { remove: 1 });
        expect((await getPost(page.request, postId, creatorToken)).data?.assets ?? []).toHaveLength(2);
        await buyerFeeds.gotoPost(postId);
        await buyerFeeds.expectPostBodyVisible(gallery);
        await buyerFeeds.expectPostMediaCount(2);
      });

      await test.step('The scheduled post publishes by itself and buyers see it', async () => {
        await expect.poll(() => isListed('published', scheduledId), { timeout: Math.max(firstAt.getTime() - Date.now(), 0) + 180000, intervals: [15000] }).toBe(true);
        expect(await isListed('scheduled', scheduledId)).toBe(false);
        expect(await getPublicPostIds(page.request, testAccounts.creator.uuid, buyerToken)).toContain(scheduledId);
        await buyerFeeds.gotoPost(scheduledId);
        await buyerFeeds.expectPostBodyVisible(scheduled);
      });

      await test.step('The old time no longer fires; the post publishes at the new time', async () => {
        // Give the replaced time a full minute to (wrongly) fire before checking it did not.
        await new Promise((resolve) => setTimeout(resolve, Math.max(movedFrom.getTime() + 60000 - Date.now(), 0)));
        expect(await isListed('scheduled', rescheduledId)).toBe(true);
        expect(await isListed('published', rescheduledId)).toBe(false);
        await expect.poll(() => isListed('published', rescheduledId), { timeout: Math.max(movedTo.getTime() - Date.now(), 0) + 180000, intervals: [15000] }).toBe(true);
      });

      await test.step('The Scheduled tab names the upcoming time with "Posting on" (L-15)', async () => {
        const at = scheduleTimeAhead(60);
        postIds.push((await createPost(page.request, { content: upcoming, visibility: 'public', scheduledAt: at.toISOString() }, creatorToken)).postId);
        await creatorFeedsPage.expectScheduledCardLabel(upcoming, at);
      });
    } finally {
      for (const id of postIds) await deletePost(page.request, id, creatorToken).catch(() => undefined);
      if (productUuid) await deleteProduct(page.request, productUuid, creatorToken).catch(() => undefined);
      await buyerContext.close();
    }
  });

  test('Feeds and Exclusive — Update Linked Products, Engagement Retention, Delete Post, View Engagement, Engagement Freshness', {
    tag: ['@AUT-FE-005', '@feeds', '@creator', '@regression'],
  }, async ({ creatorFeedsPage, browser, page }) => {
    test.setTimeout(300000);
    // TC-FE-C-026 (metrics refresh within five seconds) is Blocked in Automation Mapping and not covered here.
    const creatorToken = token(testAccounts.creator.envVar);
    const buyerToken = token(testAccounts.qa.envVar);
    test.skip(!creatorToken || !buyerToken, 'Creator and buyer tokens are required');
    if (!creatorToken || !buyerToken) return;

    const [content, edited, anchor] = [1, 2, 3].map(() => generatePostContent());
    const productTitle = generateLinkedProductTitle();
    let postId = '';
    let anchorId = '';
    let productUuid = '';
    const buyerContext = await browser.newContext({ viewport: page.viewportSize() });
    await loginWithToken(buyerContext, buyerToken, baseURL);
    const buyerPage = await buyerContext.newPage();
    const buyerFeeds = new BuyerFeedsPage(buyerPage, baseURL);
    const buyerProfile = new ProfilePage(buyerPage, baseURL);

    try {
      productUuid = (await createOnlineCourseProduct(page.request, { title: productTitle, description: generatePostContent(), thumbnailImagePath: testImages.claude, price: 15000 }, creatorToken)).productUuid;
      anchorId = (await createPost(page.request, { content: anchor, visibility: 'public' }, creatorToken)).postId;
      postId = (await createPost(page.request, { content, visibility: 'public' }, creatorToken)).postId;

      await test.step('A product linked after publication shows on the same post, with no duplicate', async () => {
        await creatorFeedsPage.editPostProducts(content, { add: [productTitle] });
        expect((await getPost(page.request, postId, creatorToken)).data?.products.map((p) => p.uuid)).toEqual([productUuid]);
        expect((await getMyPosts(page.request, 'published', creatorToken)).filter((p) => p.content === content)).toHaveLength(1);
        await buyerFeeds.gotoPost(postId);
        await buyerFeeds.expectLinkedProduct(productTitle, /Rp15[.,]000/);
      });

      await test.step('Removing the linked product keeps the post and its text', async () => {
        await creatorFeedsPage.editPostProducts(content, { remove: [productTitle] });
        expect((await getPost(page.request, postId, creatorToken)).data?.products ?? []).toHaveLength(0);
        await buyerFeeds.gotoPost(postId);
        await buyerFeeds.expectNoLinkedProducts(content);
      });

      await test.step('Editing the post keeps its likes and comments', async () => {
        await likePost(page.request, postId, buyerToken);
        await createComment(page.request, postId, generatePostContent(), buyerToken);
        const before = await getPostEngagement(page.request, postId, creatorToken);
        expect(before).toMatchObject({ likeCount: 1, commentCount: 1 });
        await creatorFeedsPage.editPost(content, { content: edited });
        const after = await getPostEngagement(page.request, postId, creatorToken);
        expect({ likes: after.likeCount, comments: after.commentCount }).toEqual({ likes: before.likeCount, comments: before.commentCount });
      });

      await test.step('Insights shows the views, likes and comments the post has', async () => {
        await creatorFeedsPage.goto();
        const insights = await creatorFeedsPage.readInsights(edited);
        const detail = (await getPost(page.request, postId, creatorToken)).data;
        expect(insights).toEqual({ views: (detail?.viewFromExplore ?? 0) + (detail?.viewFromProfile ?? 0), likes: 1, comments: 1 });
      });

      await test.step('Delete asks for confirmation before removing anything', async () => {
        await creatorFeedsPage.openDeletePost(edited);
        await creatorFeedsPage.expectDeleteMentionsPin(false);
      });

      await test.step('Cancelling the deletion keeps the post published', async () => {
        await creatorFeedsPage.cancelDelete();
        await creatorFeedsPage.goto();
        await creatorFeedsPage.expectPostListed(edited);
        expect((await getPost(page.request, postId, buyerToken)).status).toBe(200);
      });

      await test.step('Confirming the deletion removes the post from every feed and its URL', async () => {
        await creatorFeedsPage.openDeletePost(edited);
        await creatorFeedsPage.confirmDelete();
        await creatorFeedsPage.expectPostNotListed(edited);
        expect((await getPost(page.request, postId, buyerToken)).status).toBe(404);
        await buyerFeeds.gotoPost(postId);
        await buyerProfile.expectTextAbsent(edited);
        await buyerProfile.goto(testAccounts.creator.username);
        await buyerProfile.switchToTab('feeds');
        await buyerProfile.expectCreatorPostVisible(anchor);
        await buyerProfile.expectTextAbsent(edited);
        postId = '';
      });
    } finally {
      for (const id of [postId, anchorId]) if (id) await deletePost(page.request, id, creatorToken).catch(() => undefined);
      if (productUuid) await deleteProduct(page.request, productUuid, creatorToken).catch(() => undefined);
      await buyerContext.close();
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

  test('Feeds and Exclusive — Pin Post, Replace Pin, Unpin Post, Pin and Edit, Pin and Delete, Pin Exclusive Post, Pin Eligibility', {
    tag: ['@AUT-FE-025', '@feeds', '@creator', '@regression'],
  }, async ({ creatorFeedsPage, page }) => {
    test.setTimeout(300000);
    const creatorToken = token(testAccounts.creator.envVar);
    test.skip(!creatorToken, 'Creator token is required');
    if (!creatorToken) return;

    const [older, newer, editedOlder, exclusive, draft, scheduled] = [1, 2, 3, 4, 5, 6].map(() => generatePostContent());
    const ids: Record<string, string> = {};
    const restorePin = await takeOverPin(page.request, creatorToken);
    const pinned = async () => (await getMyPosts(page.request, 'published', creatorToken)).filter((p) => p.isPinned).map((p) => p.uuid);

    try {
      ids.older = (await createPost(page.request, { content: older, visibility: 'public' }, creatorToken)).postId;
      ids.newer = (await createPost(page.request, { content: newer, visibility: 'public' }, creatorToken)).postId;
      ids.exclusive = (await createPost(page.request, { content: exclusive, visibility: 'pay_per_view', price: minPrice, imagePath: testImages.claude }, creatorToken)).postId;
      ids.draft = (await createPost(page.request, { content: draft, visibility: 'public', status: 'draft' }, creatorToken)).postId;
      ids.scheduled = (await createPost(page.request, { content: scheduled, visibility: 'public', scheduledAt: scheduleTimeAhead(120).toISOString() }, creatorToken)).postId;

      await test.step('Pin to top moves an older post first, labelled Pinned, and its menu turns to Unpin', async () => {
        await creatorFeedsPage.goto();
        await creatorFeedsPage.pinPost(older);
        const items = await creatorFeedsPage.postMenuItems(older);
        expect(items).toContain(menu.unpin);
        expect(items).not.toContain(menu.pin);
      });

      await test.step('Pinning a second post asks to replace the current pin, and Cancel changes nothing', async () => {
        await creatorFeedsPage.requestPinReplacing(newer, older);
        await creatorFeedsPage.answerReplaceDialog('cancel');
        await creatorFeedsPage.expectPinnedFirst(older);
        await creatorFeedsPage.expectNotPinned(newer);
        expect(await pinned()).toEqual([ids.older]);
      });

      await test.step('Replace moves the pin and only one post stays pinned', async () => {
        await creatorFeedsPage.requestPinReplacing(newer, older);
        await creatorFeedsPage.answerReplaceDialog('replace');
        await creatorFeedsPage.expectPinnedFirst(newer);
        await creatorFeedsPage.expectNotPinned(older);
        expect(await pinned()).toEqual([ids.newer]);
      });

      await test.step('Unpin applies at once, with no dialog, and the list is chronological again', async () => {
        await creatorFeedsPage.unpinPost(newer);
        await creatorFeedsPage.expectNoPinnedPost();
        const order = await creatorFeedsPage.publishedOrder();
        expect(order.findIndex((text) => text.includes(newer))).toBeLessThan(order.findIndex((text) => text.includes(older)));
        expect(await creatorFeedsPage.postMenuItems(newer)).toContain(menu.pin);
        expect(await pinned()).toEqual([]);
      });

      await test.step('Editing a pinned post keeps it pinned on top', async () => {
        await creatorFeedsPage.pinPost(older);
        await creatorFeedsPage.editPost(older, { content: editedOlder });
        await creatorFeedsPage.goto();
        await creatorFeedsPage.expectPinnedFirst(editedOlder);
      });

      await test.step('Deleting the pinned post says it is pinned, and frees the slot', async () => {
        await creatorFeedsPage.openDeletePost(editedOlder);
        await creatorFeedsPage.expectDeleteMentionsPin(true);
        await creatorFeedsPage.confirmDelete();
        delete ids.older;
        await creatorFeedsPage.expectNoPinnedPost();
        await creatorFeedsPage.pinPost(newer);
        expect(await pinned()).toEqual([ids.newer]);
      });

      await test.step('An exclusive post can be pinned like a public one', async () => {
        await creatorFeedsPage.unpinPost(newer);
        // After an Unpin, the post that moves into the top slot keeps an "Unpin" item until reload (candidate bug).
        await creatorFeedsPage.goto();
        await creatorFeedsPage.pinPost(exclusive);
        expect(await pinned()).toEqual([ids.exclusive]);
      });

      await test.step('Draft and Scheduled posts offer no Pin to top', async () => {
        await creatorFeedsPage.openTab('draft');
        expect(await creatorFeedsPage.postMenuItems(draft)).not.toContain(menu.pin);
        await creatorFeedsPage.openTab('scheduled');
        expect(await creatorFeedsPage.postMenuItems(scheduled)).not.toContain(menu.pin);
      });
    } finally {
      for (const id of Object.values(ids)) await deletePost(page.request, id, creatorToken).catch(() => undefined);
      await restorePin();
    }
  });

  test('Feeds and Exclusive — Pin Limit, Single Post Pin, Empty Feeds', {
    tag: ['@AUT-FE-026', '@feeds', '@creator', '@regression'],
  }, async ({ dbFixtures, browser, page }) => {
    test.setTimeout(240000);
    const creatorToken = token(testAccounts.creator.envVar);
    const secondToken = token(testAccounts.qa.envVar);
    test.skip(!creatorToken || !secondToken, 'Creator and second-account tokens are required');
    test.skip(process.env.YAPP_DB_FIXTURES !== '1', 'YAPP_DB_FIXTURES=1 is required to empty the second creator feed');
    if (!creatorToken || !secondToken) return;

    const [first, second, only] = [1, 2, 3].map(() => generatePostContent());
    const ids: string[] = [];
    let onlyId = '';
    const restorePin = await takeOverPin(page.request, creatorToken);
    // The QA account is a creator too; with its fixture posts hidden it stands for a creator with an empty feed.
    const secondContext = await browser.newContext({ viewport: page.viewportSize() });
    await loginWithToken(secondContext, secondToken, creatorsBaseURL);
    const secondFeeds = new CreatorFeedsPage(await secondContext.newPage(), creatorsBaseURL);

    try {
      await test.step('The server keeps one pin per creator: a second pin is refused until it asks to replace', async () => {
        for (const content of [first, second]) ids.push((await createPost(page.request, { content, visibility: 'public' }, creatorToken)).postId);
        expect((await pinPost(page.request, ids[0], false, creatorToken)).status).toBe(200);
        const refused = await pinPost(page.request, ids[1], false, creatorToken);
        expect(refused.status).toBe(409);
        expect(refused.body.message).toBe('another post is pinned');
        expect(refused.body.data?.pinnedPost?.uuid).toBe(ids[0]);
        const isPinned = async (id: string) => (await getMyPosts(page.request, 'published', creatorToken)).find((p) => p.uuid === id)?.isPinned;
        expect([await isPinned(ids[0]), await isPinned(ids[1])]).toEqual([true, false]);
        expect((await pinPost(page.request, ids[1], true, creatorToken)).status).toBe(200);
        expect([await isPinned(ids[0]), await isPinned(ids[1])]).toEqual([false, true]);
      });

      await test.step('A creator with no posts sees the empty feed with nothing to pin', async () => {
        await dbFixtures.hidePosts(testAccounts.qa.uuid);
        await secondFeeds.goto();
        await secondFeeds.expectEmptyFeeds();
      });

      await test.step('A creator whose only post is pinned gets no dialog and no other change', async () => {
        onlyId = (await createPost(page.request, { content: only, visibility: 'public' }, secondToken)).postId;
        await secondFeeds.goto();
        await secondFeeds.pinPost(only);
        expect(await secondFeeds.publishedOrder()).toHaveLength(1);
      });
    } finally {
      if (onlyId) await deletePost(page.request, onlyId, secondToken).catch(() => undefined);
      for (const id of ids) await deletePost(page.request, id, creatorToken).catch(() => undefined);
      await restorePin();
      await secondContext.close();
    }
  });
});
