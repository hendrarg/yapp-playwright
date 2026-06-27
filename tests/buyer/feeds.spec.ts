import { authTest as test, expect } from '../test-base';
import { feedsTabs } from '@test-data/buyer/feeds.data';

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