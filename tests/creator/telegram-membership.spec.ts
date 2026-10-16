import { creatorAuthTest as test, expect } from '../test-base';
import { uploadHero } from '@helpers/creator/product-editor';
import { testImages } from '@test-data/creator/post.data';

test.describe('Creator Telegram Membership', () => {
  test('Telegram Membership — Membership Duration, Lifetime Membership, Multiple Tiers, Group Mapping, Tier Editing, Tier Status', {
    tag: ['@AUT-TGM-001', '@membership', '@creator', '@smoke', '@regression'],
  }, async ({ telegramMembershipPage, page }) => {
    test.setTimeout(120000);

    await test.step('1. Setup Telegram Membership details and advance to Step 2', async () => {
      await telegramMembershipPage.goto();
      await telegramMembershipPage.expectLoaded();
      await telegramMembershipPage.fillStep1Details(
        'QA Telegram Membership VIP',
        'Automated test description for creator Telegram membership tiers.',
      );
      await uploadHero(page, testImages.gemini);
      await telegramMembershipPage.proceedToStep2();
      await telegramMembershipPage.expectPlanConfigurationLoaded();
    });

    await test.step('2. Verify standard duration presets (TC-TGM-C-007)', async () => {
      const presets = await telegramMembershipPage.getDurationPresets(0);
      expect(presets).toEqual(['1 month', '3 months', '6 months', '12 months', 'Lifetime']);
    });

    await test.step('3. Select Lifetime duration without expiry (TC-TGM-C-008)', async () => {
      await telegramMembershipPage.selectDuration(0, 'Lifetime');
    });

    await test.step('4. Verify one membership tier maps to one Telegram destination (TC-TGM-C-010)', async () => {
      await telegramMembershipPage.expectSelectedGroup(0, /Dev Yapp test/i);
    });

    await test.step('5. Edit tier details: name, description, and price (TC-TGM-C-011)', async () => {
      await telegramMembershipPage.editPlanTitle(0, 'VIP Lifetime Plan');
      await telegramMembershipPage.fillPlanDescription(0, 'Exclusive lifetime access to VIP Telegram group.');
      await telegramMembershipPage.fillPlanPrice(0, '50000');
    });

    await test.step('6. Create multiple tiers for different plans (TC-TGM-C-009)', async () => {
      await telegramMembershipPage.addAnotherPlan();
      await telegramMembershipPage.expectPlanCount(2);
    });

    await test.step('7. Verify no per-plan disable control — only Remove exists (TC-TGM-C-012, TC-TGM-C-013)', async () => {
      await telegramMembershipPage.expectNoPlanDisableToggle(1);
    });

    await test.step('8. Delete tier behavior using Remove trash icon (TC-TGM-C-018)', async () => {
      await telegramMembershipPage.removePlan(1);
      await telegramMembershipPage.expectPlanCount(1);
    });
  });
});
