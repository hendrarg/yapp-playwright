import { authTest as test, expect } from '../test-base';
import { getAccount } from '@helpers/api/account';
import { listCampaigns } from '@helpers/api/campaign';
import { deleteConversationForMe, findConversation, getBuyerDirectory, getDmPolicy, getEligibility, getMessages, listConversations, sendDm, setDmPolicy, startConversation } from '@helpers/api/dm';
import type { DmAccessPolicy } from '@helpers/api/dm';
import { listCreatorTiers, listTierSubscriptions } from '@helpers/api/membership';
import { createPost, deletePost } from '@helpers/api/post';
import { createDigitalProduct, deleteProduct, productSharePath } from '@helpers/api/product';
import { depositWebhook } from '@helpers/api/webhook';
import type { DbFixtures } from '@helpers/db/fixtures';
import { TierDetailPage } from '@pages/buyer/TierDetailPage';
import { messageLabels, tipRequest } from '@test-data/buyer/message.data';
import { testImages } from '@test-data/creator/post.data';
import { testAccounts } from '@test-data/users';

type APIRequestContext = Parameters<typeof sendDm>[0];
const { creator, qa: buyer, sundanese } = testAccounts;
const token = (account: { envVar: string }) => process.env[account.envVar]?.replace(/"/g, '');
const creatorToken = () => token(creator);
const buyerToken = () => token(buyer);
const phone = () => `812${Date.now().toString().slice(-9)}`;
const videoPath = 'src/test-data/assets/video.mp4';

/**
 * The buyer's DM-enabled subscription to the creator under test, pushed 30 days ahead so the
 * "active subscriber" state never depends on when the fixture was last renewed.
 */
async function activeDmSubscription(request: APIRequestContext, db: DbFixtures) {
  const held = (await listTierSubscriptions(request, buyerToken()))
    .filter((s) => s.tierMembership.creator.uuid === creator.uuid && s.tierMembership.isEnableDirectMessage)
    .sort((a, b) => b.expiredAt.localeCompare(a.expiredAt));
  expect(held.length, 'the buyer fixture should hold a DM-enabled tier of the creator').toBeGreaterThan(0);
  await db.setMembershipExpiryIn(held[0].uuid, 30);
  return held[0];
}

/** End every subscription the buyer holds to the creator (restored after the test). */
async function expireCreatorSubscriptions(request: APIRequestContext, db: DbFixtures) {
  for (const s of await listTierSubscriptions(request, buyerToken())) {
    if (s.tierMembership.creator.uuid === creator.uuid) await db.expireMembership(s.uuid);
  }
}

/** Reopen the buyer ↔ creator thread and post one creator message so it is listed for the buyer. */
async function openSubscriberThread(request: APIRequestContext, text: string): Promise<string> {
  const conversation = await startConversation(request, creator.uuid, buyerToken());
  await sendDm(request, conversation, { contentType: 'text', content: text }, creatorToken());
  return conversation;
}

/** Run with the creator's DM policy temporarily set, then put the original back. */
async function withPolicy(request: APIRequestContext, policyToken: string | undefined, policy: DmAccessPolicy, body: () => Promise<void>) {
  const original = await getDmPolicy(request, policyToken);
  await setDmPolicy(request, policy, policyToken);
  try {
    await body();
  } finally {
    await setDmPolicy(request, original, policyToken);
  }
}

test.describe('Buyer Messages', () => {
  test.beforeEach(() => {
    test.skip(!creatorToken() || !buyerToken(), 'creator and buyer tokens are required to seed the conversation');
    test.skip(process.env.YAPP_DB_FIXTURES !== '1', 'YAPP_DB_FIXTURES=1 is required to control the buyer subscription');
  });

  test('Messages & Broadcast — DM Access, Access Rules – System-Allowed DM, Messaging', {
    tag: ['@AUT-MB-019', '@messages', '@buyer', '@smoke'],
  }, async ({ messagePage, productPurchasePage, dbFixtures, page }) => {
    test.setTimeout(360000);
    // Candidate bug (not yet filed): with no active membership the conversation turns read-only
    // (dm_access_revoked) although eligibility says canMessage — B-004 and B-005 cannot send.
    test.fail(true, 'A buyer without an active membership cannot send even when the creator allows Everyone');
    const request = page.request;
    const stamp = Date.now();
    await activeDmSubscription(request, dbFixtures);
    const conversation = await openSubscriberThread(request, `Hello from the creator ${stamp}`);
    const productTitle = `DM reply product ${stamp}`;
    const product = await createDigitalProduct(request, {
      title: productTitle,
      description: 'Product card in a creator reply',
      thumbnailImagePath: testImages.claude,
      price: 15000,
      links: [{ label: 'Notes', url: 'https://example.com/notes' }],
    }, creatorToken());

    try {
      await test.step('Eligible subscriber opens the chat from the creator profile Message control', async () => {
        expect((await getEligibility(request, creator.uuid, buyerToken())).canMessage).toBe(true);
        expect(await messagePage.messageFromProfile(creator.username)).toBe(conversation);
        await messagePage.expectComposerOpen();
      });

      await test.step('Buyer text posts once and reaches the creator inbox within three seconds', async () => {
        const text = `Buyer question ${stamp}`;
        const unreadBefore = (await findConversation(request, buyer.uuid, creatorToken()))?.unreadCount ?? 0;
        await messagePage.sendText(text);
        await expect.poll(async () => (await findConversation(request, buyer.uuid, creatorToken()))?.lastMessage, {
          timeout: 3000,
          intervals: [250],
        }).toBe(text);
        expect((await findConversation(request, buyer.uuid, creatorToken()))!.unreadCount).toBeGreaterThan(unreadBefore);
        await messagePage.expectOwnMessage(text);
        const own = (await getMessages(request, conversation, buyerToken())).messages.filter((m) => m.content === text);
        expect(own, 'the message should be stored once').toHaveLength(1);
      });

      await test.step('Creator reply and rich card appear left-aligned, in order, without a refresh', async () => {
        const reply = `Creator reply ${stamp}`;
        await sendDm(request, conversation, { contentType: 'text', content: reply }, creatorToken());
        await sendDm(request, conversation, { contentType: 'product', referenceUuids: [product.productUuid] }, creatorToken());
        await messagePage.expectReceivedMessage(reply, { timestamp: false });
        await messagePage.expectReceivedMessage(productTitle);
        await messagePage.expectInOrder(reply, productTitle);
      });

      // From here the buyer has no membership, no group and no conversation — the empty inbox.
      for (const s of await listTierSubscriptions(request, buyerToken())) {
        await dbFixtures.set('tier_membership_users', s.uuid, { deleted_at: new Date() });
      }
      for (const c of await listConversations(request, buyerToken())) await deleteConversationForMe(request, c.conversationUUID, buyerToken());
      const sundaneseName = (await getAccount(request, token(sundanese))).name || sundanese.username;
      let sundaneseChat = '';

      await test.step('A creator who closes DMs drops out of the buyer directory and returns when reopened', async () => {
        await withPolicy(request, creatorToken(), 'none', async () => {
          await messagePage.goto();
          await messagePage.expectDirectoryLists(creator.username, false);
          await setDmPolicy(request, 'followers_and_subscribers', creatorToken());
          await page.reload();
          await messagePage.expectDirectoryLists(creator.username, true);
        });
      });

      await test.step('Your Subscribed Creators starts a chat and hides once a conversation exists', async () => {
        await messagePage.goto();
        await messagePage.expectEmptyInboxDirectory();
        sundaneseChat = await messagePage.messageFromDirectory(sundaneseName);
        await messagePage.goto();
        await messagePage.expectDirectoryHidden();
        await expect(messagePage.inboxRow(sundaneseName)).toBeVisible({ timeout: 20000 });
        await withPolicy(request, creatorToken(), 'followers_and_subscribers', async () => {
          expect(await messagePage.messageFromProfile(creator.username)).toBe(conversation);
        });
      });

      await test.step('A potential customer with no membership can send an inquiry', async () => {
        expect((await getEligibility(request, sundanese.uuid, buyerToken())).canMessage).toBe(true);
        await messagePage.openThread(sundaneseChat);
        await messagePage.expectComposerOpen();
        const inquiry = `Pre-sale question ${stamp}`;
        await messagePage.sendText(inquiry);
        await messagePage.expectOwnMessage(inquiry);
      });

      await test.step('A buyer with a pending order can still chat with the creator', async () => {
        await withPolicy(request, creatorToken(), 'subscriber_only', async () => {
          await productPurchasePage.openOnlineCourseCheckout(productTitle, productSharePath(product));
          await productPurchasePage.payOnlineCourseCheckout({ name: 'QA Buyer', phone: phone() });
          expect((await getEligibility(request, creator.uuid, buyerToken())).canMessage).toBe(true);
          await messagePage.openThread(conversation);
          await messagePage.expectComposerOpen();
        });
      });
    } finally {
      await deleteProduct(request, product.productUuid, creatorToken());
    }
  });

  test('Messages & Broadcast — DM Access, Expired Access, Post Card, Access Rules – System-Allowed DM, Messaging (negative & boundary)', {
    tag: ['@AUT-MB-020', '@messages', '@buyer', '@regression'],
  }, async ({ messagePage, dbFixtures, page }) => {
    test.setTimeout(300000);
    const request = page.request;
    const stamp = Date.now();
    const held = await activeDmSubscription(request, dbFixtures);
    const conversation = await openSubscriberThread(request, `Access rules ${stamp}`);
    const memberContent = `Members only update ${stamp}`;
    const memberPost = await createPost(request, {
      content: memberContent,
      visibility: 'membership_only',
      tierMembershipUuids: [held.tierMembership.uuid],
    }, creatorToken());

    try {
      await test.step('Buyer composer offers only image attachments and text, no rich cards', async () => {
        await messagePage.openThread(conversation);
        await messagePage.expectBuyerComposerControls();
      });

      await test.step('A tier without the DM benefit does not open messaging with its creator', async () => {
        const sundaneseToken = token(sundanese);
        test.skip(!sundaneseToken, 'YAPP_TEST_ACCESS_TOKEN_2 is required for the no-DM tier creator');
        const noDm = (await listTierSubscriptions(request, buyerToken()))
          .filter((s) => s.tierMembership.creator.uuid === sundanese.uuid && !s.tierMembership.isEnableDirectMessage);
        expect(noDm.length, 'the buyer fixture should hold a tier without DM from the second creator').toBeGreaterThan(0);
        for (const s of noDm) await dbFixtures.setMembershipExpiryIn(s.uuid, 30);
        const chat = await startConversation(request, sundanese.uuid, buyerToken());
        await sendDm(request, chat, { contentType: 'text', content: `No DM tier ${stamp}` }, sundaneseToken);
        await withPolicy(request, sundaneseToken, 'subscriber_only', async () => {
          const eligibility = await getEligibility(request, sundanese.uuid, buyerToken());
          expect(eligibility.canMessage).toBe(false);
          expect((await getBuyerDirectory(request, buyerToken())).some((c) => c.counterpartyUUID === sundanese.uuid)).toBe(false);
          await messagePage.openThread(chat);
          await messagePage.expectReadOnly(messageLabels.subscribersOnlyReason);
        });
      });

      await test.step('A creator who closes DMs completely leaves the thread read-only', async () => {
        await withPolicy(request, creatorToken(), 'none', async () => {
          expect(await getEligibility(request, creator.uuid, buyerToken())).toMatchObject({ canMessage: false, readOnly: true, reason: 'dm_disabled' });
          await messagePage.openThread(conversation);
          await messagePage.expectReadOnly(messageLabels.dmDisabledReason);
        });
      });

      await sendDm(request, conversation, { contentType: 'post', referenceUuids: [memberPost.postId] }, creatorToken());
      await expireCreatorSubscriptions(request, dbFixtures);

      await test.step('An expired member sees no composer, a renewal banner and Subscribe', async () => {
        await withPolicy(request, creatorToken(), 'subscriber_only', async () => {
          await messagePage.openThread(conversation);
          await messagePage.expectReadOnly(messageLabels.subscribersOnlyReason, { endedCreator: creator.username, subscribeLink: true });
          expect((await getMessages(request, conversation, buyerToken())).canSend).toBe(false);
        });
      });

      await test.step('A member-only card without the subscription asks for the tier that unlocks it', async () => {
        await messagePage.openThread(conversation);
        await messagePage.expectPostCard(memberContent, { memberOnly: true });
        await messagePage.openPostCard(memberContent, memberPost.postId);
        await messagePage.expectMembershipUnlockDialog(held.tierMembership.name);
      });
    } finally {
      await deletePost(request, memberPost.postId, creatorToken());
    }
  });

  test('Messages & Broadcast — Media, Product Card, Campaign Card, Tipping Card', {
    tag: ['@AUT-MB-021', '@messages', '@buyer', '@regression'],
  }, async ({ messagePage, tipPage, dbFixtures, page }) => {
    test.setTimeout(300000);
    const request = page.request;
    const stamp = Date.now();
    await activeDmSubscription(request, dbFixtures);
    const conversation = await openSubscriberThread(request, `Cards ${stamp}`);
    const title = `DM product card ${stamp}`;
    const product = await createDigitalProduct(request, {
      title,
      description: 'Product card',
      thumbnailImagePath: testImages.claude,
      price: 15000,
      links: [{ label: 'Notes', url: 'https://example.com/notes' }],
    }, creatorToken());
    const campaign = (await listCampaigns(request, creatorToken())).find((c) => c.isActive);
    expect(campaign, 'the creator should have an active campaign').toBeTruthy();

    try {
      await test.step('Buyer sends an image that lands inline on both sides with a photo preview', async () => {
        await messagePage.openThread(conversation);
        await messagePage.expectComposerOpen();
        await messagePage.sendAttachment(testImages.gpt);
        await messagePage.expectOwnImage();
        await expect.poll(async () => {
          const [last] = (await getMessages(request, conversation, creatorToken())).messages;
          return `${last.contentType} ${(last as { mediaType?: string }).mediaType}`;
        }, { timeout: 20000 }).toMatch(/^media image\//);
        await messagePage.expectInboxPreview(creator.username, messageLabels.photoPreview);
      });

      await test.step('Buyer sends a video that renders as a playable video', async () => {
        await messagePage.sendAttachment(videoPath);
        await messagePage.expectOwnVideo();
      });

      await sendDm(request, conversation, { contentType: 'product', referenceUuids: [product.productUuid] }, creatorToken());
      await sendDm(request, conversation, { contentType: 'campaign', referenceUuids: [campaign!.uuid] }, creatorToken());
      await sendDm(request, conversation, { contentType: 'tip', tipAmount: tipRequest.amount }, creatorToken());

      await test.step('Product card shows the product and Buy Now opens it', async () => {
        const productPage = await messagePage.expectProductCard({ title, badge: 'Digital Product', creator: creator.username, price: 'Rp15.000' });
        await messagePage.expectTabShows(productPage, title);
        await productPage.close();
      });

      await test.step('Campaign card shows the campaign and Donate Now opens the donation form', async () => {
        const donatePage = await messagePage.expectCampaignCard({ title: campaign!.title, uuid: campaign!.uuid, owner: creator.username });
        await messagePage.expectTabShows(donatePage, campaign!.title);
        await donatePage.close();
      });

      await test.step('Tip request card opens the tipping flow with the requested amount', async () => {
        await messagePage.openTipCard(creator.username, tipRequest.label);
        await tipPage.expectPageLoaded();
        await expect(tipPage.amountInput).toHaveValue(tipRequest.label);
      });
    } finally {
      await deleteProduct(request, product.productUuid, creatorToken());
    }
  });

  test('Messages & Broadcast — Post Card, Membership Card, Chat History', {
    tag: ['@AUT-MB-022', '@messages', '@buyer', '@regression'],
  }, async ({ messagePage, buyerFeedsPage, dbFixtures, page }) => {
    test.setTimeout(360000);
    const request = page.request;
    const stamp = Date.now();
    const held = await activeDmSubscription(request, dbFixtures);
    const opening = `Post cards ${stamp}`;
    const conversation = await openSubscriberThread(request, opening);
    const heldTiers = new Set((await listTierSubscriptions(request, buyerToken())).map((s) => s.tierMembership.uuid));
    const other = (await listCreatorTiers(request, creatorToken())).find((t) => t.isActive && !heldTiers.has(t.uuid));
    expect(other, 'the creator should offer an active tier the buyer does not hold').toBeTruthy();
    const content = { public: `Public card ${stamp}`, ppv: `PPV card ${stamp}`, member: `Member card ${stamp}` };
    const publicPost = await createPost(request, { content: content.public, visibility: 'public', imagePath: testImages.gpt }, creatorToken());
    const ppvPost = await createPost(request, { content: content.ppv, visibility: 'pay_per_view', price: 20000, imagePath: testImages.gpt }, creatorToken());
    const memberPost = await createPost(request, { content: content.member, visibility: 'membership_only', tierMembershipUuids: [held.tierMembership.uuid] }, creatorToken());
    for (const post of [publicPost, ppvPost, memberPost]) {
      await sendDm(request, conversation, { contentType: 'post', referenceUuids: [post.postId] }, creatorToken());
    }
    for (const tier of [held.tierMembership.uuid, other!.uuid]) {
      await sendDm(request, conversation, { contentType: 'tier_membership', referenceUuids: [tier] }, creatorToken());
    }

    try {
      await test.step('Public post card previews the post and opens it', async () => {
        await messagePage.openThread(conversation);
        await messagePage.expectPostCard(content.public, { image: true });
        await messagePage.openPostCard(content.public, publicPost.postId);
        await messagePage.expectPostOpened(content.public);
      });

      await test.step('Unpurchased PPV card is gated and Unlock Post opens the payment', async () => {
        await messagePage.openThread(conversation);
        await messagePage.expectPostCard(content.ppv, { image: true, locked: true });
        await messagePage.unlockPostFromCard(content.ppv);
        await expect(buyerFeedsPage.unlockPaymentDialog).toBeVisible({ timeout: 15000 });
        await expect(buyerFeedsPage.unlockPaymentDialog).toContainText('Rp20.000');
      });

      await test.step('Purchased PPV card opens the unlocked post', async () => {
        const orderId = await buyerFeedsPage.submitUnlockPayment('QA Buyer', phone());
        await depositWebhook(request, orderId);
        await messagePage.openThread(conversation);
        await messagePage.expectPostCard(content.ppv, { image: true });
        await messagePage.openPostCard(content.ppv, ppvPost.postId);
        await buyerFeedsPage.expectUnlockedExclusivePost(content.ppv);
      });

      await test.step('Member-only card opens the full post for a subscriber', async () => {
        await messagePage.openThread(conversation);
        await messagePage.expectPostCard(content.member, { memberOnly: true });
        await messagePage.openPostCard(content.member, memberPost.postId);
        await messagePage.expectPostOpened(content.member);
      });

      await test.step('Card for the tier the buyer holds reads Subscribed and opens My Memberships', async () => {
        await messagePage.openThread(conversation);
        await messagePage.expectTierCard(held.tierMembership.name, creator.username, messageLabels.subscribed);
        await messagePage.openSubscribedTier(held.tierMembership.name);
      });

      await test.step('Card for a different tier offers Subscribe Now', async () => {
        await messagePage.openThread(conversation);
        await messagePage.expectTierCard(other!.name, creator.username, messageLabels.subscribeNow);
        const tierPage = await messagePage.subscribeFromTierCard(other!.name, other!.uuid);
        await new TierDetailPage(tierPage, page.url()).expectPageLoaded();
        await tierPage.close();
      });

      await expireCreatorSubscriptions(request, dbFixtures);

      await test.step('A non-subscriber gets Subscribe Now on the tier card and its tier page', async () => {
        await messagePage.openThread(conversation);
        await messagePage.expectTierCard(held.tierMembership.name, creator.username, messageLabels.subscribeNow);
        const tierPage = await messagePage.subscribeFromTierCard(held.tierMembership.name, held.tierMembership.uuid);
        await new TierDetailPage(tierPage, page.url()).expectPageLoaded();
        await tierPage.close();
      });

      await test.step('After expiry the whole chat history is still there', async () => {
        await messagePage.openThread(conversation);
        await messagePage.expectHistory([opening, content.public, content.ppv, content.member]);
      });
    } finally {
      for (const post of [publicPost, ppvPost, memberPost]) await deletePost(request, post.postId, creatorToken());
    }
  });
});
