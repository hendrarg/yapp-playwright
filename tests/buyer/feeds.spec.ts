import { authTest as test, expect } from '../test-base';
import { depositWebhook } from '@helpers/api/webhook';
import { createComment, createPost, deletePost, getPostEngagement, getPurchasedExclusivePosts, isPostPurchased, setLifetimePrice, updatePost, waitForLifetimeOffer } from '@helpers/api/post';
import { followUser, getFollowing, unfollowUser } from '@helpers/api/follow';
import { createOnlineCourseProduct, deleteProduct } from '@helpers/api/product';
import { FeedsPage } from '@pages/buyer/FeedsPage';
import { ProfilePage } from '@pages/buyer/ProfilePage';
import { baseURL } from '@config/env';
import { feedsTabs, generateComment } from '@test-data/buyer/feeds.data';
import { accountSettingsLabels, profileLabels, profileTabs } from '@test-data/buyer/profile.data';
import { getAccount } from '@helpers/api/account';
import { generatePostData, testImages, testVideos } from '@test-data/creator/post.data';
import { testAccounts } from '@test-data/users';

test.describe('Buyer Feeds', () => {
test('Feeds and Exclusive — Locked Feed Card, Monetization Indicator, Exclusive Badge, Purchased Visibility, Locked Exclusive Tab, Existing Access, Screenshot Protection, Single PPV Entitlement', {
  tag: ['@AUT-FE-012', '@feeds', '@payment', '@buyer', '@smoke'],
}, async ({ buyerNav, buyerFeedsPage, buyerProfilePage, page }) => {
  test.setTimeout(240000);

  const creatorToken = process.env.YAPP_TEST_ACCESS_TOKEN_2?.replace(/"/g, '');
  const buyerToken = process.env[testAccounts.qa.envVar]?.replace(/"/g, '');
  test.skip(!creatorToken || !buyerToken, 'Creator (token2) and buyer tokens are required');

  const creator = testAccounts.sundanese;
  const price = 20000;
  // Only media is gated on a PPV post, so both posts carry an image.
  const bought = generatePostData({ content: `PPV bought ${Date.now()}`, visibility: 'pay_per_view', price });
  const unpaid = generatePostData({ content: `PPV unpaid ${Date.now()}`, visibility: 'pay_per_view', price });
  const seeded: Array<{ postId: string; uploadId?: string }> = [];

  try {
    await test.step('Seed two image pay-per-view posts; the buyer follows the creator', async () => {
      for (const post of [bought, unpaid]) seeded.push(await createPost(page.request, { ...post, imagePath: testImages.claude }, creatorToken));
      await followUser(page.request, creator.uuid, buyerToken);
    });

    await test.step('A locked post blurs its media behind Unlock Post while the body stays readable', async () => {
      await buyerNav.open('feeds');
      await buyerFeedsPage.expectAuthenticated();
      await buyerFeedsPage.switchToTab('following');
      await buyerFeedsPage.expectLockedPostVisible(bought.content);
    });

    await test.step('The Exclusive badge marks the post on the feed card and on the post detail', async () => {
      await buyerFeedsPage.expectExclusiveBadge(bought.content);
      await buyerFeedsPage.gotoPost(seeded[0].postId);
      await buyerFeedsPage.expectExclusiveBadgeOnDetail();
    });

    await test.step('Unlock Post discloses the price before payment', async () => {
      await buyerFeedsPage.expectLockedPostDetail();
      await buyerFeedsPage.openUnlockPreview(price);
    });

    await test.step('Buying one post unlocks it in the Exclusive tab', async () => {
      const orderId = await buyerFeedsPage.submitUnlockPayment(`Buyer ${Date.now()}`, `812${Date.now().toString().slice(-9)}`);
      await depositWebhook(page.request, orderId);
      await expect.poll(async () => (await getPurchasedExclusivePosts(page.request, buyerToken)).map((p) => p.uuid), { timeout: 20000 })
        .toContain(seeded[0].postId);
      await buyerNav.open('feeds');
      await buyerFeedsPage.switchToTab('exclusive');
      await buyerFeedsPage.expectPostVisible(bought.content);
      await buyerFeedsPage.gotoPost(seeded[0].postId);
      await buyerFeedsPage.expectUnlockedExclusivePost(bought.content);
    });

    await test.step("The other pay-per-view post stays locked on the creator's exclusive feed", async () => {
      await buyerProfilePage.goto(creator.username);
      await buyerProfilePage.switchToTab('feeds');
      await buyerProfilePage.toggleExclusiveOnly();
      await buyerProfilePage.expectCreatorPostUnlocked(bought.content);
      await buyerProfilePage.expectCreatorPostLocked(unpaid.content);
      await buyerFeedsPage.gotoPost(seeded[1].postId);
      await buyerFeedsPage.expectLockedPostDetail();
    });

    await test.step("A later price change keeps the buyer's access", async () => {
      await updatePost(page.request, seeded[0].postId, { ...bought, price: price + 5000, uploadId: seeded[0].uploadId }, creatorToken);
      await buyerFeedsPage.gotoPost(seeded[0].postId);
      await buyerFeedsPage.expectUnlockedExclusivePost(bought.content);
    });

    await test.step('A screenshot attempt on exclusive content raises a protection warning', async () => {
      await buyerNav.open('feeds');
      await buyerFeedsPage.switchToTab('exclusive');
      await buyerFeedsPage.expectPostVisible(bought.content);
      await buyerFeedsPage.attemptScreenshot();
      await buyerFeedsPage.dismissScreenshotWarning();
    });
  } finally {
    for (const { postId } of seeded) await deletePost(page.request, postId, creatorToken);
  }
});

test('Feeds and Exclusive — Lifetime Access, Unlock All Entitlement, Future Lifetime Access, Disabled Unlock All', {
  tag: ['@AUT-FE-013', '@feeds', '@payment', '@buyer', '@regression'],
}, async ({ buyerFeedsPage, buyerProfilePage, dbFixtures, page, browser }) => {
  test.setTimeout(420000);

  const creatorToken = process.env.YAPP_TEST_ACCESS_TOKEN_2?.replace(/"/g, '');
  const buyerToken = process.env[testAccounts.qa.envVar]?.replace(/"/g, '');
  test.skip(!creatorToken || !buyerToken, 'Creator (token2) and buyer tokens are required');
  // A lifetime purchase has no refund API; the DB fixture revokes it so other tests still see locked posts.
  test.skip(process.env.YAPP_DB_FIXTURES !== '1', 'YAPP_DB_FIXTURES=1 is required to revoke the lifetime purchase');

  const creator = testAccounts.sundanese;
  const buyer = testAccounts.qa;
  const lifetimePrice = 15000;
  const posts = [1, 2].map((n) => generatePostData({ content: `Lifetime current ${n} ${Date.now()}`, visibility: 'pay_per_view', price: 20000 }));
  const futurePost = generatePostData({ content: `Lifetime future ${Date.now()}`, visibility: 'pay_per_view', price: 20000 });
  const postIds: string[] = [];

  try {
    await test.step('Seed two image pay-per-view posts and a lifetime price; the buyer follows the creator', async () => {
      for (const post of posts) postIds.push((await createPost(page.request, { ...post, imagePath: testImages.claude }, creatorToken)).postId);
      await setLifetimePrice(page.request, lifetimePrice, creatorToken);
      await waitForLifetimeOffer(page.request, creator.username, true, buyerToken);
      await followUser(page.request, creator.uuid, buyerToken);
    });

    await test.step('Buying lifetime access unlocks every current exclusive post', async () => {
      await buyerProfilePage.goto(creator.username);
      await buyerProfilePage.switchToTab('feeds');
      await buyerProfilePage.expectLifetimeOffer();
      for (const post of posts) await buyerProfilePage.expectCreatorPostLocked(post.content);
      const orderId = await buyerProfilePage.buyLifetime('Rp15.000', `812${Date.now().toString().slice(-9)}`);
      await depositWebhook(page.request, orderId);
      await expect.poll(() => isPostPurchased(page.request, postIds[0], buyerToken), { timeout: 20000 }).toBe(true);
      for (const [i, post] of posts.entries()) {
        await buyerFeedsPage.gotoPost(postIds[i]);
        await buyerFeedsPage.expectUnlockedExclusivePost(post.content);
      }
    });

    await test.step('An exclusive post published after the purchase is unlocked without paying again', async () => {
      postIds.push((await createPost(page.request, { ...futurePost, imagePath: testImages.claude }, creatorToken)).postId);
      await buyerProfilePage.goto(creator.username);
      await buyerProfilePage.switchToTab('feeds');
      await buyerProfilePage.toggleExclusiveOnly();
      await buyerProfilePage.expectCreatorPostUnlocked(futurePost.content);
      await buyerFeedsPage.gotoPost(postIds[2]);
      await buyerFeedsPage.expectUnlockedExclusivePost(futurePost.content);
    });

    await test.step('After signing in again the purchased post opens from the Exclusive tab with no payment prompt', async () => {
      const freshContext = await browser.newContext({ storageState: await page.context().storageState(), viewport: page.viewportSize() });
      try {
        const freshFeeds = new FeedsPage(await freshContext.newPage(), baseURL);
        await freshFeeds.goto();
        await freshFeeds.switchToTab('exclusive');
        await freshFeeds.expectPostVisible(posts[0].content);
        await freshFeeds.gotoPost(postIds[0]);
        await freshFeeds.expectUnlockedExclusivePost(posts[0].content);
      } finally {
        await freshContext.close();
      }
    });

    await test.step('With Unlock All turned off, the offer disappears and single-post Unlock stays', async () => {
      expect(await dbFixtures.retireLifetimePurchases(buyer.uuid, creator.uuid)).toBeGreaterThan(0);
      await setLifetimePrice(page.request, 0, creatorToken);
      await waitForLifetimeOffer(page.request, creator.username, false, buyerToken);
      await buyerProfilePage.goto(creator.username);
      await buyerProfilePage.switchToTab('feeds');
      await buyerProfilePage.expectNoLifetimeOffer();
      await buyerProfilePage.expectCreatorPostLocked(posts[0].content);
      await buyerFeedsPage.gotoPost(postIds[0]);
      await buyerFeedsPage.expectLockedPostDetail();
      await buyerFeedsPage.openUnlockPreview(20000);
    });
  } finally {
    await dbFixtures.retireLifetimePurchases(buyer.uuid, creator.uuid);
    await setLifetimePrice(page.request, 0, creatorToken);
    for (const id of postIds) await deletePost(page.request, id, creatorToken);
  }
});

test('Feeds and Exclusive — Infinite Scroll, Creator Profile Feed, Exclusive Tab Filtering, Monetization Indicators, Follow Creator, Following Timeline, Unfollow', {
  tag: ['@AUT-FE-014', '@feeds', '@follow', '@buyer', '@regression'],
}, async ({ buyerNav, buyerFeedsPage, buyerProfilePage, page, browser }) => {
  test.setTimeout(240000);

  const creatorToken = process.env.YAPP_TEST_ACCESS_TOKEN_2?.replace(/"/g, '');
  const buyerToken = process.env[testAccounts.qa.envVar]?.replace(/"/g, '');
  test.skip(!creatorToken || !buyerToken, 'Creator (token2) and buyer tokens are required');

  const creator = testAccounts.sundanese;
  const price = 20000;
  const publicPost = generatePostData({ content: `Profile public ${Date.now()}`, visibility: 'public' });
  // Text PPV posts keep their body visible and show no "Unlock Post"; only image posts are gated.
  const lockedPost = { ...generatePostData({ content: `Profile locked ${Date.now()}`, visibility: 'pay_per_view', price }), imagePath: testImages.claude };
  const postIds: string[] = [];

  try {
    await test.step('Seed a public and a pay-per-view post; the buyer follows the creator', async () => {
      for (const post of [publicPost, lockedPost]) postIds.push((await createPost(page.request, post, creatorToken)).postId);
      await followUser(page.request, creator.uuid, buyerToken);
    });

    await test.step('Following timeline shows posts from followed creators', async () => {
      await buyerNav.open('feeds');
      await buyerFeedsPage.expectAuthenticated();
      await buyerFeedsPage.switchToTab('following');
      await buyerFeedsPage.expectTabActive(feedsTabs.following);
      await buyerFeedsPage.expectPostVisible(publicPost.content);
    });

    await test.step('Scrolling to the bottom loads more posts without errors', async () => {
      await buyerFeedsPage.infiniteScroll();
    });

    await test.step('An anonymous visitor sees public and locked posts on the profile Feeds tab', async () => {
      const guestContext = await browser.newContext();
      try {
        const guestProfile = new ProfilePage(await guestContext.newPage(), baseURL);
        await guestProfile.goto(creator.username);
        await guestProfile.switchToTab('feeds');
        await guestProfile.expectCreatorPostVisible(publicPost.content);
        await guestProfile.expectCreatorPostLocked(lockedPost.content);
      } finally {
        await guestContext.close();
      }
    });

    await test.step('Lock indicator is consistent on feed, profile and post detail; price shows at unlock', async () => {
      await buyerFeedsPage.switchToTab('following');
      await buyerFeedsPage.expectLockedPostVisible(lockedPost.content);
      await buyerProfilePage.goto(creator.username);
      await buyerProfilePage.switchToTab('feeds');
      await buyerProfilePage.expectCreatorPostVisible(publicPost.content);
      await buyerProfilePage.expectCreatorPostLocked(lockedPost.content);
      await buyerFeedsPage.gotoPost(postIds[1]);
      await buyerFeedsPage.expectLockedPostDetail();
      await buyerFeedsPage.openUnlockPreview(price);
    });

    await test.step('After buying the post, the Exclusive tab lists only paid content', async () => {
      const orderId = await buyerFeedsPage.submitUnlockPayment(`Buyer ${Date.now()}`, `812${Date.now().toString().slice(-9)}`);
      await depositWebhook(page.request, orderId);
      await expect.poll(async () => (await getPurchasedExclusivePosts(page.request, buyerToken)).map((p) => p.uuid), { timeout: 20000 })
        .toContain(postIds[1]);
      const purchased = await getPurchasedExclusivePosts(page.request, buyerToken);
      expect(purchased.every((p) => p.visibility === 'pay_per_view'), 'Exclusive tab must only hold pay-per-view posts').toBe(true);
      await buyerNav.open('feeds');
      await buyerFeedsPage.switchToTab('exclusive');
      await buyerFeedsPage.expectTabActive(feedsTabs.exclusive);
      await buyerFeedsPage.expectPostVisible(lockedPost.content);
      await buyerFeedsPage.expectPostHidden(publicPost.content);
    });

    await test.step('Unfollow from the profile removes the creator from the Following timeline', async () => {
      await buyerProfilePage.goto(creator.username);
      await buyerProfilePage.expectFollowingState();
      await buyerProfilePage.clickUnfollow();
      await buyerProfilePage.expectFollowState();
      await buyerNav.open('feeds');
      await buyerFeedsPage.switchToTab('following');
      await buyerFeedsPage.expectPostHidden(publicPost.content);
    });

    await test.step('Follow from the profile persists after refresh and brings the posts back', async () => {
      await buyerProfilePage.goto(creator.username);
      await buyerProfilePage.clickFollow();
      await buyerProfilePage.expectFollowingState();
      await page.reload();
      await buyerProfilePage.expectFollowingState();
      await buyerNav.open('feeds');
      await buyerFeedsPage.switchToTab('following');
      await buyerFeedsPage.expectPostVisible(publicPost.content);
    });
  } finally {
    // Other buyer specs rely on the buyer following this creator.
    await followUser(page.request, creator.uuid, buyerToken);
    for (const id of postIds) await deletePost(page.request, id, creatorToken);
  }
});

test('Feeds and Exclusive — Profile Tab Navigation, Post Detail Preview, Following Empty State', {
  tag: ['@AUT-FE-015', '@feeds', '@profile', '@buyer', '@regression'],
}, async ({ buyerNav, buyerFeedsPage, buyerProfilePage, page }) => {
  test.setTimeout(180000);

  const creatorToken = process.env.YAPP_TEST_ACCESS_TOKEN_2?.replace(/"/g, '');
  const buyerToken = process.env[testAccounts.qa.envVar]?.replace(/"/g, '');
  test.skip(!creatorToken || !buyerToken, 'Creator (token2) and buyer tokens are required');

  const creator = testAccounts.sundanese;
  const lockedPost = generatePostData({ content: `Teaser body ${Date.now()}`, visibility: 'pay_per_view', price: 20000 });
  let postId = '';
  let followed: string[] = [];

  try {
    await test.step('Seed an image pay-per-view post', async () => {
      ({ postId } = await createPost(page.request, { ...lockedPost, imagePath: testImages.claude }, creatorToken));
    });

    await test.step('Every profile tab opens its own content without a page error', async () => {
      await buyerProfilePage.goto(creator.username);
      for (const tab of ['shops', 'links', 'feeds', 'support'] as const) {
        await buyerProfilePage.switchToTab(tab);
        await buyerProfilePage.expectTabActive(tab);
      }
      await buyerProfilePage.expectFeedsTabVisibleOnProfile();
    });

    await test.step('Exclusive is a filter inside Feeds, not a profile tab', async () => {
      // Desktop layout: Membership is the right-hand panel; below ~768px it becomes a fifth, icon-only tab.
      await buyerProfilePage.goto(creator.username);
      await buyerProfilePage.expectTabs(Object.values(profileTabs));
      await buyerProfilePage.expectMembershipPanelVisible();
      await buyerProfilePage.expectNoTab(profileLabels.exclusiveTab);
      await buyerProfilePage.switchToTab('feeds');
      await buyerProfilePage.expectFeedsTabContent();
    });

    await test.step('An unpaid post detail shows the body as teaser while the media stays locked', async () => {
      await buyerFeedsPage.gotoPost(postId);
      await buyerFeedsPage.expectLockedPostDetail();
      await buyerFeedsPage.expectPostBodyVisible(lockedPost.content);
    });

    await test.step('A buyer who follows nobody gets creator suggestions on the Following timeline', async () => {
      followed = await getFollowing(page.request, buyerToken);
      for (const uuid of followed) await unfollowUser(page.request, uuid, buyerToken);
      await buyerNav.open('feeds');
      await buyerFeedsPage.switchToTab('following');
      await buyerFeedsPage.expectCreatorsSectionVisible();
      await buyerFeedsPage.expectPostHidden(lockedPost.content);
    });
  } finally {
    for (const uuid of followed) await followUser(page.request, uuid, buyerToken);
    if (postId) await deletePost(page.request, postId, creatorToken);
  }
});

test('Feeds and Exclusive — Single Image Preview, Gallery Preview, Gallery Navigation, Video Preview, Video Controls', {
  tag: ['@AUT-FE-016', '@feeds', '@media', '@buyer', '@regression'],
}, async ({ buyerNav, buyerFeedsPage, page }) => {
  test.setTimeout(180000);

  const creatorToken = process.env.YAPP_TEST_ACCESS_TOKEN_2?.replace(/"/g, '');
  const buyerToken = process.env[testAccounts.qa.envVar]?.replace(/"/g, '');
  test.skip(!creatorToken || !buyerToken, 'Creator (token2) and buyer tokens are required');

  const singlePost = generatePostData({ content: `Media single ${Date.now()}`, visibility: 'public' });
  const galleryPost = generatePostData({ content: `Media gallery ${Date.now()}`, visibility: 'public' });
  const videoPost = generatePostData({ content: `Media video ${Date.now()}`, visibility: 'public' });
  const postIds: string[] = [];

  try {
    await test.step('Seed a single-image, a three-image and a video post; the buyer follows the creator', async () => {
      postIds.push((await createPost(page.request, { ...singlePost, imagePath: testImages.claude }, creatorToken)).postId);
      postIds.push((await createPost(page.request, { ...galleryPost, imagePaths: [testImages.deepseek, testImages.gemini, testImages.gpt] }, creatorToken)).postId);
      postIds.push((await createPost(page.request, { ...videoPost, mediaPath: testVideos.sample }, creatorToken)).postId);
      await followUser(page.request, testAccounts.sundanese.uuid, buyerToken);
      await buyerNav.open('feeds');
      await buyerFeedsPage.switchToTab('following');
      await buyerFeedsPage.expectPostVisible(videoPost.content);
    });

    await test.step('A single image opens full screen with proportional scaling', async () => {
      await buyerFeedsPage.openPostMediaAt(singlePost.content, 0);
      await buyerFeedsPage.expectPreviewImageProportional();
    });

    await test.step('Closing the preview returns to the same feed position', async () => {
      await buyerFeedsPage.closePreview();
      const before = await buyerFeedsPage.feedScrollY();
      await buyerFeedsPage.openPostMediaAt(singlePost.content, 0);
      await buyerFeedsPage.closePreview();
      expect(await buyerFeedsPage.feedScrollY()).toBe(before);
    });

    await test.step('Tapping a non-first image opens the gallery at that image', async () => {
      const keys = await buyerFeedsPage.postImageKeys(galleryPost.content);
      expect(keys).toHaveLength(3);
      await buyerFeedsPage.openPostMediaAt(galleryPost.content, 1);
      await buyerFeedsPage.expectPreviewImage(keys[1]);
    });

    await test.step('Next and previous keep the gallery order', async () => {
      const keys = await buyerFeedsPage.postImageKeys(galleryPost.content);
      await buyerFeedsPage.nextImage();
      await buyerFeedsPage.expectPreviewImage(keys[2]);
      await buyerFeedsPage.previousImage();
      await buyerFeedsPage.expectPreviewImage(keys[1]);
      await buyerFeedsPage.previousImage();
      await buyerFeedsPage.expectPreviewImage(keys[0]);
      await buyerFeedsPage.closePreview();
    });

    await test.step('Tapping a video opens it full screen and it starts playing', async () => {
      await buyerFeedsPage.openPostMediaAt(videoPost.content, 0);
      await buyerFeedsPage.expectVideoPlayingFullScreen();
    });

    await test.step('Pause, resume and seek work, and exiting returns to the originating post', async () => {
      await buyerFeedsPage.controlVideoPlayback();
      await buyerFeedsPage.closePreview();
      await buyerFeedsPage.expectPostVisible(videoPost.content);
    });
  } finally {
    for (const id of postIds) await deletePost(page.request, id, creatorToken);
  }
});

test('Feeds and Exclusive — NSFW Filtering, NSFW Direct Access, NSFW Search, NSFW Recommendations, Official Badge, Official Differentiation, Official Consistency', {
  tag: ['@AUT-FE-017', '@feeds', '@explore', '@buyer', '@regression'],
}, async ({ buyerNav, buyerFeedsPage, buyerProfilePage, explorePage, dbFixtures, page }) => {
  test.setTimeout(180000);
  // NSFW TCs (B-030..033) wait on clarification: there is no creator-level NSFW flag to seed (CL-AUT-016).

  const officialToken = process.env.YAPP_TEST_ACCESS_TOKEN_2?.replace(/"/g, '');
  const plainToken = process.env.YAPP_TEST_ACCESS_TOKEN?.replace(/"/g, '');
  const buyerToken = process.env[testAccounts.qa.envVar]?.replace(/"/g, '');
  test.skip(!officialToken || !plainToken || !buyerToken, 'Sundanese, creator and buyer tokens are required');
  test.skip(process.env.YAPP_DB_FIXTURES !== '1', 'YAPP_DB_FIXTURES=1 is required to mark the creator Official');

  const official = testAccounts.sundanese;
  const plain = testAccounts.creator;
  const officialDisplayName = 'Asep pisan';
  const officialPost = generatePostData({ content: `Official author ${Date.now()}`, visibility: 'public' });
  const plainPost = generatePostData({ content: `Regular author ${Date.now()}`, visibility: 'public' });
  const seeded: Array<{ id: string; token: string }> = [];
  let followedPlainBefore = true;

  try {
    await test.step('Mark one creator Official and seed a post from it and from a regular creator', async () => {
      await dbFixtures.set('users', official.uuid, { is_verified_creator: true });
      seeded.push({ id: (await createPost(page.request, officialPost, officialToken)).postId, token: officialToken! });
      seeded.push({ id: (await createPost(page.request, plainPost, plainToken)).postId, token: plainToken! });
      followedPlainBefore = (await getFollowing(page.request, buyerToken)).includes(plain.uuid);
      for (const uuid of [official.uuid, plain.uuid]) await followUser(page.request, uuid, buyerToken);
    });

    await test.step('The Official badge appears on the creator card in Explore search', async () => {
      await buyerNav.open('explore');
      await explorePage.searchCreators(official.username);
      await explorePage.expectCreatorResultOfficial(`/${official.username}`, true);
    });

    await test.step('The Official badge appears beside the name on the creator profile', async () => {
      await buyerProfilePage.goto(official.username);
      await buyerProfilePage.expectOfficialBadgeBesideName(officialDisplayName);
    });

    await test.step('Official and regular creators shown together are told apart, and the regular one gains nothing', async () => {
      await buyerNav.open('feeds');
      await buyerFeedsPage.switchToTab('following');
      await buyerFeedsPage.expectPostAuthorOfficial(officialPost.content, true);
      await buyerFeedsPage.expectPostAuthorOfficial(plainPost.content, false);
      await buyerNav.open('explore');
      await explorePage.searchCreators(plain.username);
      await explorePage.expectCreatorResultOfficial(`/${plain.username}`, false);
    });

    await test.step('The badge is consistent on the Following card, the post detail and the profile feed', async () => {
      await buyerFeedsPage.gotoPost(seeded[0].id);
      await buyerFeedsPage.expectOfficialBadgeOnDetail();
      await buyerProfilePage.goto(official.username);
      await buyerProfilePage.switchToTab('feeds');
      await buyerProfilePage.expectCreatorPostVisible(officialPost.content);
      await buyerProfilePage.expectOfficialBadgeBesideName(officialDisplayName);
    });
  } finally {
    if (!followedPlainBefore) await unfollowUser(page.request, plain.uuid, buyerToken);
    for (const { id, token } of seeded) await deletePost(page.request, id, token);
  }
});

test('Feeds and Exclusive — Display Linked Products, No Product State, Product Navigation, Purchase Initiation, Inactive Product, Deleted Product', {
  tag: ['@AUT-FE-019', '@feeds', '@products', '@buyer', '@regression'],
  annotation: { type: 'issue', description: 'F&E-11' },
}, async ({ buyerNav, buyerFeedsPage, productPurchasePage, page }) => {
  test.setTimeout(180000);
  // Known bug M-60: inactive linked products are still listed on the post (and lead to "That page doesn't exist").
  test.fail(true, 'M-60 / F&E-11: inactive linked product is still displayed on the post');

  const creatorToken = process.env.YAPP_TEST_ACCESS_TOKEN_2?.replace(/"/g, '');
  const buyerToken = process.env[testAccounts.qa.envVar]?.replace(/"/g, '');
  test.skip(!creatorToken || !buyerToken, 'Creator (token2) and buyer tokens are required');

  const stamp = Date.now();
  const titles = { active: `Linked active ${stamp}`, inactive: `Linked inactive ${stamp}`, deleted: `Linked deleted ${stamp}` };
  const linkedPost = generatePostData({ content: `Linked products ${stamp}`, visibility: 'public' });
  const plainPost = generatePostData({ content: `No products ${stamp}`, visibility: 'public' });
  const productIds: string[] = [];
  const postIds: string[] = [];

  try {
    await test.step('Seed active, inactive and deleted products linked to one post, plus a post without products', async () => {
      const make = async (title: string, status: 'active' | 'inactive') =>
        (await createOnlineCourseProduct(page.request, { title, description: 'Linked product fixture', thumbnailImagePath: testImages.claude, price: 15000, status }, creatorToken)).productUuid;
      productIds.push(await make(titles.active, 'active'), await make(titles.inactive, 'inactive'));
      const deletedId = await make(titles.deleted, 'active');
      postIds.push((await createPost(page.request, { ...linkedPost, productUuids: [...productIds, deletedId] }, creatorToken)).postId);
      postIds.push((await createPost(page.request, plainPost, creatorToken)).postId);
      await deleteProduct(page.request, deletedId, creatorToken);
      await followUser(page.request, testAccounts.sundanese.uuid, buyerToken);
    });

    await test.step('A post with no linked product shows no product section', async () => {
      await buyerNav.open('feeds');
      await buyerFeedsPage.switchToTab('following');
      await buyerFeedsPage.expectPostVisible(plainPost.content);
      await buyerFeedsPage.expectFeedCardProductCount(plainPost.content, null);
      await buyerFeedsPage.gotoPost(postIds[1]);
      await buyerFeedsPage.expectNoLinkedProducts(plainPost.content);
    });

    await test.step('Each linked product shows its name, price and thumbnail', async () => {
      await buyerFeedsPage.gotoPost(postIds[0]);
      await buyerFeedsPage.expectLinkedProduct(titles.active, /Rp15[.,]000/);
    });

    await test.step('A deleted linked product is gone and the post still loads', async () => {
      await buyerFeedsPage.expectPostBodyVisible(linkedPost.content);
      await buyerFeedsPage.expectLinkedProductHidden(titles.deleted);
    });

    await test.step('Clicking a linked product opens its product page, where Purchase starts checkout', async () => {
      await buyerFeedsPage.openLinkedProduct(titles.active);
      await productPurchasePage.startPurchase(titles.active);
    });

    await test.step('An inactive linked product is not displayed', async () => {
      await buyerFeedsPage.gotoPost(postIds[0]);
      await buyerFeedsPage.expectLinkedProduct(titles.active, /Rp15[.,]000/);
      await buyerFeedsPage.expectLinkedProductHidden(titles.inactive);
    });
  } finally {
    for (const id of postIds) await deletePost(page.request, id, creatorToken);
    for (const id of productIds) await deleteProduct(page.request, id, creatorToken);
  }
});

test('Feeds and Exclusive — Payment Initiation, Successful Payment, Failed Payment, Lifetime Access', {
  tag: ['@AUT-FE-020', '@feeds', '@payment', '@buyer', '@regression'],
  annotation: { type: 'issue', description: 'F&E-12' },
}, async ({ buyerFeedsPage, buyerProfilePage, transactionPage, dbFixtures, page, browser }) => {
  test.setTimeout(420000);
  // Known bug L-78: the Lifetime Access checkout shows the price but never names the creator (TC-FE-B-052).
  test.fail(true, 'L-78 / F&E-12: Lifetime Access checkout does not show the creator');

  const creatorToken = process.env.YAPP_TEST_ACCESS_TOKEN_2?.replace(/"/g, '');
  const buyerToken = process.env[testAccounts.qa.envVar]?.replace(/"/g, '');
  test.skip(!creatorToken || !buyerToken, 'Creator (token2) and buyer tokens are required');
  test.skip(process.env.YAPP_DB_FIXTURES !== '1', 'YAPP_DB_FIXTURES=1 is required to fail and revoke the lifetime purchase');

  const creator = testAccounts.sundanese;
  const buyer = testAccounts.qa;
  const creatorName = 'Asep pisan';
  const posts = [1, 2].map((n) => generatePostData({ content: `Unlock All ${n} ${Date.now()}`, visibility: 'pay_per_view', price: 20000 }));
  const postIds: string[] = [];
  const phone = `812${Date.now().toString().slice(-9)}`;

  try {
    await test.step('Seed two image pay-per-view posts and a lifetime price; the buyer follows the creator', async () => {
      for (const post of posts) postIds.push((await createPost(page.request, { ...post, imagePath: testImages.claude }, creatorToken)).postId);
      await setLifetimePrice(page.request, 15000, creatorToken);
      await waitForLifetimeOffer(page.request, creator.username, true, buyerToken);
      await followUser(page.request, creator.uuid, buyerToken);
    });

    await test.step('A failed Unlock All payment shows an error and records no purchase', async () => {
      await buyerProfilePage.goto(creator.username);
      await buyerProfilePage.switchToTab('feeds');
      await buyerProfilePage.openLifetimeCheckout('Rp15.000');
      const orderId = await buyerProfilePage.payLifetime(phone);
      await dbFixtures.failLifetimePayment(orderId);
      await transactionPage.reload();
      await transactionPage.expectPaymentFailed();
      for (const id of postIds) expect(await isPostPurchased(page.request, id, buyerToken)).toBe(false);
    });

    await test.step('After the failed payment every post stays locked and Unlock All is still offered', async () => {
      await buyerProfilePage.goto(creator.username);
      await buyerProfilePage.switchToTab('feeds');
      await buyerProfilePage.expectLifetimeOffer();
      for (const post of posts) await buyerProfilePage.expectCreatorPostLocked(post.content);
    });

    await test.step('A successful Unlock All payment unlocks every exclusive post', async () => {
      const orderId = await buyerProfilePage.buyLifetime('Rp15.000', phone);
      await depositWebhook(page.request, orderId);
      await transactionPage.expectLifetimePaymentSuccess(creatorName);
      await expect.poll(() => isPostPurchased(page.request, postIds[1], buyerToken), { timeout: 20000 }).toBe(true);
      await buyerProfilePage.goto(creator.username);
      await buyerProfilePage.switchToTab('feeds');
      await buyerProfilePage.toggleExclusiveOnly();
      for (const post of posts) await buyerProfilePage.expectCreatorPostUnlocked(post.content);
      await buyerFeedsPage.gotoPost(postIds[0]);
      await buyerFeedsPage.expectUnlockedExclusivePost(posts[0].content);
    });

    await test.step('In a later session the Unlock All content is still accessible', async () => {
      const freshContext = await browser.newContext({ storageState: await page.context().storageState(), viewport: page.viewportSize() });
      try {
        const freshProfile = new ProfilePage(await freshContext.newPage(), baseURL);
        await freshProfile.goto(creator.username);
        await freshProfile.switchToTab('feeds');
        await freshProfile.toggleExclusiveOnly();
        for (const post of posts) await freshProfile.expectCreatorPostUnlocked(post.content);
      } finally {
        await freshContext.close();
      }
    });

    await test.step('The Unlock All payment dialog shows the creator and the price', async () => {
      await dbFixtures.retireLifetimePurchases(buyer.uuid, creator.uuid);
      await buyerProfilePage.goto(creator.username);
      await buyerProfilePage.switchToTab('feeds');
      await buyerProfilePage.openLifetimeCheckout('Rp15.000');
      await buyerProfilePage.expectLifetimeCheckoutNamesCreator(creatorName);
    });
  } finally {
    await dbFixtures.retireLifetimePurchases(buyer.uuid, creator.uuid);
    await setLifetimePrice(page.request, 0, creatorToken);
    for (const id of postIds) await deletePost(page.request, id, creatorToken);
  }
});

test('Feeds and Exclusive — Payment Initiation, Successful Purchase, Purchase Isolation, Lifetime Access, Purchased Content List, Repeat Unlock', {
  tag: ['@AUT-FE-021', '@feeds', '@payment', '@buyer', '@regression'],
}, async ({ buyerNav, buyerFeedsPage, page, browser }) => {
  test.setTimeout(240000);

  const creatorToken = process.env.YAPP_TEST_ACCESS_TOKEN_2?.replace(/"/g, '');
  const buyerToken = process.env[testAccounts.qa.envVar]?.replace(/"/g, '');
  test.skip(!creatorToken || !buyerToken, 'Creator (token2) and buyer tokens are required');

  const price = 20000;
  const bought = generatePostData({ content: `PPV single ${Date.now()}`, visibility: 'pay_per_view', price });
  const other = generatePostData({ content: `PPV other ${Date.now()}`, visibility: 'pay_per_view', price: price + 5000 });
  const postIds: string[] = [];

  try {
    await test.step('Seed two image pay-per-view posts; the buyer follows the creator', async () => {
      for (const post of [bought, other]) postIds.push((await createPost(page.request, { ...post, imagePath: testImages.claude }, creatorToken)).postId);
      await followUser(page.request, testAccounts.sundanese.uuid, buyerToken);
    });

    await test.step('Unlock on one PPV post opens a payment dialog for that post and its price', async () => {
      await buyerFeedsPage.gotoPost(postIds[0]);
      await buyerFeedsPage.expectLockedPostDetail();
      await buyerFeedsPage.openUnlockPreview(price);
      await buyerFeedsPage.openUnlockPayment(price);
    });

    await test.step('A successful payment unlocks the selected post', async () => {
      const orderId = await buyerFeedsPage.submitUnlockPayment(`Buyer ${Date.now()}`, `812${Date.now().toString().slice(-9)}`);
      await depositWebhook(page.request, orderId);
      await expect.poll(() => isPostPurchased(page.request, postIds[0], buyerToken), { timeout: 20000 }).toBe(true);
      await buyerFeedsPage.gotoPost(postIds[0]);
      await buyerFeedsPage.expectUnlockedExclusivePost(bought.content);
    });

    await test.step('The other PPV post stays locked', async () => {
      expect(await isPostPurchased(page.request, postIds[1], buyerToken)).toBe(false);
      await buyerFeedsPage.gotoPost(postIds[1]);
      await buyerFeedsPage.expectLockedPostDetail();
    });

    await test.step('The purchased post is listed once in the Exclusive tab with its creator', async () => {
      const purchased = await getPurchasedExclusivePosts(page.request, buyerToken);
      expect(purchased.filter((p) => p.uuid === postIds[0])).toHaveLength(1);
      expect(purchased.map((p) => p.uuid)).not.toContain(postIds[1]);
      await buyerNav.open('feeds');
      await buyerFeedsPage.switchToTab('exclusive');
      await buyerFeedsPage.expectPostVisible(bought.content);
      await buyerFeedsPage.expectPostAuthor(bought.content, testAccounts.sundanese.username);
      await buyerFeedsPage.expectPostHidden(other.content);
    });

    await test.step('An entitled buyer opens the post from the feed and by direct URL with no payment action', async () => {
      await buyerFeedsPage.switchToTab('following');
      await buyerFeedsPage.expectUnlockedFeedCard(bought.content);
      await buyerFeedsPage.gotoPost(postIds[0]);
      await buyerFeedsPage.expectUnlockedExclusivePost(bought.content);
    });

    await test.step('In a later session the purchased post is still accessible', async () => {
      const freshContext = await browser.newContext({ storageState: await page.context().storageState(), viewport: page.viewportSize() });
      try {
        const freshFeeds = new FeedsPage(await freshContext.newPage(), baseURL);
        await freshFeeds.gotoPost(postIds[0]);
        await freshFeeds.expectUnlockedExclusivePost(bought.content);
      } finally {
        await freshContext.close();
      }
    });
  } finally {
    for (const id of postIds) await deletePost(page.request, id, creatorToken);
  }
});

test('Feeds and Exclusive — Profile Structure, Edit Profile, Profile Picture, Username Update', {
  tag: ['@AUT-FE-022', '@feeds', '@profile', '@buyer', '@regression'],
  annotation: { type: 'issue', description: 'F&E-13' },
}, async ({ buyerFeedsPage, buyerProfilePage, accountSettingsPage, dbFixtures, page }) => {
  test.setTimeout(180000);
  // Known bug M-61: a picture upload blanks the display name. Checked softly so the later steps still run.
  test.fail(true, 'M-61 / F&E-13: profile picture upload blanks the display name');
  // TC-FE-B-064 ("no edit controls") waits on clarification: the buyer app now has /profile/settings (CL-AUT-020).
  const buyerToken = process.env[testAccounts.qa.envVar]?.replace(/"/g, '');
  test.skip(!buyerToken, 'Buyer token is required');
  test.skip(process.env.YAPP_DB_FIXTURES !== '1', 'YAPP_DB_FIXTURES=1 is required to restore the username and picture');

  const buyer = testAccounts.qa;
  const account = await getAccount(page.request, buyerToken);
  const newUsername = `qa_buyer_${Date.now().toString().slice(-6)}`;

  await test.step('Snapshot the buyer identity so the test can put it back', async () => {
    await dbFixtures.protectProfile(buyer.uuid);
  });

  await test.step('The own profile shows avatar, name, following count, My Memberships and a way into settings', async () => {
    await buyerProfilePage.goto();
    await buyerProfilePage.expectOwnProfileIdentity(account.name);
    await buyerProfilePage.openAccountSettings();
    await accountSettingsPage.expectLoaded(account.username);
  });

  await test.step('A valid username of letters, digits and underscore is saved', async () => {
    await accountSettingsPage.changeUsername(newUsername);
    await accountSettingsPage.expectUsernameSaved(newUsername);
    expect((await getAccount(page.request, buyerToken)).username).toBe(newUsername);
  });

  await test.step('The new username appears on the buyer\'s posts and opens the public profile', async () => {
    await buyerProfilePage.goto();
    await buyerFeedsPage.expectPostAuthorOnPage(newUsername);
    await buyerProfilePage.goto(newUsername);
    await buyerProfilePage.expectOwnPublicProfile(account.name);
  });

  await test.step('Uploading a new profile picture saves it and leaves the rest of the identity alone', async () => {
    await buyerProfilePage.goto();
    await buyerProfilePage.openAccountSettings();
    await accountSettingsPage.uploadProfilePicture(testImages.claude);
    await accountSettingsPage.reload();
    await accountSettingsPage.expectProfilePictureSet();
    expect.soft((await getAccount(page.request, buyerToken)).name, 'display name after a picture upload').toBe(account.name);
  });

  await test.step('The new picture shows on the profile and in the account menu', async () => {
    await buyerProfilePage.goto();
    await buyerProfilePage.expectOwnPictureShown();
  });
});

test('Feeds and Exclusive — Username Validation, Creator-Style Empty Profile, Creator Conversion Empty State (negative & boundary)', {
  tag: ['@AUT-FE-023', '@feeds', '@profile', '@buyer', '@regression'],
}, async ({ buyerProfilePage, accountSettingsPage, dbFixtures, page }) => {
  test.setTimeout(150000);
  // TC-FE-B-074 (tab set) and TC-FE-B-075 (non-creator empty state) wait on clarification (CL-AUT-021/022).
  const buyerToken = process.env[testAccounts.qa.envVar]?.replace(/"/g, '');
  test.skip(!buyerToken, 'Buyer token is required');
  test.skip(process.env.YAPP_DB_FIXTURES !== '1', 'YAPP_DB_FIXTURES=1 is required to guard the username');

  const buyer = testAccounts.qa;
  const { username } = await getAccount(page.request, buyerToken);
  await dbFixtures.protectProfile(buyer.uuid);
  await buyerProfilePage.goto();
  await buyerProfilePage.openAccountSettings();
  await accountSettingsPage.expectLoaded(username);

  await test.step('An empty username cannot be saved and the old one stays', async () => {
    await accountSettingsPage.expectEmptyUsernameBlocked();
    await accountSettingsPage.reload();
    await accountSettingsPage.expectLoaded(username);
  });

  await test.step('A username another account owns is rejected', async () => {
    await accountSettingsPage.changeUsername(testAccounts.creator.username);
    await accountSettingsPage.expectUsernameRejected(accountSettingsLabels.usernameTaken, username);
  });

  await test.step('Spaces and symbols are rejected', async () => {
    await accountSettingsPage.changeUsername('qa buyer!');
    await accountSettingsPage.expectUsernameRejected(accountSettingsLabels.usernameInvalid, username);
  });

  await test.step('A three-character username is rejected', async () => {
    await accountSettingsPage.changeUsername('qab');
    await accountSettingsPage.expectUsernameRejected(accountSettingsLabels.validationFailed, username);
  });

  await test.step('A twenty-six-character username is rejected', async () => {
    await accountSettingsPage.changeUsername('q'.repeat(26));
    await accountSettingsPage.expectUsernameRejected(accountSettingsLabels.validationFailed, username);
    expect((await getAccount(page.request, buyerToken)).username).toBe(username);
  });
});

test('Feeds and Exclusive — Like Post, Unlike Post, Add Comment, Comment Validation, Edit Comment, Delete Comment, Comment Authorization, Engagement Count', {
  tag: ['@AUT-FE-018', '@feeds', '@like', '@comment', '@buyer', '@regression'],
}, async ({ buyerNav, buyerFeedsPage, page }) => {
  test.setTimeout(150000);

  const creatorToken = process.env.YAPP_TEST_ACCESS_TOKEN_2?.replace(/"/g, '');
  test.skip(!creatorToken, 'YAPP_TEST_ACCESS_TOKEN_2 must be set to seed the creator post');

  const postData = generatePostData({ content: `Engagement ${Date.now()}`, visibility: 'public' });
  const otherComment = `Other account comment ${Date.now()}`;
  const ownComment = generateComment();
  const editedComment = `${ownComment} edited`;
  let postId = '';
  let initialLikes = 0;

  try {
    await test.step('Seed a public post and another account\'s comment', async () => {
      ({ postId } = await createPost(page.request, postData, creatorToken));
      await createComment(page.request, postId, otherComment, creatorToken);
    });

    await test.step('Like a post: count rises by one and the icon turns active', async () => {
      await buyerNav.open('feeds');
      await buyerFeedsPage.expectAuthenticated();
      await buyerFeedsPage.switchToTab('following');
      await buyerFeedsPage.expectTabActive(feedsTabs.following);
      await buyerFeedsPage.expectPostVisible(postData.content);
      initialLikes = await buyerFeedsPage.getPostLikeCount(postData.content);
      await buyerFeedsPage.likePost(postData.content);
      await buyerFeedsPage.expectPostLikedState(postData.content);
      await expect.poll(() => buyerFeedsPage.getPostLikeCount(postData.content)).toBe(initialLikes + 1);
    });

    await test.step('Unlike the post: count drops by one and the icon resets', async () => {
      await buyerFeedsPage.unlikePost(postData.content);
      await buyerFeedsPage.expectPostUnlikedState(postData.content);
      await expect.poll(() => buyerFeedsPage.getPostLikeCount(postData.content)).toBe(initialLikes);
    });

    await test.step('Submit a valid comment: it appears under the buyer\'s identity', async () => {
      await buyerFeedsPage.gotoPost(postId);
      await buyerFeedsPage.fillComment(ownComment);
      await buyerFeedsPage.submitComment(ownComment);
      await buyerFeedsPage.expectCommentAuthor(ownComment, testAccounts.qa.username);
    });

    // Edit is only allowed within one minute of posting, so it runs straight after the post.
    await test.step('Edit the own comment: the new text replaces the old one', async () => {
      await buyerFeedsPage.editComment(ownComment, editedComment);
      await buyerFeedsPage.expectCommentHidden(ownComment);
    });

    await test.step('Empty or whitespace-only comment cannot be submitted', async () => {
      await buyerFeedsPage.fillComment('');
      await buyerFeedsPage.expectPostButtonDisabled();
      await buyerFeedsPage.fillComment('   ');
      await buyerFeedsPage.expectPostButtonDisabled();
      await buyerFeedsPage.fillComment('');
    });

    await test.step('Another account\'s comment offers no edit or delete control', async () => {
      await buyerFeedsPage.expectNoCommentActions(otherComment);
    });

    await test.step('Engagement counts match the post data', async () => {
      const engagement = await getPostEngagement(page.request, postId);
      expect(engagement.commentCount).toBe(2);
      await buyerNav.open('feeds');
      await buyerFeedsPage.switchToTab('following');
      await buyerFeedsPage.expectPostVisible(postData.content);
      await expect.poll(() => buyerFeedsPage.getPostLikeCount(postData.content)).toBe(engagement.likeCount);
      await expect.poll(() => buyerFeedsPage.getPostCommentCount(postData.content)).toBe(engagement.commentCount);
    });

    await test.step('Delete the own comment after confirming: it leaves the thread', async () => {
      await buyerFeedsPage.gotoPost(postId);
      await buyerFeedsPage.deleteComment(editedComment);
      await buyerFeedsPage.expectCommentVisible(otherComment);
    });
  } finally {
    if (postId) await deletePost(page.request, postId, creatorToken);
  }
});
});
