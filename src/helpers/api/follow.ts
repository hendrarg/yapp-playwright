import type { APIRequestContext } from '@playwright/test';
import { apiUrl, getHeaders } from '@helpers/api/client';

/** Follow a creator as the token's account (`POST /api/v1/users/follow/{uuid}`). Already following is fine. */
export async function followUser(request: APIRequestContext, creatorUuid: string, token?: string): Promise<void> {
  const response = await request.post(apiUrl(`/api/v1/users/follow/${creatorUuid}`), { headers: getHeaders(token) });
  if (!response.ok() && response.status() !== 409) {
    throw new Error(`Follow failed: ${response.status()} ${await response.text()}`);
  }
}

/** Unfollow a creator as the token's account (`DELETE /api/v1/users/follow/{uuid}`). */
export async function unfollowUser(request: APIRequestContext, creatorUuid: string, token?: string): Promise<void> {
  const response = await request.delete(apiUrl(`/api/v1/users/follow/${creatorUuid}`), { headers: getHeaders(token) });
  if (!response.ok() && response.status() !== 404) {
    throw new Error(`Unfollow failed: ${response.status()} ${await response.text()}`);
  }
}

/** UUIDs of every account the token's account follows (`GET /api/v1/users/me/following`). */
export async function getFollowing(request: APIRequestContext, token?: string): Promise<string[]> {
  const uuids: string[] = [];
  for (let page = 1; ; page++) {
    const response = await request.get(apiUrl(`/api/v1/users/me/following?page=${page}&limit=50`), { headers: getHeaders(token) });
    if (!response.ok()) throw new Error(`Following list failed: ${response.status()} ${await response.text()}`);
    const data = (await response.json()).data ?? {};
    uuids.push(...(data.data ?? []).map((u: { uuid: string }) => u.uuid));
    if (page >= (data.totalPages ?? 1)) return uuids;
  }
}
