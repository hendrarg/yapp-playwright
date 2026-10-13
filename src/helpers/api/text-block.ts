import type { APIRequestContext } from '@playwright/test';
import { creatorsBaseURL } from '@config/env';
import { apiUrl, getHeaders } from '@helpers/api/client';

/** A My Page Text block — stored as a `link` row with `linkType: "text"` and its HTML in `htmlContent`. */
export interface TextBlock {
  id: number;
  htmlContent: string;
  isActive: boolean;
  linkType: string;
}

const headers = (token?: string) => getHeaders(token, creatorsBaseURL.replace(/\/$/, ''));

export interface TextBlockWrite {
  status: number;
  block: TextBlock | null;
}

export async function createTextBlock(request: APIRequestContext, htmlContent: string, token?: string): Promise<TextBlockWrite> {
  const response = await request.post(apiUrl('/api/v1/accounts/link/text'), {
    headers: headers(token),
    data: { htmlContent, isActive: false, position: 0, usedCodeView: true },
  });
  return { status: response.status(), block: response.ok() ? ((await response.json()).data as TextBlock) : null };
}

export async function updateTextBlock(request: APIRequestContext, id: number, htmlContent: string, token?: string): Promise<TextBlockWrite> {
  const response = await request.put(apiUrl(`/api/v1/accounts/link/text/${id}`), {
    headers: headers(token),
    data: { htmlContent, isActive: false, position: 0, usedCodeView: true },
  });
  return { status: response.status(), block: response.ok() ? ((await response.json()).data as TextBlock) : null };
}

/** Text blocks currently on the creator's My Page (owner view, hidden ones included). */
export async function listTextBlocks(request: APIRequestContext, token?: string): Promise<TextBlock[]> {
  const response = await request.get(apiUrl('/api/v1/accounts/link-combination?page=1&limit=100'), { headers: headers(token) });
  if (!response.ok()) throw new Error(`List links failed: ${response.status()} ${await response.text()}`);
  const rows = ((await response.json()).data?.data ?? []) as TextBlock[];
  return rows.filter((row) => row.linkType === 'text');
}

export async function findTextBlock(request: APIRequestContext, text: string, token?: string): Promise<TextBlock | undefined> {
  return (await listTextBlocks(request, token)).find((block) => block.htmlContent.includes(text));
}

/**
 * Generic link delete — Text blocks have no delete route of their own. A block that is already gone
 * answers 500 "link not exist." (not 404); that counts as deleted.
 */
export async function deleteTextBlock(request: APIRequestContext, id: number, token?: string): Promise<void> {
  const response = await request.delete(apiUrl(`/api/v1/accounts/link/${id}`), { headers: headers(token) });
  if (response.ok()) return;
  const body = await response.text();
  if (response.status() === 404 || body.includes('link not exist')) return;
  throw new Error(`Delete text block failed: ${response.status()} ${body}`);
}
