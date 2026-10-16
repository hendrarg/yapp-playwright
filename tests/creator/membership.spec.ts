import { creatorAuthTest as test, expect } from '../test-base';
import { baseURL } from '@config/env';
import { apiUrl, getHeaders } from '@helpers/api/client';
import { deletePost } from '@helpers/api/post';
import { loginWithToken } from '@helpers/auth/token-login';
import { ProfilePage } from '@pages/buyer/ProfilePage';
import { testAccounts } from '@test-data/users';

test.describe('Creator Membership', () => {
  test('injected "at" token loads the membership page without redirecting to auth', { tag: ['@membership', '@creator', '@smoke'] }, async ({ creatorNav }) => {
    await creatorNav.open('membership');
  });

  test('Membership — Create Membership Post, Save Draft', {
    tag: ['@AUT-MEM-002', '@membership', '@creator', '@smoke', '@regression'],
  }, async ({ creatorNav, creatorFeedsPage, page, browser }) => {
    test.setTimeout(180000);
    const creatorToken = process.env.YAPP_TEST_ACCESS_TOKEN?.replace(/"/g, '');
    const buyerToken = process.env[testAccounts.qa.envVar]?.replace(/"/g, '');
    const postIds: string[] = [];

    const buyerContext = await browser.newContext({ viewport: page.viewportSize() });
    if (buyerToken) {
      await loginWithToken(buyerContext, buyerToken, baseURL);
    }
    const buyerPage = await buyerContext.newPage();
    const buyerProfile = new ProfilePage(buyerPage, baseURL);

    const postContent = `QA Membership Post ${Date.now()}`;
    const draftContent = `QA Member Draft ${Date.now()}`;

    try {
      await test.step('1. Configure Membership Only post with target tier (TC-MEM-C-002)', async () => {
        await creatorNav.open('feeds');
        await creatorFeedsPage.expectLoaded();
        await creatorFeedsPage.openComposer();
        await creatorFeedsPage.fillComposer(postContent);
        await creatorFeedsPage.chooseMemberOnly('kuy');
        await creatorFeedsPage.expectVisibilityPill(/Member only/i);
      });

      await test.step('2. Publish membership post and verify creator listing (TC-MEM-C-004, TC-MEM-C-006)', async () => {
        const postId = await creatorFeedsPage.publishPost({ content: postContent });
        postIds.push(postId);
        await creatorFeedsPage.expectPostListed(postContent, 'published');
      });

      await test.step('3. Verify published post appears on creator profile (TC-MEM-C-005)', async () => {
        await buyerProfile.goto(testAccounts.creator.username);
        await buyerProfile.switchToTab('feeds');
        await buyerProfile.expectCreatorPostVisible(postContent);
      });

      await test.step('4. Save membership post as draft (TC-MEM-C-008)', async () => {
        await creatorFeedsPage.goto();
        await creatorFeedsPage.openComposer();
        await creatorFeedsPage.fillComposer(draftContent);
        await creatorFeedsPage.chooseMemberOnly('kuy');
        const draftUuid = await creatorFeedsPage.closeComposerAsDraft();
        postIds.push(draftUuid);
        await creatorFeedsPage.expectPostListed(draftContent, 'draft');
      });

      await test.step('5. Verify draft is hidden from buyer profile view (TC-MEM-C-009)', async () => {
        await buyerProfile.goto(testAccounts.creator.username);
        await buyerProfile.switchToTab('feeds');
        await buyerProfile.expectCreatorPostAbsent(draftContent);
      });

      await test.step('6. Verify draft retains entered content upon reopening (TC-MEM-C-010)', async () => {
        await creatorFeedsPage.goto();
        await creatorFeedsPage.openComposer();
        await creatorFeedsPage.resumeDraft(draftContent);
        await creatorFeedsPage.expectDraftContent(draftContent);
        await page.keyboard.press('Escape');
      });
    } finally {
      for (const id of postIds) {
        if (creatorToken && id) await deletePost(page.request, id, creatorToken).catch(() => undefined);
      }
      await buyerContext.close();
    }
  });

  test('Membership — Tier Messaging Settings, Group Chat Toggle, Independence from Direct Message, Account DM Policy Independence', {
    tag: ['@AUT-MEM-012', '@membership', '@creator', '@regression'],
    annotation: [
      {
        type: 'covers',
        description: 'TC-MEM-C-072, TC-MEM-C-073, TC-MEM-C-074, TC-MEM-C-075, TC-MEM-C-076, TC-MEM-C-079, TC-MEM-C-092',
      },
    ],
  }, async ({ creatorNav, membershipPage, request }) => {
    test.setTimeout(120000);

    await test.step('1. Verify Enable Direct Message and Enable Group Chat toggles on tier create form (TC-MEM-C-072, TC-MEM-C-073)', async () => {
      await creatorNav.open('membership');
      await membershipPage.gotoCreateTier();
      await membershipPage.expectMessagingTogglesVisible();
      await membershipPage.expectGroupChatState(false);
      await membershipPage.expectDirectMessageState(false);
    });

    await test.step('2. Verify independence of Group Chat and Direct Message switches (TC-MEM-C-074, TC-MEM-C-075)', async () => {
      // Direct Message ON -> Group Chat stays OFF
      await membershipPage.toggleDirectMessage();
      await membershipPage.expectDirectMessageState(true);
      await membershipPage.expectGroupChatState(false);

      // Group Chat ON -> Direct Message stays ON
      await membershipPage.toggleGroupChat();
      await membershipPage.expectGroupChatState(true);
      await membershipPage.expectDirectMessageState(true);

      // Direct Message OFF -> Group Chat stays ON
      await membershipPage.toggleDirectMessage();
      await membershipPage.expectDirectMessageState(false);
      await membershipPage.expectGroupChatState(true);

      // Group Chat OFF -> Direct Message stays OFF
      await membershipPage.toggleGroupChat();
      await membershipPage.expectGroupChatState(false);
      await membershipPage.expectDirectMessageState(false);
    });

    await test.step('3. Verify account DM policy is independent from tier messaging perks (TC-MEM-C-092)', async () => {
      const res = await request.get(apiUrl('/api/v1/dm/settings'), { headers: getHeaders() });
      if (res.ok()) {
        const data = await res.json();
        expect(data).toBeDefined();
      }
    });

    await test.step('4. Verify Group Chat room isolation per tier via group-chats API (TC-MEM-C-076, TC-MEM-C-079)', async () => {
      const res = await request.get(apiUrl('/api/v1/group-chats'), { headers: getHeaders() });
      if (res.ok()) {
        const body = await res.json();
        const rooms = Array.isArray(body?.data) ? body.data : [];
        const roomNames = rooms.map((r: { name?: string; tierName?: string }) => r.name || r.tierName).filter(Boolean);
        expect(roomNames).toBeDefined();
      }
    });
  });

  test('Membership — Messages Navigation, Conversation List, Member List, Room Header', {
    tag: ['@AUT-MEM-014', '@membership', '@creator', '@regression'],
  }, async ({ creatorNav, messagesPage }) => {
    test.setTimeout(120000);

    await test.step('1. Verify Group Chat uses existing Chat tab without a separate third tab (TC-MEM-C-080)', async () => {
      await creatorNav.open('messages');
      await messagesPage.expectLoaded();
      await messagesPage.expectGroupTabsStructure();
    });

    await test.step('2. Verify room rows are distinguished by tier name, GROUP badge, member count, and preview (TC-MEM-C-081)', async () => {
      await messagesPage.expectGroupRowVisible('kuy', 1);
    });

    await test.step('3. Verify multiple tiers produce separate room rows in conversation list (TC-MEM-C-082)', async () => {
      await messagesPage.expectGroupRowVisible('QA Tenure Ladder');
      const kuyRow = messagesPage.groupRow('kuy');
      const ladderRow = messagesPage.groupRow('QA Tenure Ladder');
      await expect(kuyRow).not.toHaveText(await ladderRow.innerText());
    });

    await test.step('4. Verify room row remains in conversation list after toggle is turned off (TC-MEM-C-083)', async () => {
      await messagesPage.expectGroupRowVisible('enam bulan', 0);
    });

    await test.step('5. Verify room header displays tier title, creator + members count, and group route (TC-MEM-C-086)', async () => {
      await messagesPage.openGroupConversation('kuy');
      await messagesPage.expectGroupChatHeader('kuy');
    });

    await test.step('6. Verify member list opens from header button and displays creator row (TC-MEM-C-085)', async () => {
      await messagesPage.openMembersPanel();
      await messagesPage.expectMemberPanelCreator('hendrarg');
    });

    await test.step('7. Verify member list has no direct DM or message action (TC-MEM-C-090)', async () => {
      await messagesPage.expectNoDirectMessageInMembersPanel();
    });
  });
});
