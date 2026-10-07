import type { APIRequestContext } from '@playwright/test';
import { apiUrl, getHeaders } from '@helpers/api/client';

/** One tier the token's account subscribes to (`GET /api/v1/tier-membership-users`). */
export interface TierSubscription {
  /** The subscription row — what `DbFixtures.expireMembership` takes. */
  uuid: string;
  expiredAt: string;
  tierMembership: { uuid: string; name: string; isEnableDirectMessage: boolean; creator: { uuid: string; username: string } };
}

export interface CreatorTier {
  uuid: string;
  name: string;
  isActive: boolean;
  isEnableDirectMessage: boolean;
  prices: Array<{ durationMonth: number; priceIDR: number }>;
}

export async function listTierSubscriptions(request: APIRequestContext, token?: string): Promise<TierSubscription[]> {
  const response = await request.get(apiUrl('/api/v1/tier-membership-users?limit=50'), { headers: getHeaders(token) });
  if (!response.ok()) throw new Error(`List tier subscriptions failed: ${response.status()} ${await response.text()}`);
  return (await response.json()).data?.data ?? [];
}

/** The tiers the token's creator account offers. */
export async function listCreatorTiers(request: APIRequestContext, token?: string): Promise<CreatorTier[]> {
  const response = await request.get(apiUrl('/api/v1/tier-memberships?limit=50'), { headers: getHeaders(token) });
  if (!response.ok()) throw new Error(`List tiers failed: ${response.status()} ${await response.text()}`);
  return (await response.json()).data?.data ?? [];
}
