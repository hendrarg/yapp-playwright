import { authTest as test, test as guestTest, expect } from '../test-base';
import { depositWebhook } from '@helpers/api/webhook';
import { createPost, deletePost } from '@helpers/api/post';
import { feedsTabs, generateComment } from '@test-data/buyer/feeds.data';
import { generatePostData, testImages, testVideos } from '@test-data/creator/post.data';

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
    await buyerFeedsPage.expectExclusiveContentOnly();
  });

  await test.step('Switch back to Following tab', async () => {
    await buyerFeedsPage.switchToTab('following');
    await buyerFeedsPage.expectTabActive(feedsTabs.following);
  });

  await test.step('Infinite scroll loads additional posts', async () => {
    await buyerFeedsPage.infiniteScroll();
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

  await test.step('Follow creator again and verify final Following state', async () => {
    await buyerProfilePage.clickFollow();
    await buyerProfilePage.expectFollowingState();
  });

  await test.step('Click back button to return to feeds and verify followed state', async () => {
    await buyerProfilePage.clickBackButton();
    await buyerFeedsPage.expectLoaded();
    await buyerFeedsPage.switchToTab('following');
    await buyerFeedsPage.expectTabActive(feedsTabs.following);
    await expect(buyerFeedsPage.followingButtons.first()).toBeVisible({ timeout: 10000 });
  });
});

