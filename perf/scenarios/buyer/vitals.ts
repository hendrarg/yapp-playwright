import { check } from 'k6';
import { browser } from 'k6/browser';
import type { Options } from 'k6/options';
import { env } from '../../config/env.ts';
import { scenarioFor } from '../../config/profiles.ts';
import { thresholdsFor } from '../../lib/tc.ts';
import { TCS } from './vitals.tcs.ts';
import { featuredProducts, pick, workingFeaturedCreators } from '../../lib/data.ts';

/**
 * Real-browser Core Web Vitals for the public buyer pages, as a guest: landing →
 * Explore → a creator profile → a product page. Complements Playwright (behaviour)
 * and the API scenarios (backend latency) with what the user actually waits for.
 *
 * Every VU is a whole Chromium, so keep this to the `smoke` profile on a workstation.
 * `scripts/perf-run.mjs` points k6 at Playwright's Chromium.
 */
export const options: Options = {
  scenarios: {
    buyer_vitals: { ...scenarioFor(env.profile), options: { browser: { type: 'chromium' } } },
  },
  // Google's "good" bands at p75, per page group — see vitals.tcs.ts.
  thresholds: thresholdsFor(TCS, env.profile),
};

interface SetupData {
  usernames: string[];
  productPaths: string[];
}

export function setup(): SetupData {
  const usernames = workingFeaturedCreators({}).map((c) => c.username);
  const productPaths = featuredProducts({})
    .filter((p) => p.shortUrl)
    .map((p) => `/s/${p.shortUrl}`);
  if (!usernames.length || !productPaths.length) throw new Error('setup found no creator or product page to open');
  return { usernames, productPaths };
}

/**
 * Group each metric's `url` tag into the page kinds the TCs threshold on, so every
 * creator's profile counts as one `creator-profile` series instead of one per username.
 * The patterns are mutually exclusive; the share link `/s/<short>` redirects to the
 * product URL before its vitals are recorded.
 */
function tagPageGroups(metric: { tag(opts: { name: string; matches: { url: RegExp }[] }): void }) {
  metric.tag({ name: 'landing', matches: [{ url: /^https?:\/\/[^/]+\/?$/ }] });
  metric.tag({ name: 'explore', matches: [{ url: /^https?:\/\/[^/]+\/explore\/?$/ }] });
  metric.tag({ name: 'creator-profile', matches: [{ url: /^https?:\/\/[^/]+\/(?!explore\/?$)[^/?#]+\/?$/ }] });
  metric.tag({ name: 'product', matches: [{ url: /^https?:\/\/[^/]+\/[^/?#]+\/product\/[^/?#]+/ }] });
  metric.tag({ name: 'next-image', matches: [{ url: /\/_next\/image\?/ }] });
}

export default async function (data: SetupData) {
  const pages: [string, string][] = [
    ['landing', '/'],
    ['explore', '/explore'],
    ['creator profile', `/${pick(data.usernames)}`],
    ['product', pick(data.productPaths)],
  ];
  // One tab per page: LCP and CLS are only reported when a page is hidden, and an
  // in-tab navigation does not count — reusing one tab recorded LCP for the last page only.
  // k6 allows one context per VU, so the tabs share it (and its cache, like a real visit).
  const context = await browser.newContext();
  try {
    for (const [name, path] of pages) {
      const page = await context.newPage();
      page.on('metric', tagPageGroups);
      try {
        const res = await page.goto(`${env.buyerOrigin}${path}`, { waitUntil: 'load' });
        check(res, { [`${name} page loads`]: (r) => r !== null && r.status() < 400 });
        // Let LCP settle and late layout shifts land before the tab closes.
        await page.waitForTimeout(2000);
      } finally {
        await page.close();
      }
    }
  } finally {
    await context.close();
  }
}
