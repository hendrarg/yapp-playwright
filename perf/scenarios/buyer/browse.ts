import { group, sleep } from 'k6';
import type { Options } from 'k6/options';
import { env } from '../../config/env.ts';
import { scenarioFor } from '../../config/profiles.ts';
import { thresholdsFor } from '../../lib/tc.ts';
import { TCS } from './browse.tcs.ts';
import { featuredProducts, pick, workingFeaturedCreators } from '../../lib/data.ts';
import type { Creator } from '../../lib/data.ts';
import { apiBatch, apiGet } from '../../lib/http.ts';

/**
 * Buyer browsing journey, read-only: Explore → a creator's profile → a product
 * detail. Each page fires the API calls the buyer app makes on load (captured from
 * the browser 2026-10-14), minus `POST /view/counter/:uuid` — that one writes, and
 * replaying it under load would inflate real creators' view stats.
 * Posts carry a `viewFromExplore` counter; whether these reads bump it is unverified.
 */
export const options: Options = {
  scenarios: { buyer_browse: scenarioFor(env.profile) },
  thresholds: thresholdsFor(TCS, env.profile),
};

interface SetupData {
  productUuids: string[];
  creators: Creator[];
}

/** Discover live IDs once per run — dev data churns, so nothing is hardcoded. */
export function setup(): SetupData {
  const auth = { token: env.buyerToken };
  const creators = workingFeaturedCreators(auth);
  const productUuids = featuredProducts(auth).map((p) => p.uuid);
  if (!creators.length || !productUuids.length) {
    throw new Error(`setup found ${creators.length} creators / ${productUuids.length} products — nothing to browse`);
  }
  return { creators, productUuids };
}

/** Human think time between screens. */
function think() {
  sleep(1 + Math.random() * 2);
}

export default function (data: SetupData) {
  const auth = { token: env.buyerToken };

  group('explore', () => {
    apiBatch(
      [
        [`/api/v1/posts/explore?page=${1 + Math.floor(Math.random() * 3)}&limit=10`, 'GET /posts/explore'],
        ['/api/v1/creators/featured?page=1&limit=10', 'GET /creators/featured'],
        ['/api/v1/products/featured?page=1&limit=9', 'GET /products/featured'],
      ],
      auth,
    );
  });
  think();

  group('creator profile', () => {
    const { uuid, username } = pick(data.creators);
    apiGet(`/api/v1/account/username/${username}`, 'GET /account/username/:username', auth);
    apiBatch(
      [
        [`/api/v1/account/${uuid}/social-link`, 'GET /account/:uuid/social-link'],
        [`/api/v1/posts/user/${uuid}?visibility=public&page=1&limit=4`, 'GET /posts/user/:uuid'],
        ['/api/v1/rate/exchange', 'GET /rate/exchange'],
        // Creators who never set quick amounts get HTTP 500 with body status 404 (bug, 2026-10-14).
        [`/api/v1/account/${uuid}/quick-amounts`, 'GET /account/:uuid/quick-amounts', 'quick amount not found'],
        [`/api/v1/account/username/${username}/profile-tabs`, 'GET /account/username/:username/profile-tabs'],
        [`/api/v1/account/${uuid}/tier-memberships?page=1&limit=20`, 'GET /account/:uuid/tier-memberships'],
        [`/api/v1/account/${uuid}/link-combination`, 'GET /account/:uuid/link-combination'],
        [`/api/v1/account/${uuid}/products?page=1&limit=6`, 'GET /account/:uuid/products'],
        [`/api/v1/account/${uuid}/products/pinned?page=1&limit=100`, 'GET /account/:uuid/products/pinned'],
        [`/api/v1/lifetime-prices/${username}/check`, 'GET /lifetime-prices/:username/check'],
        [`/api/v1/account/username/${username}/profile-customization`, 'GET /account/username/:username/profile-customization'],
      ],
      auth,
    );
  });
  think();

  group('product detail', () => {
    apiGet(`/api/v1/products/${pick(data.productUuids)}`, 'GET /products/:uuid', auth);
  });
  think();
}