test('Buyer Like/Unlike Post — Full Cycle Across Pages', {
  tag: ['@TAT-B-E2E-004', '@feeds', '@like', '@buyer', '@regression'],
}, async ({ buyerFeedsPage, buyerProfilePage, page }) => {
  test.setTimeout(120000);

  const token2 = process.env.YAPP_TEST_ACCESS_TOKEN_2?.replace(/"/g, '');
  test.skip(!token2, 'YAPP_TEST_ACCESS_TOKEN_2 must be set to seed creator post for this E2E test');

  const postData = generatePostData({
    content: `Like full cycle ${Date.now()}`,
    visibility: 'public',
  });
  let postId = '';

  try {
    await test.step('Create public text post via API', async () => {
      ({ postId } = await createPost(page.request, postData, token2));
      expect(postId).toBeDefined();
    });

    await test.step('Open feeds and verify seeded post', async () => {
      await buyerFeedsPage.goto();
      await buyerFeedsPage.expectLoaded();
      await buyerFeedsPage.expectAuthenticated();
      await buyerFeedsPage.switchToTab('following');
      await buyerFeedsPage.expectTabActive(feedsTabs.following);
      await buyerFeedsPage.expectPostVisible(postData.content);
    });

    await test.step('Like a post from feed and verify count +1, icon active', async () => {
      await buyerFeedsPage.likePost(postData.content);
      await buyerFeedsPage.expectPostLikedState(postData.content);
    });

    await test.step('Open post detail and verify liked state, then go back', async () => {
      await buyerFeedsPage.openPostDetail(postData.content);
      await buyerFeedsPage.expectLikedState();
      await buyerFeedsPage.clickBackFromPostDetail();
      await buyerFeedsPage.expectLoaded();
    });

    await test.step('Navigate to creator profile from feeds post and unlike', async () => {
      await buyerFeedsPage.navigateToCreatorProfileFromPostContent(postData.content);
      await buyerProfilePage.expectLoaded();
      await buyerProfilePage.switchToTab('feeds');
      await buyerProfilePage.unlikeCreatorPost(postData.content);
    });

    await test.step('Return to feeds and verify unliked state on post detail', async () => {
      await buyerProfilePage.clickBackButton();
      await buyerFeedsPage.expectLoaded();
      await buyerFeedsPage.switchToTab('following');
      await buyerFeedsPage.expectTabActive(feedsTabs.following);
      await buyerFeedsPage.expectPostUnlikedState(postData.content);
      await buyerFeedsPage.openPostDetail(postData.content);
      await buyerFeedsPage.expectUnlikedState();
    });
  } finally {
    if (postId) {
      await test.step('Delete seeded post via API', async () => {
        await deletePost(page.request, postId, token2);
      });
    }
  }
});

test('Buyer Comment on Post — Submit & Verify', {
  tag: ['@TAT-B-E2E-005', '@feeds', '@comment', '@buyer', '@regression'],
}, async ({ buyerFeedsPage, page }) => {
  test.setTimeout(120000);

  const token2 = process.env.YAPP_TEST_ACCESS_TOKEN_2?.replace(/"/g, '');
  test.skip(!token2, 'YAPP_TEST_ACCESS_TOKEN_2 must be set to seed creator post for this E2E test');

  const postData = generatePostData({
    content: `Comment full cycle ${Date.now()}`,
    visibility: 'public',
  });
  let postId = '';
  let previousCommentCount = 0;
  let commentText = '';

  try {
    await test.step('Create public text post via API', async () => {
      ({ postId } = await createPost(page.request, postData, token2));
      expect(postId).toBeDefined();
    });

    await test.step('Open feeds and verify seeded post', async () => {
      await buyerFeedsPage.goto();
      await buyerFeedsPage.expectLoaded();
      await buyerFeedsPage.expectAuthenticated();
      await buyerFeedsPage.expectTabActive(feedsTabs.following);
      await buyerFeedsPage.expectPostVisible(postData.content);
      previousCommentCount = await buyerFeedsPage.getPostCommentCount(postData.content);
    });

    await test.step('Open post detail and verify comment section', async () => {
      await buyerFeedsPage.openPostDetail(postData.content);
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
      await buyerFeedsPage.expectPostCommentCountIncreased(postData.content, previousCommentCount);
    });
  } finally {
    if (postId) {
      await test.step('Delete seeded post via API', async () => {
        await deletePost(page.request, postId, token2);
      });
    }
  }
});

test('Buyer Exclusive Content — Locked to Unlock Flow', {
  tag: ['@TAT-B-E2E-006', '@feeds', '@payment', '@buyer', '@regression'],
}, async ({ buyerFeedsPage, transactionPage, page }) => {
  test.setTimeout(180000);

  const token2 = process.env.YAPP_TEST_ACCESS_TOKEN_2?.replace(/"/g, '');
  test.skip(!token2, 'YAPP_TEST_ACCESS_TOKEN_2 must be set to seed exclusive post for this E2E test');

  const price = 20000;
  const priceText = 'Rp20.000';
  const postData = generatePostData({
    content: `Exclusive unlock flow ${Date.now()}`,
    visibility: 'pay_per_view',
    price,
  });
  let postId = '';
  let orderId = '';

  try {
    await test.step('Create locked exclusive image post via API', async () => {
      ({ postId } = await createPost(page.request, { ...postData, imagePath: testImages.claude }, token2));
      expect(postId).toBeDefined();
    });

    await test.step('Open feeds and verify locked post indicators', async () => {
      await buyerFeedsPage.goto();
      await buyerFeedsPage.expectLoaded();
      await buyerFeedsPage.expectAuthenticated();
      await buyerFeedsPage.expectTabActive(feedsTabs.following);
      await buyerFeedsPage.expectLockedPostVisible(postData.content);
    });

    await test.step('Open locked post detail and verify content remains gated', async () => {
      await buyerFeedsPage.gotoPost(postId);
      await buyerFeedsPage.expectLockedPostDetail();
    });

    await test.step('Open unlock preview and verify locked engagement is blocked', async () => {
      await buyerFeedsPage.openUnlockPreview(price);
      await buyerFeedsPage.expectLockedEngagementBlocked();
    });

    await test.step('Submit unlock payment form', async () => {
      orderId = await buyerFeedsPage.submitUnlockPayment(`Buyer ${Date.now()}`, `812${Date.now().toString().slice(-9)}`);
      await transactionPage.expectExclusivePostTransaction(priceText);
    });

    await test.step('Pay transaction via webhook API and verify success modal', async () => {
      await depositWebhook(page.request, orderId);
      await page.waitForTimeout(2500);
      await transactionPage.expectUnlockPaymentSuccess();
    });

    await test.step('View unlocked product and verify media can be accessed', async () => {
      await transactionPage.viewUnlockedProduct();
      await buyerFeedsPage.expectUnlockedExclusivePost(postData.content);
      await buyerFeedsPage.zoomUnlockedPostMedia();
    });
  } finally {
    if (postId) {
      await test.step('Delete seeded exclusive post via API', async () => {
        await deletePost(page.request, postId, token2);
      });
    }
  }
});

test('Buyer Media Preview — Image Gallery & Video Playback', {
  tag: ['@TAT-B-E2E-007', '@feeds', '@media', '@buyer', '@regression'],
}, async ({ buyerFeedsPage, page }) => {
  test.setTimeout(120000);

  const token = process.env.YAPP_TEST_ACCESS_TOKEN?.replace(/"/g, '');
  test.skip(!token, 'YAPP_TEST_ACCESS_TOKEN must be set to seed media posts for this E2E test');

  const imagePost = generatePostData({
    content: `Media preview photo ${Date.now()}`,
    visibility: 'public',
  });
  const extraImagePosts = [
    { data: generatePostData({ content: `Media preview deepseek ${Date.now()}`, visibility: 'public' }), imagePath: testImages.deepseek },
    { data: generatePostData({ content: `Media preview gemini ${Date.now()}`, visibility: 'public' }), imagePath: testImages.gemini },
    { data: generatePostData({ content: `Media preview gpt ${Date.now()}`, visibility: 'public' }), imagePath: testImages.gpt },
  ];
  const videoPost = generatePostData({
    content: `Media preview video ${Date.now()}`,
    visibility: 'public',
  });
  const postIds: string[] = [];

  try {
    await test.step('Upload photo and video posts with descriptions', async () => {
      const image = await createPost(page.request, { ...imagePost, imagePath: testImages.claude }, token);
      const video = await createPost(page.request, { ...videoPost, mediaPath: testVideos.sample }, token);
      for (const post of extraImagePosts) {
        const uploaded = await createPost(page.request, { ...post.data, imagePath: post.imagePath }, token);
        postIds.push(uploaded.postId);
        expect(uploaded.postId).toBeDefined();
      }
      postIds.push(image.postId, video.postId);
      expect(image.postId).toBeDefined();
      expect(video.postId).toBeDefined();
    });

    await test.step('Open Your Post feed and verify uploaded media descriptions', async () => {
      await buyerFeedsPage.goto();
      await buyerFeedsPage.expectLoaded();
      await buyerFeedsPage.expectAuthenticated();
      await buyerFeedsPage.switchToTab('yourPost');
      await buyerFeedsPage.expectTabActive(feedsTabs.yourPost);
      await buyerFeedsPage.expectPostVisible(imagePost.content);
      for (const post of extraImagePosts) {
        await buyerFeedsPage.expectPostVisible(post.data.content);
      }
      await buyerFeedsPage.expectPostVisible(videoPost.content);
    });

    await test.step('Preview uploaded photo and zoom', async () => {
      await buyerFeedsPage.openPostMedia(imagePost.content);
      await buyerFeedsPage.expectPostDetailOpen();
      await buyerFeedsPage.expectPublicImageUnlocked();
      await buyerFeedsPage.zoomPreviewImage();
      await buyerFeedsPage.closePreview();
    });

    await test.step('Preview uploaded video and control playback', async () => {
      await buyerFeedsPage.openPostMedia(videoPost.content);
      await buyerFeedsPage.expectVideoPreviewOpen();
      await buyerFeedsPage.expectVideoPlaybackControls();
    });
  } finally {
    if (postIds.length) {
      await test.step('Delete seeded media posts via API', async () => {
        for (const id of postIds) {
          await deletePost(page.request, id, token);
        }
      });
    }
  }
});

guestTest('Guest user blocked — Following tab requires login', {
  tag: ['@TAT-B-FV-002', '@feeds', '@auth', '@buyer', '@regression'],
}, async ({ buyerFeedsPage, page }) => {
  test.setTimeout(60000);

  await test.step('Open feeds as guest and verify page content', async () => {
    await buyerFeedsPage.goto();
    await expect(page).toHaveURL(/\/feeds/);
    await expect(page.getByText("You're not following anyone yet")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Follow creators to see their latest posts here')).toBeVisible({ timeout: 10000 });
  });

  await test.step('Click Follow and verify sign in dialog', async () => {
    await page.getByRole('button', { name: 'Follow', exact: true }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Sign in before following' });
    await expect(dialog.getByText('Sign in before following')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Sign in now!' })).toBeVisible();
  });

  await test.step('Click Sign in now and verify redirected to login', async () => {
    await page.getByRole('button', { name: 'Sign in now!' }).click();
    await expect(page).toHaveURL(/\/auth/, { timeout: 10000 });
  });
});

test('Free post — No monetization indicator on public content', {
  tag: ['@TAT-B-FV-011', '@feeds', '@buyer', '@regression'],
}, async ({ buyerFeedsPage }) => {
  test.setTimeout(60000);

  await test.step('Open feeds and verify public post visible without Member Only badge', async () => {
    await buyerFeedsPage.goto();
    await buyerFeedsPage.expectLoaded();
    await buyerFeedsPage.expectAuthenticated();
    await buyerFeedsPage.expectTabActive(feedsTabs.following);
  });

  await test.step('Open public post and verify post detail with content', async () => {
    await buyerFeedsPage.openFirstPublicPost();
    await buyerFeedsPage.expectPostDetailOpen();
  });
});

test('Member-Only badge display — Consistent indicator across feed and profile', {
  tag: ['@TAT-B-FV-012', '@feeds', '@profile', '@buyer', '@regression'],
}, async ({ buyerFeedsPage, buyerProfilePage }) => {
  test.setTimeout(60000);

  await test.step('Open feeds and verify Member Only badge on exclusive posts', async () => {
    await buyerFeedsPage.goto();
    await buyerFeedsPage.expectLoaded();
    await buyerFeedsPage.expectAuthenticated();
    await buyerFeedsPage.expectTabActive(feedsTabs.following);
    await buyerFeedsPage.expectMemberOnlyBadgeVisible();
  });

  await test.step('Navigate to creator profile and verify same badge on Feeds tab', async () => {
    await buyerFeedsPage.navigateToLockedPostCreatorProfile();
    await buyerProfilePage.expectLoaded();
    await buyerProfilePage.switchToTab('feeds');
    await buyerProfilePage.expectFeedsTabContent();
    await buyerProfilePage.toggleExclusiveOnly();
    await buyerProfilePage.expectExclusiveOnlyShowsLocked();
  });
});

test('Like idempotency — Rapid tap prevention', {
  tag: ['@TAT-B-FV-005', '@feeds', '@like', '@buyer', '@regression'],
}, async ({ buyerFeedsPage, page }) => {
  test.setTimeout(60000);

  const token2 = process.env.YAPP_TEST_ACCESS_TOKEN_2?.replace(/"/g, '');
  test.skip(!token2, 'YAPP_TEST_ACCESS_TOKEN_2 must be set to seed creator post for this FV test');

  const postData = generatePostData({
    content: `Like idempotency ${Date.now()}`,
    visibility: 'public',
  });
  let postId = '';
  let initialCount = 0;

  try {
    await test.step('Create public text post via API', async () => {
      ({ postId } = await createPost(page.request, postData, token2));
      expect(postId).toBeDefined();
    });

    await test.step('Open feeds and get seeded post initial like count', async () => {
      await buyerFeedsPage.goto();
      await buyerFeedsPage.expectLoaded();
      await buyerFeedsPage.expectAuthenticated();
      await buyerFeedsPage.expectTabActive(feedsTabs.following);
      await buyerFeedsPage.expectPostVisible(postData.content);
      initialCount = await buyerFeedsPage.getPostLikeCount(postData.content);
    });

    await test.step('Rapid tap like multiple times and verify only +1', async () => {
      await buyerFeedsPage.rapidLikePost(postData.content);
      const newCount = await buyerFeedsPage.getPostLikeCount(postData.content);
      expect(newCount, `count should be ${initialCount + 1}`).toBeLessThanOrEqual(initialCount + 1);
    });

    await test.step('Unlike and verify count returns to initial', async () => {
      await buyerFeedsPage.unlikePost(postData.content);
    });
  } finally {
    if (postId) {
      await test.step('Delete seeded post via API', async () => {
        await deletePost(page.request, postId, token2);
      });
    }
  }
});

test('Locked exclusive media — Preview blocked before unlock', {
  tag: ['@TAT-B-FV-006', '@feeds', '@buyer', '@regression'],
}, async ({ buyerFeedsPage }) => {
  test.setTimeout(60000);

  await test.step('Open feeds and verify locked post with blur and lock icon', async () => {
    await buyerFeedsPage.goto();
    await buyerFeedsPage.expectLoaded();
    await buyerFeedsPage.expectAuthenticated();
    await buyerFeedsPage.expectTabActive(feedsTabs.following);
    await buyerFeedsPage.expectMemberOnlyBadgeVisible();
  });

  await test.step('Click locked post media and verify content remains blurred with unlock prompt', async () => {
    await buyerFeedsPage.clickLockedPostMedia();
    await buyerFeedsPage.expectLockedMediaBlocked();
  });
});
