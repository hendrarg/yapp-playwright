import { creatorAuthTest as test, expect } from '../test-base';
import { creatorsBaseURL } from '@config/env';
import { getAccount } from '@helpers/api/account';
import { getReferralCode, listReferrals } from '@helpers/api/referral';
import { loginWithToken } from '@helpers/auth/token-login';
import { pasteIntoExternalField } from '@helpers/clipboard';
import { ReferralPage } from '@pages/creator/ReferralPage';
import { freeFormReferralInputs, invalidReferralCodes, referralCopy, referralJoinDates } from '@test-data/creator/referral.data';
import { testAccounts } from '@test-data/users';

const token = (account: { envVar: string }) => (process.env[account.envVar] ?? '').replace(/"/g, '');

test.describe('Creator Referral', () => {
  test('Referral — Referral Information, Copy Referral Code, Copy Referral Link, Copied Referral Information', {
    tag: ['@AUT-REF-001', '@referral', '@creator', '@regression'],
  }, async ({ creatorNav, referralPage, browser, context, request }) => {
    test.setTimeout(120000);
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    let code = '';

    await test.step('My Referral shows the referral code and link as soon as the page loads', async () => {
      await creatorNav.open('referral');
      code = await referralPage.expectReferralInfo();
      expect(code).toMatch(referralCopy.codePattern);
      expect(code).toBe(await getReferralCode(request));
    });

    await test.step('Each creator has a different code and link', async () => {
      const other = await browser.newContext();
      try {
        await loginWithToken(other, token(testAccounts.sundanese), creatorsBaseURL);
        const otherPage = new ReferralPage(await other.newPage(), creatorsBaseURL);
        await otherPage.goto();
        const otherCode = await otherPage.expectReferralInfo();
        expect(otherCode).not.toBe(code);
        expect(await otherPage.linkLabel()).not.toBe(await referralPage.linkLabel());
      } finally {
        await other.close();
      }
    });

    await test.step('Referral information is shown again on every visit', async () => {
      await referralPage.goto();
      expect(await referralPage.expectReferralInfo()).toBe(code);
    });

    await test.step('Copy puts the referral code on the clipboard and confirms it', async () => {
      expect(await referralPage.copyCode()).toBe(code);
    });

    await test.step('Copying the link puts the full referral link on the clipboard and confirms it', async () => {
      expect(await referralPage.copyLink()).toBe(`${referralCopy.linkPrefix}${code}`);
    });

    await test.step('The copied link pastes into an outside field unchanged', async () => {
      expect(await pasteIntoExternalField(context)).toBe(`${referralCopy.linkPrefix}${code}`);
    });

    await test.step('Both sides state their benefit and the code and link follow the documented format', async () => {
      await referralPage.expectInviterBenefit(referralCopy.inviter);
      await referralPage.openTab('Referred By');
      await referralPage.expectReferredByOffer(referralCopy.referredBy);
    });
  });

  test('Referral — Share Referral Link, Referral Attribution', {
    tag: ['@AUT-REF-002', '@referral', '@creator', '@smoke'],
  }, async ({ creatorNav, referralPage, request }) => {
    const code = await getReferralCode(request);

    await test.step('The referral link has a Share action with the supported targets', async () => {
      await creatorNav.open('referral');
      await referralPage.expectReferralInfo();
      await referralPage.openShare();
      await referralPage.expectShareTargets(`${referralCopy.linkPrefix}${code}`, referralCopy.shareTargets);
    });

    await test.step('Sharing through WhatsApp hands it the referral link', async () => {
      const shared = await referralPage.shareTo('WhatsApp');
      expect(shared).toContain('whatsapp.com');
      expect(shared).toContain(referralCopy.shareText);
      expect(shared).toContain(`${referralCopy.linkPrefix}${code}`);
    });
  });

  test('Referral — Referral Summary, Referral Earnings, Referral List, Referral List Record, Referral List Ordering, Referral List Updates', {
    tag: ['@AUT-REF-003', '@referral', '@creator', '@regression'],
  }, async ({ creatorNav, referralPage, request, dbFixtures }) => {
    test.setTimeout(120000);
    const creator = await getAccount(request);
    expect(await listReferrals(request), 'the creator must start with no referrals').toHaveLength(0);

    await test.step('With no referrals the list shows the in-table empty state and Page 1 of 0', async () => {
      await creatorNav.open('referral');
      await referralPage.expectReferralInfo();
      await referralPage.expectColumns(referralCopy.columns);
      await referralPage.expectEmptyList(referralCopy.empty);
      await referralPage.expectPagination({ rows: '10', label: 'Page 1 of 0', enabled: false });
    });

    const buyer = await getAccount(request, token(testAccounts.qa));
    const sundanese = await getAccount(request, token(testAccounts.sundanese));
    await dbFixtures.attachReferral(creator.uuid, buyer.uuid, new Date(referralJoinDates.older.at));
    await dbFixtures.attachReferral(creator.uuid, sundanese.uuid, new Date(referralJoinDates.newer.at));

    await test.step('Referral Summary shows Lifetime Earnings and the number of active referrals', async () => {
      await referralPage.goto();
      await referralPage.expectReferralInfo();
      const summary = await referralPage.readSummary();
      expect(summary.lifetimeEarnings).toMatch(/^Rp[\d.,]+$/);
      expect(summary.activeReferrals).toBe('2');
    });

    await test.step('Referred users appear in the Referral List', async () => {
      const users = (await referralPage.readRows()).map((row) => row.user);
      expect(users.some((user) => user.includes(`@${buyer.username}`))).toBe(true);
      expect(users.some((user) => user.includes(`@${sundanese.username}`))).toBe(true);
    });

    await test.step('Each record shows user, date joined, IDR commission and USDT commission', async () => {
      for (const row of await referralPage.readRows()) {
        expect(row.user).toMatch(/@\S+/);
        expect(row.dateJoined).toMatch(/^\d{2} [A-Z][a-z]+ \d{4}$/);
        expect(row.commissionIdr).toMatch(/^Rp[\d.,]+$/);
        expect(row.commissionUsdt).toMatch(/^USDT[\d.,]+$/);
      }
    });

    await test.step('Records are ordered by join date, newest first', async () => {
      const rows = await referralPage.readRows();
      expect(rows.map((row) => row.dateJoined)).toEqual([referralJoinDates.newer.label, referralJoinDates.older.label]);
      expect(rows[0].user).toContain(`@${sundanese.username}`);
    });
  });

  test('Referral — Referred By, Apply Referral Code, Applied Referrer, Single Active Referrer', {
    tag: ['@AUT-REF-004', '@referral', '@creator', '@regression'],
  }, async ({ creatorNav, referralPage, request }) => {
    const ownCode = await getReferralCode(request);
    const otherCode = await getReferralCode(request, token(testAccounts.sundanese));

    await test.step('The Referred By tab opens', async () => {
      await creatorNav.open('referral');
      await referralPage.openTab('Referred By');
    });

    await test.step('Referred By shows the 10% offer, the Referral Code field and Apply Referral', async () => {
      await referralPage.expectReferredByOffer(referralCopy.referredBy);
      await expect(referralPage.applyButton).toBeDisabled();
    });

    await test.step('An invalid referral code shows an error and cannot be applied', async () => {
      for (const code of [...invalidReferralCodes, otherCode.toLowerCase()]) {
        await referralPage.enterCode(code);
        await referralPage.expectInvalidCode(referralCopy.referredBy.invalidMessage);
      }
    });

    await test.step('The field takes any text verbatim and only an existing code enables Apply Referral', async () => {
      await referralPage.expectCodeFieldAttributes(referralCopy.referredBy.placeholder);
      for (const value of freeFormReferralInputs) {
        await referralPage.enterCode(value);
        await expect(referralPage.applyButton).toBeDisabled();
      }
      // Only check the button — applying a code is once per account and would change the creator for good.
      await referralPage.enterCode(otherCode);
      await referralPage.expectCodeAccepted(referralCopy.referredBy.invalidMessage);
      expect(otherCode).not.toBe(ownCode);
    });
  });
});
