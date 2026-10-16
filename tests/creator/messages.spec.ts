import { creatorAuthTest as test, expect } from '../test-base';
import { getDmPolicy, setDmPolicy } from '@helpers/api/dm';
import type { DmAccessPolicy } from '@helpers/api/dm';

test.describe('Creator Messages', () => {
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
