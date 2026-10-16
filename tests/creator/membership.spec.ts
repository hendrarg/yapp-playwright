import { creatorAuthTest as test, expect } from '../test-base';

test.describe('Creator Membership', () => {
  test('injected "at" token loads the membership page without redirecting to auth', { tag: ['@membership', '@creator', '@smoke'] }, async ({ creatorNav }) => {
    await creatorNav.open('membership');
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
