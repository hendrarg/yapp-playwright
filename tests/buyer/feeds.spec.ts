import { authTest as test, expect } from '../test-base';
import { feedsTabs, generateComment } from '@test-data/buyer/feeds.data';

test('injected "at" token loads the feeds page without redirecting to auth', {
  tag: ['@feeds', '@buyer', '@smoke'],
}, async ({ buyerFeedsPage }) => {
  await buyerFeedsPage.goto();
  await buyerFeedsPage.expectLoaded();
  await buyerFeedsPage.expectAuthenticated();
});

test('Buyer Explore Feed — Browse, View Tabs & Infinite Scroll', {
  tag: ['@TAT-B-E2E-001', '@feeds', '@explore', '@buyer', '@smoke', '@regression'],
}, async ({ buyerFeedsPage, page }) => {
  test.setTimeout(90000);

  await test.step('Open feeds and verify Following tab + Creators You Might Like', async () => {
    await buyerFeedsPage.goto();
    await buyerFeedsPage.expectLoaded();
    await buyerFeedsPage.expectAuthenticated();
    await buyerFeedsPage.expectTabActive(feedsTabs.following);
    await buyerFeedsPage.expectCreatorsSectionVisible();
  });

  await test.step('Switch to Your Post tab', async () => {
    await buyerFeedsPage.switchToTab('yourPost');
    await buyerFeedsPage.expectTabActive(feedsTabs.yourPost);
    await expect(page).toHaveURL(/\/feeds/, { timeout: 10000 });
  });

  await test.step('Switch to Exclusive tab (gated content only)', async () => {
    await buyerFeedsPage.switchToTab('exclusive');
    await buyerFeedsPage.expectTabActive(feedsTabs.exclusive);
    await buyerFeedsPage.expectExclusiveContentOnly();
  });

  await test.step('Switch back to Following tab', async () => {
    await buyerFeedsPage.switchToTab('following');
    await buyerFeedsPage.expectTabActive(feedsTabs.following);
  });

  await test.step('Infinite scroll loads additional posts', async () => {
    await buyerFeedsPage.infiniteScroll();
    await buyerFeedsPage.expectLockedPostsBlurred();
  });

  await test.step('Open a public image post', async () => {
    await buyerFeedsPage.openFirstPublicImagePost();
    await buyerFeedsPage.expectPostDetailOpen();
    await buyerFeedsPage.expectPublicImageUnlocked();
  });
});

test('Buyer Follow/Unfollow Creator — Full Cycle Across Entry Points', {
  tag: ['@TAT-B-E2E-003', '@feeds', '@follow', '@buyer', '@regression'],
}, async ({ buyerFeedsPage, buyerProfilePage }) => {
  test.setTimeout(120000);

  await test.step('Open feeds and verify Following tab + Creators You Might Like', async () => {
    await buyerFeedsPage.goto();
    await buyerFeedsPage.expectLoaded();
    await buyerFeedsPage.expectAuthenticated();
    await buyerFeedsPage.expectTabActive(feedsTabs.following);
    await buyerFeedsPage.expectCreatorsSectionVisible();
  });

  await test.step('Follow creator from Creators You Might Like', async () => {
    await buyerFeedsPage.followFirstCreator();
    // Page redirects to / after follow
  });

  await test.step('Open creator profile from Following tab post', async () => {
    await buyerFeedsPage.goto();
    await buyerFeedsPage.openCreatorProfileFromFollowingTab();
    await buyerProfilePage.expectLoaded();
  });

  await test.step('Verify Following state on creator profile', async () => {
    await buyerProfilePage.expectFollowingState();
  });

  await test.step('Unfollow from creator profile', async () => {
    await buyerProfilePage.clickUnfollow();
    await buyerProfilePage.expectFollowState();
  });

  await test.step('Click back button to return to feeds and verify unfollowed state', async () => {
    await buyerProfilePage.clickBackButton();
    await buyerFeedsPage.expectLoaded();
    await buyerFeedsPage.switchToTab('following');
    await buyerFeedsPage.expectTabActive(feedsTabs.following);
    await expect(buyerFeedsPage.creatorsSection).toBeVisible({ timeout: 10000 });
    await expect(buyerFeedsPage.followButtons.first()).toBeVisible({ timeout: 10000 });
  });
});

