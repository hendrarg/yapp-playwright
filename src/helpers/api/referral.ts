import type { APIRequestContext } from '@playwright/test';
import { creatorsBaseURL } from '@config/env';
import { apiUrl, getHeaders } from '@helpers/api/client';

const headers = (token?: string) => getHeaders(token, creatorsBaseURL.replace(/\/$/, ''));

/** The account's own referral code (`GET /accounts/referral`). */
export async function getReferralCode(request: APIRequestContext, token?: string): Promise<string> {
  const response = await request.get(apiUrl('/api/v1/accounts/referral'), { headers: headers(token) });
  if (!response.ok()) throw new Error(`Get referral code failed: ${response.status()} ${await response.text()}`);
  return (await response.json()).data.referralCode as string;
}

/** People who joined with the account's code, newest first (`GET /accounts/referrals`). */
export async function listReferrals(request: APIRequestContext, token?: string): Promise<Array<{ username: string; applyReferralCodeAt: string }>> {
  const response = await request.get(apiUrl('/api/v1/accounts/referrals?page=1&limit=50'), { headers: headers(token) });
  if (!response.ok()) throw new Error(`List referrals failed: ${response.status()} ${await response.text()}`);
  return (await response.json()).data.data;
}
