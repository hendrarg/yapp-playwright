import type { APIRequestContext } from '@playwright/test';
import { apiUrl, getHeaders } from '@helpers/api/client';

export interface Campaign {
  uuid: string;
  title: string;
  isActive: boolean;
  target: number;
  completedDonation: number;
}

/** The token's creator campaigns (`GET /api/v1/campaigns`). */
export async function listCampaigns(request: APIRequestContext, token?: string): Promise<Campaign[]> {
  const response = await request.get(apiUrl('/api/v1/campaigns?limit=20'), { headers: getHeaders(token) });
  if (!response.ok()) throw new Error(`List campaigns failed: ${response.status()} ${await response.text()}`);
  return (await response.json()).data?.data ?? [];
}
