import type { APIRequestContext } from '@playwright/test';
import { apiUrl, getHeaders } from '@helpers/api/client';

export interface FeaturedCreator {
  name: string;
  username: string;
}

/** Creators For You, in display order (`GET /api/v1/creators/featured`). */
export async function getFeaturedCreators(request: APIRequestContext, token?: string, limit = 10): Promise<FeaturedCreator[]> {
  const response = await request.get(apiUrl(`/api/v1/creators/featured?page=1&limit=${limit}`), { headers: getHeaders(token) });
  if (!response.ok()) throw new Error(`Featured creators failed: ${response.status()} ${await response.text()}`);
  const list = (await response.json()).data?.data ?? [];
  return list.map((c: { name: string; username: string }) => ({ name: c.name, username: c.username }));
}

/**
 * Popular Products, in the curated order: `featuredProductPosition` ascending, unpositioned last
 * (`GET /api/v1/products/featured`). Popularity is a manual curation, not a ranking.
 */
export async function getFeaturedProductTitles(request: APIRequestContext, token?: string, limit = 9): Promise<string[]> {
  const response = await request.get(apiUrl(`/api/v1/products/featured?page=1&limit=${limit}`), { headers: getHeaders(token) });
  if (!response.ok()) throw new Error(`Featured products failed: ${response.status()} ${await response.text()}`);
  const list: Array<{ title: string; featuredProductPosition?: number | null }> = (await response.json()).data?.data ?? [];
  return [...list]
    .sort((a, b) => (a.featuredProductPosition ?? Infinity) - (b.featuredProductPosition ?? Infinity))
    .map((p) => p.title);
}
