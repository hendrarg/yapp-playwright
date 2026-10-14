import http from 'k6/http';
import type { RequestOptions } from './http.ts';
import { apiGet, apiUrl, headers, listOf } from './http.ts';

export interface Creator {
  uuid: string;
  username: string;
}

export interface Product {
  uuid: string;
  shortUrl: string;
  productType: string;
  price: number;
}

/**
 * Featured creators whose public profile resolves. Featured can list a creator whose
 * profile endpoints all 500 "user not found." (`testuser123`, 2026-10-14) — a broken
 * fixture, not load behaviour, so it is left out with a warning.
 */
export function workingFeaturedCreators(auth: RequestOptions): Creator[] {
  const featured = listOf<Creator>(apiGet('/api/v1/creators/featured?page=1&limit=20', 'setup: featured creators', auth))
    .filter((c) => c.uuid && c.username)
    .map(({ uuid, username }) => ({ uuid, username }));
  const probe = { headers: headers(auth), tags: { name: 'setup: profile probe' }, responseCallback: http.expectedStatuses(200, 500) };
  const working = featured.filter((c) => http.get(apiUrl(`/api/v1/account/username/${c.username}`), probe).status === 200);
  const skipped = featured.filter((c) => !working.includes(c)).map((c) => c.username);
  if (skipped.length) console.warn(`setup: skipping featured creators with a broken profile: ${skipped.join(', ')}`);
  return working;
}

export function featuredProducts(auth: RequestOptions): Product[] {
  return listOf<Product>(apiGet('/api/v1/products/featured?page=1&limit=20', 'setup: featured products', auth)).filter((p) => p.uuid);
}

export function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}
