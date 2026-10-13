import type { APIRequestContext } from '@playwright/test';
import { apiUrl, getHeaders } from '@helpers/api/client';

export interface Campaign {
  uuid: string;
  title: string;
  isActive: boolean;
  target: number;
  completedDonation: number;
  shortUrl?: string;
}

/** The token's creator campaigns (`GET /api/v1/campaigns`). */
export async function listCampaigns(request: APIRequestContext, token?: string): Promise<Campaign[]> {
  const response = await request.get(apiUrl('/api/v1/campaigns?limit=20'), { headers: getHeaders(token) });
  if (!response.ok()) throw new Error(`List campaigns failed: ${response.status()} ${await response.text()}`);
  return (await response.json()).data?.data ?? [];
}

export async function findCampaignByTitle(request: APIRequestContext, title: string, token?: string): Promise<Campaign | undefined> {
  const response = await request.get(apiUrl(`/api/v1/campaigns?limit=50&title=${encodeURIComponent(title)}`), { headers: getHeaders(token) });
  if (!response.ok()) throw new Error(`Find campaign failed: ${response.status()} ${await response.text()}`);
  return ((await response.json()).data?.data ?? []).find((row: Campaign) => row.title === title);
}

export async function getCampaign(request: APIRequestContext, uuid: string, token?: string): Promise<Campaign> {
  const response = await request.get(apiUrl(`/api/v1/campaigns/${uuid}`), { headers: getHeaders(token) });
  if (!response.ok()) throw new Error(`Get campaign failed: ${response.status()} ${await response.text()}`);
  return (await response.json()).data;
}

/** Campaigns have no delete control in the UI. The API delete removes a row created by a test. */
export async function deleteCampaign(request: APIRequestContext, uuid: string, token?: string): Promise<void> {
  const response = await request.delete(apiUrl(`/api/v1/campaigns/${uuid}`), { headers: getHeaders(token) });
  if (!response.ok()) throw new Error(`Delete campaign failed: ${response.status()} ${await response.text()}`);
}
