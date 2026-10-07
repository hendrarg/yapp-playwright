import type { APIRequestContext } from '@playwright/test';
import { apiUrl, getHeaders } from '@helpers/api/client';

export type DmAccessPolicy = 'followers_and_subscribers' | 'subscriber_only' | 'none';
export type DmContentType = 'text' | 'media' | 'product' | 'campaign' | 'post' | 'tier_membership' | 'tip';

export interface DmConversation {
  conversationUUID: string;
  counterParty: { uuid: string; username: string; name: string };
  lastMessage: string;
  unreadCount: number;
}

export interface DmMessage {
  uuid: string;
  contentType: DmContentType;
  content?: string;
  sender: { uuid: string; username: string };
  readAt: string | null;
  createdAt: string;
}

export interface DmEligibility {
  accessPolicy: DmAccessPolicy;
  canMessage: boolean;
  readOnly: boolean;
  reason: string;
}

export interface DmSendOptions {
  contentType: DmContentType;
  content?: string;
  referenceUuids?: string[];
  tipAmount?: number;
  mediaUrls?: string[];
  mediaType?: string;
}

const creatorOrigin = 'https://creators-dev.yapp.ink';

async function json<T>(response: Awaited<ReturnType<APIRequestContext['get']>>, what: string): Promise<T> {
  if (!response.ok()) throw new Error(`${what} failed: ${response.status()} ${await response.text()}`);
  return (await response.json()).data as T;
}

/** The account's DM inbox (`GET /api/v1/dm/conversations`). */
export async function listConversations(request: APIRequestContext, token?: string): Promise<DmConversation[]> {
  const data = await json<{ data: DmConversation[] | null }>(
    await request.get(apiUrl('/api/v1/dm/conversations?limit=50'), { headers: getHeaders(token) }),
    'List conversations',
  );
  return data.data ?? [];
}

export async function findConversation(request: APIRequestContext, counterPartyUuid: string, token?: string) {
  return (await listConversations(request, token)).find((c) => c.counterParty.uuid === counterPartyUuid);
}

/** Newest-first page of a conversation plus whether the caller may still send. */
export async function getMessages(request: APIRequestContext, conversationUuid: string, token?: string) {
  return json<{ data: { canSend: boolean; messages: DmMessage[] } }>(
    await request.get(apiUrl(`/api/v1/dm/conversations/${conversationUuid}/messages?limit=30`), { headers: getHeaders(token) }),
    'Get messages',
  ).then((d) => d.data);
}

/**
 * Send a DM over the REST fallback the web app uses when its WebSocket is closed. Works for every
 * content type, including the creator-only cards and tip requests that broadcasts reject.
 */
export async function sendDm(request: APIRequestContext, conversationUuid: string, body: DmSendOptions, token?: string): Promise<DmMessage> {
  return json<DmMessage>(
    await request.post(apiUrl(`/api/v1/dm/conversations/${conversationUuid}/messages`), {
      headers: getHeaders(token, creatorOrigin),
      data: body,
    }),
    `Send ${body.contentType} DM`,
  );
}

/** Hide a conversation from the caller's own inbox (the ⋮ → Delete action, scope `me`). */
export async function deleteConversationForMe(request: APIRequestContext, conversationUuid: string, token?: string) {
  const response = await request.delete(apiUrl(`/api/v1/dm/conversations/${conversationUuid}`), {
    headers: getHeaders(token),
    data: { scope: 'me' },
  });
  if (!response.ok()) throw new Error(`Delete conversation failed: ${response.status()} ${await response.text()}`);
}

/** Creators the buyer may start a chat with — the "Your Subscribed Creators" list. */
export async function getBuyerDirectory(request: APIRequestContext, token?: string): Promise<Array<{ counterpartyUUID: string; tierMembershipName: string }>> {
  const data = await json<{ data: Array<{ counterpartyUUID: string; tierMembershipName: string }> | null }>(
    await request.get(apiUrl('/api/v1/dm/directories/buyer/creators'), { headers: getHeaders(token) }),
    'Buyer directory',
  );
  return data.data ?? [];
}

export async function getEligibility(request: APIRequestContext, creatorUuid: string, token?: string): Promise<DmEligibility> {
  return json<DmEligibility>(
    await request.get(apiUrl(`/api/v1/dm/creators/${creatorUuid}/eligibility`), { headers: getHeaders(token) }),
    'DM eligibility',
  );
}

export async function getDmPolicy(request: APIRequestContext, token?: string): Promise<DmAccessPolicy> {
  return (await json<{ accessPolicy: DmAccessPolicy }>(
    await request.get(apiUrl('/api/v1/dm/settings'), { headers: getHeaders(token, creatorOrigin) }),
    'DM settings',
  )).accessPolicy;
}

/** The creator's inbound messaging policy (Messaging Settings radio). */
export async function setDmPolicy(request: APIRequestContext, accessPolicy: DmAccessPolicy, token?: string) {
  const response = await request.put(apiUrl('/api/v1/dm/settings'), {
    headers: getHeaders(token, creatorOrigin),
    data: { accessPolicy },
  });
  if (!response.ok()) throw new Error(`Set DM policy failed: ${response.status()} ${await response.text()}`);
}

/**
 * Open (or reopen) the buyer's conversation with a creator — what the directory's Message button
 * does. Returns the existing conversation when there is one, even one the buyer deleted for themself.
 */
export async function startConversation(request: APIRequestContext, creatorUuid: string, buyerToken?: string): Promise<string> {
  const data = await json<{ conversationUUID: string }>(
    await request.post(apiUrl('/api/v1/dm/conversations'), {
      headers: getHeaders(buyerToken),
      data: { counterPartyUUID: creatorUuid, counterPartyRole: 'creator' },
    }),
    'Start conversation',
  );
  return data.conversationUUID;
}
