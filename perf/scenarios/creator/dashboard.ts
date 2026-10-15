import { group, sleep } from 'k6';
import type { Options } from 'k6/options';
import { env } from '../../config/env.ts';
import { scenarioFor } from '../../config/profiles.ts';
import { thresholdsFor } from '../../lib/tc.ts';
import { TCS } from './dashboard.tcs.ts';
import { apiBatch, isoDate, listOf } from '../../lib/http.ts';
import type { Call } from '../../lib/http.ts';

/**
 * Creator `hendrarg` moving through the dashboard, read-only: Home (`/profile`) →
 * Products → Orders → Feeds → Messages. Each page replays the API calls the creator
 * app fires on load (captured from the browser 2026-10-14), minus
 * `GET /accounts/domain`, which answers 404 for a creator without a custom domain.
 * Every VU shares one creator account, so per-account caching flatters the numbers.
 */
export const options: Options = {
  scenarios: { creator_dashboard: scenarioFor(env.profile) },
  thresholds: thresholdsFor(TCS, env.profile),
};

const auth = { token: env.creatorToken, origin: env.creatorOrigin };

/** The layout's calls, fired on every dashboard page. */
const SHELL: Call[] = [
  ['/api/v1/accounts/sidebar-menus', 'GET /accounts/sidebar-menus'],
  ['/api/v1/notifications/unread-count', 'GET /notifications/unread-count'],
  ['/api/v1/accounts', 'GET /accounts'],
  ['/api/v1/dm/conversations?page=1&limit=20', 'GET /dm/conversations'],
];

function think() {
  sleep(2 + Math.random() * 3);
}

export function setup() {
  if (!env.creatorToken) throw new Error('YAPP_TEST_ACCESS_TOKEN (creator) is required for creator/dashboard');
}

export default function () {
  const from = isoDate(29);
  const to = isoDate();
  const range = `start_date=${from}&end_date=${to}`;

  group('home', () => {
    apiBatch(
      [
        ...SHELL,
        [`/api/v1/creator/analytics/engagement?${range}`, 'GET /creator/analytics/engagement'],
        [`/api/v1/supporter/summary?${range}`, 'GET /supporter/summary'],
        [`/api/v1/creator/analytics/earning/daily?${range}`, 'GET /creator/analytics/earning/daily'],
        [`/api/v1/creator/analytics/daily?${range}&tz=Asia%2FJakarta`, 'GET /creator/analytics/daily'],
        ['/api/v1/accounts/link-combination', 'GET /accounts/link-combination'],
        [`/api/v1/creator/analytics/summary?${range}`, 'GET /creator/analytics/summary'],
        ['/api/v1/accounts/balance?is_with_campaign=false', 'GET /accounts/balance'],
      ],
      auth,
    );
  });
  think();

  group('products', () => {
    apiBatch(
      [
        ...SHELL,
        ['/api/v1/shop/products?page=1&limit=1&status=inactive', 'GET /shop/products (count)'],
        ['/api/v1/shop/products?page=1&limit=1&status=draft', 'GET /shop/products (count)'],
        ['/api/v1/shop/products?page=1&limit=1&status=active', 'GET /shop/products (count)'],
        ['/api/v1/shop/products?page=1&limit=10&status=active', 'GET /shop/products'],
        ['/api/v1/shop/products?page=1&limit=100&status=active', 'GET /shop/products'],
        [`/api/v1/creator/analytics/products?${range}&page=1&limit=100`, 'GET /creator/analytics/products'],
        [`/api/v1/creator/analytics/products?start_date=${isoDate(59)}&end_date=${isoDate(30)}&page=1&limit=100`, 'GET /creator/analytics/products'],
      ],
      auth,
    );
  });
  think();

  group('orders', () => {
    apiBatch(
      [
        ...SHELL,
        [`/api/v1/posts/my/purchases?page=1&limit=10&${range}`, 'GET /posts/my/purchases'],
        [`/api/v1/posts/lifetime-prices/me/purchases?page=1&limit=10&${range}`, 'GET /posts/lifetime-prices/me/purchases'],
        ['/api/v1/supporter?limit=10&direction=DESC&status=completed&page=1', 'GET /supporter'],
        [`/api/v1/shop/orders/summary?start_date=2020-01-01&end_date=${to}`, 'GET /shop/orders/summary'],
        [`/api/v1/creator/analytics/earning/daily?start_date=${isoDate(6)}&end_date=${to}`, 'GET /creator/analytics/earning/daily'],
        [`/api/v1/tier-membership-purchases/my?page=1&limit=10&${range}`, 'GET /tier-membership-purchases/my'],
        [`/api/v1/shop/orders?page=1&limit=10&status=completed&start_date=2020-01-01&end_date=${to}&direction=desc`, 'GET /shop/orders'],
        ['/api/v1/supporter/leaderboard?limit=10', 'GET /supporter/leaderboard'],
      ],
      auth,
    );
  });
  think();

  group('feeds', () => {
    const [, , , , , published] = apiBatch(
      [
        ...SHELL,
        ['/api/v1/posts/lifetime-prices/me', 'GET /posts/lifetime-prices/me'],
        ['/api/v1/posts/my/posts?page=1&limit=10&type=published', 'GET /posts/my/posts'],
        ['/api/v1/posts/my/posts?page=1&limit=10&type=draft', 'GET /posts/my/posts'],
        ['/api/v1/tier-memberships?page=1&limit=10', 'GET /tier-memberships'],
      ],
      auth,
    );
    // The feed loads comments once per visible post (N+1) — kept on purpose, it is what the app does.
    const posts = listOf<{ uuid: string }>(published);
    if (posts.length) {
      apiBatch(posts.map((p): Call => [`/api/v1/posts/${p.uuid}/comments?page=1&limit=10`, 'GET /posts/:uuid/comments']), auth);
    }
  });
  think();

  group('messages', () => {
    apiBatch(
      [
        ...SHELL,
        ['/api/v1/dm/settings', 'GET /dm/settings'],
        ['/api/v1/group-chats', 'GET /group-chats'],
      ],
      auth,
    );
  });
  think();
}
