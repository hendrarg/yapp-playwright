import { creatorAuthTest as test, expect } from '../test-base';
import { creatorProfile } from '@test-data/buyer/profile.data';
import {
  generateTipLabel,
  tipButtonColors,
  tipButtonData,
} from '@test-data/creator/profile.data';
import { withPublicProfile as openPublicProfile } from '@helpers/creator/public-profile';

test.describe('Creator Tipping', () => {
  test('Tipping — Enable Tip Button, Customize Button', {
    tag: ['@AUT-TIP-001', '@smoke', '@regression', '@tip', '@creator'],
    annotation: [
      {
        type: 'covers',
        description: 'TC-TIP-C-001, TC-TIP-C-002, TC-TIP-C-003, TC-TIP-C-004, TC-TIP-C-005, TC-TIP-C-006, TC-TIP-C-019, TC-TIP-C-021',
      },
    ],
  }, async ({ creatorNav, customizePage, browser, creatorAppearance }) => {
    test.setTimeout(240000);
    const label = generateTipLabel();
    const draftLabel = generateTipLabel();

    await test.step('Verify Tip Button toggle default and configuration controls availability (TC-TIP-C-001, TC-TIP-C-004)', async () => {
      await creatorNav.open('customize');
      await customizePage.openSection('Tip Button');
      await customizePage.setTipButtonShown(true);
      await customizePage.expectTipControls();
    });

    await test.step('Verify Button Text 40-character limit, counter, and hex color inputs (TC-TIP-C-021)', async () => {
      await customizePage.fillTipLabel(tipButtonData.overflowLabel);
      await expect(customizePage.tipLabelInput).toHaveValue(tipButtonData.overflowLabel.slice(0, tipButtonData.labelMaxChars));
      await customizePage.expectTipLabelCounter(`${tipButtonData.labelMaxChars}/${tipButtonData.labelMaxChars}`);
      await customizePage.fillTipLabel(tipButtonData.label);
    });

    await test.step('Turning off Show Tip Button hides all configuration controls; draft values persist when re-enabled (TC-TIP-C-019)', async () => {
      await customizePage.fillTipLabel(draftLabel);
      await customizePage.expectPreviewText(draftLabel);
      await customizePage.setTipButtonShown(false);
      await customizePage.expectTipControlsHidden();
      await customizePage.expectPreviewWithoutText(draftLabel);
      await customizePage.setTipButtonShown(true);
      await customizePage.expectPreviewText(draftLabel);
    });

    await test.step('Preview follows color and text updates in real-time (TC-TIP-C-005, TC-TIP-C-006)', async () => {
      await customizePage.fillTipLabel(label);
      await customizePage.expectInlineTipPreview(label);
      await customizePage.expectPreviewText(label);
      await customizePage.setColor('Text Color', tipButtonColors.text);
      await customizePage.setColor('Button Left', tipButtonColors.left);
      await customizePage.setColor('Button Right', tipButtonColors.right);
      await expect.poll(async () => (await customizePage.inlineTipPreviewStyle(label)).color).toBe(customizePage.rgb(tipButtonColors.text));
      await customizePage.save();
    });

    await test.step('Save and verify public profile reflection and re-enabling (TC-TIP-C-006, TC-TIP-C-003)', async () => {
      await openPublicProfile(browser, creatorProfile, (profile) => profile.expectTipCtaLabelAfterSave(label));
    });

    await test.step('Disable Tip Button, save, and verify absence from buyer profile (TC-TIP-C-002)', async () => {
      await customizePage.setTipButtonShown(false);
      await customizePage.save();
      await openPublicProfile(browser, creatorProfile, (profile) => profile.expectNoTipSurface());
    });
  });
});
