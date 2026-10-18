import { creatorAuthTest as test, expect } from '../test-base';
import { conversationStatus, deleteLabel, findConversation, getBuyerLabel, getDmPolicy, getLabels, getMessages, removeBuyerLabel, sendDm, setDmPolicy, startConversation } from '@helpers/api/dm';
import { creatorThreadLabels, generateMarkLabel, generateThreadText } from '@test-data/creator/messages.data';
import { testAccounts } from '@test-data/users';
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

  test('Messages & Broadcast — Report User, Delete Chat', {
    tag: ['@AUT-MB-009', '@messages', '@creator', '@regression'],
  }, async ({ messagesPage, page }) => {
    test.setTimeout(180000);
    const creatorToken = process.env[testAccounts.creator.envVar]?.replace(/"/g, '');
    const buyerToken = process.env[testAccounts.qa.envVar]?.replace(/"/g, '');
    test.skip(!creatorToken || !buyerToken, 'Creator and buyer tokens are required');
    if (!creatorToken || !buyerToken) return;

    // The QA buyer's thread: Sundanese's own thread with the creator is stuck read-only (dm_access_revoked).
    const conversation = await startConversation(page.request, testAccounts.creator.uuid, buyerToken);
    const before = generateThreadText();
    await sendDm(page.request, conversation, { contentType: 'text', content: before }, buyerToken);
    const buyerName = (await findConversation(page.request, testAccounts.qa.uuid, creatorToken))?.counterParty.name ?? '';
    const texts = async (token: string) => (await getMessages(page.request, conversation, token)).messages.map((m) => m.content);

    await test.step('Report User lists six reasons, Other needs details, and the report is submitted', async () => {
      await messagesPage.gotoChat(conversation);
      await messagesPage.openReport(buyerName);
      const details = generateThreadText();
      expect(await messagesPage.submitOtherReport(details)).toEqual({ category: 'other', reason: details });
    });

    await test.step('Cancel on Delete Chat keeps the history for both sides', async () => {
      await messagesPage.gotoChat(conversation);
      await messagesPage.openDeleteChat();
      await messagesPage.cancelDeleteChat();
      expect(await texts(creatorToken)).toContain(before);
      expect(await texts(buyerToken)).toContain(before);
    });

    await test.step('Delete removes the chat from the creator only', async () => {
      await messagesPage.openDeleteChat();
      await messagesPage.confirmDeleteChat();
      expect(await findConversation(page.request, testAccounts.qa.uuid, creatorToken)).toBeUndefined();
      expect(await conversationStatus(page.request, conversation, creatorToken)).toBe(404);
      expect(await texts(buyerToken)).toContain(before);
    });

    await test.step('A new buyer message brings back the same conversation with only the new messages', async () => {
      const after = generateThreadText();
      await sendDm(page.request, conversation, { contentType: 'text', content: after }, buyerToken);
      await expect.poll(async () => (await findConversation(page.request, testAccounts.qa.uuid, creatorToken))?.conversationUUID, { timeout: 20000 }).toBe(conversation);
      expect((await findConversation(page.request, testAccounts.qa.uuid, creatorToken))?.unreadCount).toBeGreaterThanOrEqual(1);
      const creatorView = await texts(creatorToken);
      expect(creatorView).toContain(after);
      expect(creatorView).not.toContain(before);
      expect(await texts(buyerToken)).toEqual(expect.arrayContaining([before, after]));
      await messagesPage.goto();
      await messagesPage.expectConversationVisible(buyerName);
    });
  });

  test('Messages & Broadcast — Buyer Tags', {
    tag: ['@AUT-MB-010', '@messages', '@creator', '@regression'],
  }, async ({ messagesPage, page }) => {
    test.setTimeout(180000);
    // TC-MB-C-036 / C-037 (predefined Top Supporter / High Tipper badges) are not automated: no predefined
    // labels exist (CL-AUT-054, CL-AUT-055).
    const creatorToken = process.env[testAccounts.creator.envVar]?.replace(/"/g, '');
    const buyerToken = process.env[testAccounts.qa.envVar]?.replace(/"/g, '');
    const otherToken = process.env[testAccounts.sundanese.envVar]?.replace(/"/g, '');
    test.skip(!creatorToken || !buyerToken || !otherToken, 'Creator, buyer and second-account tokens are required');
    if (!creatorToken || !buyerToken || !otherToken) return;

    const conversation = await startConversation(page.request, testAccounts.creator.uuid, buyerToken);
    await sendDm(page.request, conversation, { contentType: 'text', content: generateThreadText() }, buyerToken);
    const otherConversation = await startConversation(page.request, testAccounts.creator.uuid, otherToken);
    const label = generateMarkLabel(25);
    const [, color] = creatorThreadLabels.mark.colors;
    // Start untagged: a badge left on the buyer by an interrupted run would turn Add into Edit Mark Badge.
    const existing = await getBuyerLabel(page.request, testAccounts.qa.uuid, creatorToken);
    if (existing?.uuid) await removeBuyerLabel(page.request, testAccounts.qa.uuid, existing.uuid, creatorToken);

    try {
      await test.step('A 25-character custom label is created, coloured and shown on the buyer', async () => {
        expect(label).toHaveLength(25);
        await messagesPage.gotoChat(conversation);
        await messagesPage.markWithNewLabel(label, color);
        await messagesPage.expectBuyerBadge(label);
        expect(await getLabels(page.request, creatorToken)).toEqual(expect.arrayContaining([expect.objectContaining({ name: label, colorHex: color })]));
        expect((await getBuyerLabel(page.request, testAccounts.qa.uuid, creatorToken))?.name).toBe(label);
      });

      await test.step('The saved label is offered again, with its colour, on another conversation', async () => {
        await messagesPage.gotoChat(otherConversation);
        const suggestions = await messagesPage.labelSuggestions();
        expect(suggestions).toEqual(expect.arrayContaining([{ name: label, color: 'rgb(255, 0, 144)' }]));
      });

      await test.step('Removing the badge returns the buyer to untagged', async () => {
        await messagesPage.gotoChat(conversation);
        await messagesPage.removeBuyerBadge(label);
        await messagesPage.gotoChat(conversation);
        await messagesPage.expectNoBuyerBadge(label);
        expect(await getBuyerLabel(page.request, testAccounts.qa.uuid, creatorToken)).toBeNull();
      });

      await test.step('A saved label can be deleted from the picker', async () => {
        await messagesPage.deleteSavedLabel(label);
        expect((await getLabels(page.request, creatorToken)).map((l) => l.name)).not.toContain(label);
      });
    } finally {
      const leftover = (await getLabels(page.request, creatorToken).catch(() => [])).find((l) => l.name === label);
      if (leftover) {
        await removeBuyerLabel(page.request, testAccounts.qa.uuid, leftover.uuid, creatorToken).catch(() => undefined);
        await deleteLabel(page.request, leftover.uuid, creatorToken).catch(() => undefined);
      }
    }
  });
});
