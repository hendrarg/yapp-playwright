import { creatorAuthTest as test, expect } from '../test-base';
import { getDmPolicy, setDmPolicy } from '@helpers/api/dm';
import type { DmAccessPolicy } from '@helpers/api/dm';

test.describe('Creator Messages', () => {
  test('Messages & Broadcast — Inbox, Inbox Search', {
    tag: ['@AUT-MB-001', '@messages', '@creator', '@regression'],
  }, async ({ creatorNav, messagesPage }) => {
    test.setTimeout(120000);

    await test.step('Open Messages page, verify Chat and Broadcast tabs and active Chat tab (TC-MB-C-002)', async () => {
      await creatorNav.open('messages');
      await messagesPage.expectLoaded();
      await messagesPage.expectDefaultTabs();
    });

    await test.step('Verify conversation list renders complete metadata (TC-MB-C-001, TC-MB-C-088, TC-MB-C-093)', async () => {
      await messagesPage.expectConversationListMetadata();
    });

    await test.step('Search conversation by counterparty display name (TC-MB-C-004)', async () => {
      await messagesPage.search('Dejuan');
      await messagesPage.expectConversationVisible('Dejuan');
      await messagesPage.clearSearch();
    });

    await test.step('Search conversation with no matching keyword and restore on clear (TC-MB-C-005)', async () => {
      await messagesPage.search('zzzzzz_not_exist_99');
      await messagesPage.expectEmptySearch();
      await messagesPage.clearSearch();
      await messagesPage.expectConversationListMetadata();
    });

    await test.step('Test username search behavior (TC-MB-C-003)', async () => {
      await messagesPage.search('anthony');
      await messagesPage.clearSearch();
    });
  });

  test('Messages & Broadcast — Inbox, Input Validation, Block User, Buyer Tags, Empty State (negative & boundary)', {
    tag: ['@AUT-MB-002', '@messages', '@creator', '@regression'],
  }, async ({ creatorNav, messagesPage }) => {
    test.setTimeout(120000);

    await test.step('Open Messages page and verify empty conversation selection right pane (TC-MB-C-006, TC-MB-C-110)', async () => {
      await creatorNav.open('messages');
      await messagesPage.expectLoaded();
      await messagesPage.expectEmptyThreadPane();
    });

    await test.step('Open conversation thread and verify composer input validation (TC-MB-C-011, TC-MB-C-107)', async () => {
      await messagesPage.openFirstDirectConversation();
      await messagesPage.expectComposerValidation();
    });

    await test.step('Open Block User confirmation dialog and cancel without blocking (TC-MB-C-032, TC-MB-C-033)', async () => {
      await messagesPage.openBlockUserDialog();
      await messagesPage.cancelBlockUser();
    });

    await test.step('Verify custom tag rejects label over 25 characters (TC-MB-C-039)', async () => {
      await messagesPage.openMarkBadgeDialog();
      await messagesPage.verifyBadgeLengthBoundary();
    });
  });

  test('Messages & Broadcast — DM Settings, Conversation Management', {
    tag: ['@AUT-MB-008', '@messages', '@creator', '@regression'],
  }, async ({ creatorNav, messagesPage, page }) => {
    test.setTimeout(120000);
    const creatorToken = process.env.YAPP_TEST_ACCESS_TOKEN?.replace(/"/g, '');
    const originalPolicy: DmAccessPolicy = (await getDmPolicy(page.request, creatorToken).catch(() => 'followers_and_subscribers')) as DmAccessPolicy;

    try {
      await test.step('Open Messages page and verify Chat & Broadcast tabs (TC-MB-C-002, TC-MB-C-090)', async () => {
        await creatorNav.open('messages');
        await messagesPage.expectLoaded();
        await messagesPage.handleCoachMarkIfPresent();
      });

      await test.step('Open Messaging Settings modal and verify 3 policy options (TC-MB-C-026)', async () => {
        await messagesPage.openSettings();
        await messagesPage.expectSettingsModal();
      });

      await test.step('Enable chat for non-members (Everyone can message you) (TC-MB-C-027)', async () => {
        await messagesPage.selectPolicy('Everyone can message you.');
        await messagesPage.closeSettingsModal();
        const policy = await getDmPolicy(page.request, creatorToken);
        expect(policy).toBe('followers_and_subscribers');
      });

      await test.step('Set Subscribers-only policy from inbox switch and verify sync (TC-MB-C-091)', async () => {
        await messagesPage.toggleSubscribersOnlySwitch();
        const policy = await getDmPolicy(page.request, creatorToken);
        expect(policy).toBe('subscriber_only');
        await messagesPage.openSettings();
        await messagesPage.expectSettingsModal();
        await messagesPage.closeSettingsModal();
      });

      await test.step('Disable chat for non-members and persist across reload (TC-MB-C-028, TC-MB-C-029, TC-MB-C-092)', async () => {
        await messagesPage.openSettings();
        await messagesPage.selectPolicy('No one can message you.');
        await messagesPage.closeSettingsModal();
        const policy = await getDmPolicy(page.request, creatorToken);
        expect(policy).toBe('none');

        await page.reload();
        await messagesPage.expectLoaded();
        const reloadedPolicy = await getDmPolicy(page.request, creatorToken);
        expect(reloadedPolicy).toBe('none');
      });

      await test.step('Restore original policy', async () => {
        await setDmPolicy(page.request, originalPolicy, creatorToken);
      });

      await test.step('Open conversation thread and verify conversation options (TC-MB-C-030)', async () => {
        await messagesPage.openFirstConversation();
        await messagesPage.expectConversationOptionsMenu();
      });
    } finally {
      if (creatorToken && originalPolicy) {
        await setDmPolicy(page.request, originalPolicy, creatorToken).catch(() => undefined);
      }
    }
  });
});
