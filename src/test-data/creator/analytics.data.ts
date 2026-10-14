import type { RevenueSummary } from '@pages/creator/AnalyticsPage';

/** Revenue Overview cards in page order, each with the summary fields behind its amount and growth. */
export const revenueMetrics: ReadonlyArray<{ label: string; amount: keyof RevenueSummary; change: keyof RevenueSummary }> = [
  { label: 'Total Revenue', amount: 'totalRevenue', change: 'totalRevenueChange' },
  { label: 'Tipping Revenue', amount: 'totalRevenueTipping', change: 'tippingChange' },
  { label: 'Product Sales', amount: 'totalRevenueProduct', change: 'productChange' },
  { label: 'Campaign Activations', amount: 'totalRevenueCampaign', change: 'campaignChange' },
  { label: 'PPV', amount: 'totalRevenuePostPurchase', change: 'postPurchaseChange' },
  { label: 'Membership', amount: 'totalRevenueTierMembershipPurchase', change: 'tierMembershipPurchaseChange' },
  { label: 'Lifetime Access', amount: 'totalRevenuePostLifetimePurchase', change: 'postLifetimePurchaseChange' },
];

export const metricLabels = revenueMetrics.map((m) => m.label);

/** Preset ranges in the picker; day presets end today (Asia/Jakarta) and span `days` days. */
export const rangePresets = [
  { label: 'All time' },
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 14 days', days: 14 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'Last 6 months' },
  { label: 'Last 1 year' },
] as const;

/** Revenue sources with a switch over the bar chart. */
export const revenueSources = ['Tipping Revenue', 'Product Sales', 'Campaign Activations', 'PPV', 'Membership', 'Lifetime Access'] as const;

export const audienceCopy = 'How many people came, and whether that is going up or down.';

/** How a card renders an amount: `Rp` + dot thousands, no decimals. */
export function formatRupiah(amount: number): string {
  return `Rp${Math.round(amount).toLocaleString('id-ID')}`;
}

/** How a card renders growth: the absolute change to one decimal (direction is an icon). */
export function formatGrowth(change: number): string {
  return `${Math.abs(change).toFixed(1)}%`;
}

/** Today in Asia/Jakarta as YYYY-MM-DD, shifted by `offsetDays`. */
export function jakartaDate(offsetDays = 0): string {
  return new Date(Date.now() + 7 * 3600_000 + offsetDays * 86_400_000).toISOString().slice(0, 10);
}

/** react-day-picker cell name for a YYYY-MM-DD date, e.g. "Monday, October 5th, 2026". */
export function dayCellName(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  const day = date.getUTCDate();
  const suffix = day % 10 === 1 && day !== 11 ? 'st' : day % 10 === 2 && day !== 12 ? 'nd' : day % 10 === 3 && day !== 13 ? 'rd' : 'th';
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
  const month = date.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' });
  return `${weekday}, ${month} ${day}${suffix}, ${date.getUTCFullYear()}`;
}