test('Buyer Like/Unlike Post — Full Cycle Across Pages', {
  tag: ['@TAT-B-E2E-004', '@feeds', '@like', '@buyer', '@regression'],
}, async ({ buyerFeedsPage, buyerProfilePage }) => {
  test.setTimeout(120000);

  await test.step('Open feeds and verify Following tab + Creators You Might Like', async () => {
    await buyerFeedsPage.goto();
    await buyerFeedsPage.expectLoaded();
    await buyerFeedsPage.expectAuthenticated();
    await buyerFeedsPage.switchToTab('following');
    await buyerFeedsPage.expectTabActive(feedsTabs.following);
    await buyerFeedsPage.expectCreatorsSectionVisible();
  });

  await test.step('Like a post from feed and verify count +1, icon active', async () => {
    await buyerFeedsPage.likeFirstPost();
    await buyerFeedsPage.expectLikedState();
  });

  await test.step('Open post detail and verify liked state, then go back', async () => {
    await buyerFeedsPage.openFirstPostDetail();
    await buyerFeedsPage.expectLikedState();
    await buyerFeedsPage.clickBackFromPostDetail();
    await buyerFeedsPage.expectLoaded();
  });

  await test.step('Navigate to creator profile from feeds post and unlike', async () => {
    await buyerFeedsPage.navigateToCreatorProfileFromPost();
    await buyerProfilePage.expectLoaded();
    await buyerProfilePage.switchToTab('feeds');
    await buyerProfilePage.unlikeCreatorFirstPost();
    await buyerProfilePage.expectCreatorPostUnlikedState();
  });

  await test.step('Return to feeds and verify unliked state on post detail', async () => {
    await buyerProfilePage.clickBackButton();
    await buyerFeedsPage.expectLoaded();
    await buyerFeedsPage.switchToTab('following');
    await buyerFeedsPage.expectTabActive(feedsTabs.following);
    await buyerFeedsPage.expectUnlikedState();
    await buyerFeedsPage.openFirstPostDetail();
    await buyerFeedsPage.expectUnlikedState();
  });
});

test('Buyer Comment on Post — Submit & Verify', {
  tag: ['@TAT-B-E2E-005', '@feeds', '@comment', '@buyer', '@regression'],
}, async ({ buyerFeedsPage }) => {
  test.setTimeout(120000);

  let previousCommentCount = 0;
  let commentText = '';

  await test.step('Open feeds and verify Following tab', async () => {
    await buyerFeedsPage.goto();
    await buyerFeedsPage.expectLoaded();
    await buyerFeedsPage.expectAuthenticated();
    await buyerFeedsPage.expectTabActive(feedsTabs.following);
    previousCommentCount = await buyerFeedsPage.getFeedCommentCount();
  });

  await test.step('Open post detail and verify comment section', async () => {
    await buyerFeedsPage.openFirstPostDetail();
    await buyerFeedsPage.expectPostDetailOpen();
    await buyerFeedsPage.expectPostButtonDisabled();
  });

  await test.step('Type comment and verify Post button enabled', async () => {
    commentText = generateComment();
    await buyerFeedsPage.fillComment(commentText);
    await buyerFeedsPage.expectPostButtonEnabled();
  });

  await test.step('Submit comment, verify it appears in list and count increased', async () => {
    await buyerFeedsPage.submitComment(commentText);
    await buyerFeedsPage.expectCommentCountIncreased(previousCommentCount);
  });

  await test.step('Click back to feeds and verify comment count increased', async () => {
    await buyerFeedsPage.clickBackFromPostDetail();
    await buyerFeedsPage.expectLoaded();
    await buyerFeedsPage.expectFeedCommentCountIncreased(previousCommentCount);
  });
});