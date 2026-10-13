import { authTest as test, expect } from '../test-base';
import { creatorProfile } from '@test-data/buyer/profile.data';
import { textBlockData } from '@test-data/creator/profile.data';
import { apiUrl, getHeaders, getMultipartHeaders } from '@helpers/api/client';
import { createTextBlock, deleteTextBlock } from '@helpers/api/text-block';

test.describe('Buyer Profile', () => {
  test('Profile — Public Profile Share, Tip Button, Quick Tip Amounts, Private Account', {
    tag: ['@AUT-PRF-015', '@smoke', '@profile', '@buyer'],
    annotation: [
      { type: 'covers', description: 'TC-PRF-B-009, TC-PRF-B-010, TC-PRF-B-011, TC-PRF-B-012, TC-PRF-B-013, TC-PRF-B-014, TC-PRF-B-015, TC-PRF-B-016' },
    ],
  }, async ({ buyerNav, buyerProfilePage, tipPage, request, creatorAppearance }) => {
    test.setTimeout(120000);
    const customTipLabel = 'Support Hendra Rizal';
    const enabledTips = ['Rp10.000', 'Rp20.000', 'Rp50.000'];

    await test.step('Open public profile when account is not private and verify identity', async () => {
      await buyerNav.open('profile', { handle: creatorProfile });
      await buyerProfilePage.expectAuthenticated();
      await buyerProfilePage.expectProfileAvatarVisible();
      await buyerProfilePage.expectHandleVisible('hendrarg');
    });

    await test.step('Open public profile share options and verify share modal', async () => {
      await buyerProfilePage.clickShare();
      await buyerProfilePage.expectShareOptionsVisible();
      await buyerProfilePage.page.keyboard.press('Escape');
    });

    await test.step('Do not see disabled Tip Button when creator disabled it', async () => {
      await request.put(apiUrl('/api/v1/accounts/tip-button'), {
        headers: getHeaders(),
        data: {
          isTipButton: false,
          tipButtonText: 'Send Tip',
          tipButtonTextColor: '#000000',
          tipButtonColor: '#FFFFFF',
        },
      });
      await buyerProfilePage.expectNoTipSurface();
    });

    await test.step('View enabled Tip Button with custom text and colors', async () => {
      await request.put(apiUrl('/api/v1/accounts/tip-button'), {
        headers: getHeaders(),
        data: {
          isTipButton: true,
          tipButtonText: customTipLabel,
          tipButtonTextColor: '#FFFFFF',
          tipButtonColor: '#5433FF',
        },
      });
      await buyerProfilePage.expectTipCtaLabelAfterSave(customTipLabel);
    });

    await test.step('View configured quick tip amounts in profile and tipping flow', async () => {
      await request.post(apiUrl('/api/v1/quick-amounts'), {
        headers: getHeaders(),
        data: {
          isEnabled: true,
          rules: [
            { assetID: 1, amount: 10000 },
            { assetID: 1, amount: 20000 },
            { assetID: 1, amount: 50000 },
          ],
        },
      });
      await buyerProfilePage.expectQuickTipAmountsVisible(enabledTips);
      await buyerNav.open('tip', { handle: creatorProfile });
      await tipPage.expectQuickTipAmountsVisible(enabledTips);
    });

    await test.step('Select a quick tip amount and verify it is applied', async () => {
      await buyerNav.open('profile', { handle: creatorProfile });
      await buyerProfilePage.selectTipSuggestion(enabledTips[1]);
      await buyerProfilePage.expectSendTipEnabled();
    });

    await test.step('Do not see quick amounts when disabled', async () => {
      await request.post(apiUrl('/api/v1/quick-amounts'), {
        headers: getHeaders(),
        data: {
          isEnabled: false,
          rules: [],
        },
      });
      await buyerNav.open('tip', { handle: creatorProfile });
      await tipPage.expectQuickTipAmountsHidden(enabledTips[0]);
    });
  });

  test('Profile — Support Section, Follower Count, Responsive Profile, Text Block', {
    tag: ['@AUT-PRF-016', '@regression', '@profile', '@buyer'],
    annotation: [
      { type: 'covers', description: 'TC-PRF-B-017, TC-PRF-B-018, TC-PRF-B-019, TC-PRF-B-020, TC-PRF-B-021, TC-PRF-B-022, TC-PRF-B-023' },
    ],
  }, async ({ buyerNav, buyerProfilePage, page, request, creatorAppearance }) => {
    test.setTimeout(180000);
    const createdBlocks: number[] = [];

    try {
      await test.step('Do not see hidden Support Section when creator enabled Hide Support', async () => {
        await request.put(apiUrl('/api/v1/accounts/tip-button'), {
          headers: getHeaders(),
          data: {
            isTipButton: true,
            tipButtonText: 'Support Hendra Rizal',
            tipButtonTextColor: '#FFFFFF',
            tipButtonColor: '#5433FF',
          },
        });
        await request.put(apiUrl('/api/v1/accounts'), {
          headers: getMultipartHeaders(),
          multipart: {
            name: 'Hendra Rizal',
            bio: '',
            role: 'QA Test',
            isHideFromExplore: 'false',
            isSupportPrivate: 'true',
            isEnableEngagement: 'false',
          },
        });
        await buyerNav.open('profile', { handle: creatorProfile });
        await buyerProfilePage.expectSupportSectionHidden();
      });

      await test.step('View enabled Support Section when creator disabled Hide Support', async () => {
        await request.put(apiUrl('/api/v1/accounts'), {
          headers: getMultipartHeaders(),
          multipart: {
            name: 'Hendra Rizal',
            bio: '',
            role: 'QA Test',
            isHideFromExplore: 'false',
            isSupportPrivate: 'false',
            isEnableEngagement: 'false',
          },
        });
        await buyerProfilePage.expectSupportSectionVisible();
      });

      await test.step('View follower count when allowed', async () => {
        await request.put(apiUrl('/api/v1/accounts'), {
          headers: getMultipartHeaders(),
          multipart: {
            name: 'Hendra Rizal',
            bio: '',
            role: 'QA Test',
            isHideFromExplore: 'false',
            isSupportPrivate: 'false',
            isEnableEngagement: 'true',
          },
        });
        await page.reload({ waitUntil: 'domcontentloaded' });
        await buyerProfilePage.expectFollowerCountVisible();
      });

      await test.step('View profile on supported desktop and mobile web viewports', async () => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await buyerProfilePage.expectProfileAvatarVisible();
        await page.setViewportSize({ width: 390, height: 844 });
        await buyerProfilePage.expectProfileAvatarVisible();
        await page.setViewportSize({ width: 1440, height: 900 });
      });

      await test.step('Text block rendered inline on public profile with formatting and table', async () => {
        const tableMarker = `QA-Table-${Date.now().toString().slice(-4)}`;
        const tableHtml = `<p>${tableMarker}</p>${textBlockData.tableHtml}`;
        const { block } = await createTextBlock(request, tableHtml, undefined, true);
        if (block) createdBlocks.push(block.id);
        await buyerNav.open('profile', { handle: creatorProfile });
        await buyerProfilePage.switchToTab('links');
        await buyerProfilePage.expectTextBlockTable(textBlockData.tableCells);
      });

      await test.step('Only sanitized HTML is rendered publicly without malicious execution', async () => {
        const accRes = await request.get(apiUrl('/api/v1/accounts'), { headers: getHeaders() });
        const uuid = (await accRes.json()).data.uuid;
        const pubRes = await request.get(apiUrl(`/api/v1/account/${uuid}/link-combination`), {
          headers: {
            Origin: 'https://yapp-dev.yapp.ink',
            Referer: 'https://yapp-dev.yapp.ink/',
          },
        });
        expect(pubRes.ok()).toBe(true);
        const pubData = await pubRes.json();
        const rawJson = JSON.stringify(pubData);
        for (const tag of ['<script', '<iframe', 'onerror=', 'onclick=']) {
          expect(rawJson).not.toContain(tag);
        }
        await buyerProfilePage.expectNoExecutableScripts();
      });

      await test.step('Hidden text block does not appear on public profile', async () => {
        const hiddenMarker = `QA-Hidden-${Date.now().toString().slice(-4)}`;
        const { block } = await createTextBlock(request, `<p>${hiddenMarker}</p>`, undefined, false);
        if (block) createdBlocks.push(block.id);
        await buyerProfilePage.expectNoTextBlock(hiddenMarker);
      });
    } finally {
      for (const id of createdBlocks) {
        await deleteTextBlock(request, id).catch(() => {});
      }
    }
  });
});
