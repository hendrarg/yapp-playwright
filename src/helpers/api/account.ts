import type { APIRequestContext } from '@playwright/test';
import { apiUrl, getHeaders } from '@helpers/api/client';

export interface Account {
  uuid: string;
  username: string;
  name: string;
}

/** The token's own account (`GET /api/v1/accounts`). */
export async function getAccount(request: APIRequestContext, token?: string): Promise<Account> {
  const response = await request.get(apiUrl('/api/v1/accounts'), { headers: getHeaders(token) });
  if (!response.ok()) throw new Error(`Get account failed: ${response.status()} ${await response.text()}`);
  const data = (await response.json()).data ?? {};
  return { uuid: data.uuid, username: data.username, name: data.name };
}
