import { creatorAuthTest as test, expect } from '../test-base';
import { baseURL, creatorsBaseURL } from '@config/env';
import { getAccount } from '@helpers/api/account';
import { createDigitalProduct, deleteProduct, productSharePath } from '@helpers/api/product';
import { signInWithEmailOtp } from '@helpers/auth/otp-login';
import { loginWithToken } from '@helpers/auth/token-login';
import { buyCourseAs, checkoutWithoutPaying } from '@helpers/buyer/course-purchase';
import { ProfilePage as PublicProfilePage } from '@pages/buyer/ProfilePage';
import { AnalyticsPage, type RevenueSummary } from '@pages/creator/AnalyticsPage';
import { audienceCopy, dayCellName, formatGrowth, formatRupiah, jakartaDate, metricLabels, rangePresets, revenueMetrics, revenueSources } from '@test-data/creator/analytics.data';
import { onlineCourseMediaData } from '@test-data/creator/products.creation.data';
import { inboxAccounts, testAccounts } from '@test-data/users';

const buyerToken = () => (process.env[testAccounts.qa.envVar] ?? '').replace(/"/g, '');

/** Every card shows the amount and growth the summary response carries. */
async function expectCardsMatch(analytics: AnalyticsPage, summary: RevenueSummary) {
  const cards = await analytics.readMetrics(metricLabels);
  for (const metric of revenueMetrics) {
    expect(cards[metric.label], `${metric.label} card`).toEqual({
      value: formatRupiah(summary[metric.amount]),
      growth: formatGrowth(summary[metric.change]),
    });
  }
}

test.describe('Creator Analytics', () => {
  test('Analytics — Revenue Metrics, Growth Percentage, Latest Data, Date Filter', {
    tag: ['@AUT-ANL-001', '@analytics', '@creator', '@smoke'],
  }, async ({ analyticsPage }) => {
    test.setTimeout(180000);
    let opened: Awaited<ReturnType<AnalyticsPage['open']>>;

    await test.step('Revenue Overview shows all seven revenue metrics', async () => {
      opened = await analyticsPage.open();
      await analyticsPage.expectOverviewHeader();
      expect(Object.keys(await analyticsPage.readMetrics(metricLabels))).toEqual(metricLabels);
    });

    await test.step('Each metric shows its growth against the previous period', async () => {
      await expectCardsMatch(analyticsPage, opened.summary);
    });

    await test.step('Last 7 days recalculates the overview and its growth', async () => {
      const result = await analyticsPage.selectRange('Last 7 days', { start: jakartaDate(-6), end: jakartaDate() });
      expect(result.endDate).toBe(jakartaDate());
      expect(result.startDate).toBe(jakartaDate(-6));
      await expectCardsMatch(analyticsPage, result.summary);
    });

    await test.step('Every preset range refetches the overview for its own window', async () => {
      await analyticsPage.openRangePicker();
      await analyticsPage.expectRangeOptions(rangePresets.map((preset) => preset.label));
      await analyticsPage.expectCustomDateCalendar();
      for (const preset of rangePresets) {
        const result = await analyticsPage.selectRange(preset.label, 'days' in preset ? { start: jakartaDate(1 - preset.days), end: jakartaDate() } : undefined);
        expect(result.endDate).toBe(jakartaDate());
        if ('days' in preset) expect(result.startDate).toBe(jakartaDate(1 - preset.days));
        else expect(result.startDate < result.endDate).toBe(true);
        await expectCardsMatch(analyticsPage, result.summary);
      }
    });

    await test.step('A custom date range refetches the overview for exactly those days', async () => {
      const [start, end] = [jakartaDate(-9), jakartaDate(-5)];
      const result = await analyticsPage.selectCustomRange(dayCellName(start), dayCellName(end), { start, end });
      expect([result.startDate, result.endDate]).toEqual([start, end]);
      await expectCardsMatch(analyticsPage, result.summary);
    });

    await test.step('Update Revenue Overview with latest data on page load', async () => {
      const refreshed = await analyticsPage.open();
      expect(refreshed.summary.totalRevenue).toBeGreaterThanOrEqual(0);
      await expectCardsMatch(analyticsPage, refreshed.summary);
    });

    await test.step('Revenue counts only completed transactions across all revenue sources', async () => {
      const sumSources = opened.summary.totalRevenueProduct +
        opened.summary.totalRevenueTipping +
        opened.summary.totalRevenueCampaign +
        opened.summary.totalRevenuePostPurchase +
        opened.summary.totalRevenueTierMembershipPurchase +
        opened.summary.totalRevenuePostLifetimePurchase;
      expect(Math.abs(opened.summary.totalRevenue - sumSources)).toBeLessThanOrEqual(2);
    });
  });

  test('Analytics — Revenue Graph, Audience Metrics', {
    tag: ['@AUT-ANL-002', '@analytics', '@creator', '@regression'],
  }, async ({ analyticsPage, browser, request }) => {
    test.setTimeout(240000);
    let charted: string[] = [];

    await test.step('Turning a revenue source off hides its bars at once', async () => {
      await analyticsPage.open();
      await analyticsPage.selectRange('Last 90 days');
      for (const source of revenueSources) if ((await analyticsPage.barsIn(await analyticsPage.sourceColor(source))) > 0) charted.push(source);
      expect(charted.length, 'the last 90 days need revenue from at least two sources').toBeGreaterThanOrEqual(2);
      await analyticsPage.setSourceShown(charted[0], false);
      const color = await analyticsPage.sourceColor(charted[0]);
      await expect.poll(() => analyticsPage.barsIn(color)).toBe(0);
    });

    await test.step('Turning it back on shows its bars again', async () => {
      await analyticsPage.setSourceShown(charted[0], true);
      const color = await analyticsPage.sourceColor(charted[0]);
      await expect.poll(() => analyticsPage.barsIn(color)).toBeGreaterThan(0);
    });

    await test.step('Several enabled sources are drawn together', async () => {
      for (const source of revenueSources) await analyticsPage.setSourceShown(source, true);
      for (const source of charted) {
        const color = await analyticsPage.sourceColor(source);
        await expect.poll(() => analyticsPage.barsIn(color), { message: source }).toBeGreaterThan(0);
      }
      charted = [];
    });

    await test.step('Profile views counts every load of the public profile, not distinct people', async () => {
      const creator = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const guest = await browser.newContext();
      try {
        const signIn = await creator.newPage();
        const { token } = await signInWithEmailOtp(signIn, baseURL, inboxAccounts.emptyCreator);
        await loginWithToken(creator, token, creatorsBaseURL);
        const handle = (await getAccount(request, token)).username;
        const analytics = new AnalyticsPage(signIn, creatorsBaseURL);
        await analytics.open();
        await analytics.expectAudienceHeading(audienceCopy);
        const views = await analytics.profileViews();
        const visitor = new PublicProfilePage(await guest.newPage(), baseURL);
        for (let load = 0; load < 3; load++) {
          await visitor.goto(handle);
          await visitor.expectHandleVisible(handle);
        }
        await expect(async () => {
          await analytics.open();
          expect(await analytics.profileViews()).toBe(views + 3);
        }).toPass({ timeout: 60000, intervals: [5000] });
      } finally {
        await guest.close();
        await creator.close();
      }
    });
  });
});
