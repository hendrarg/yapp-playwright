import type { APIRequestContext } from '@playwright/test';
import { apiUrl } from '@helpers/api/client';
import { creatorsBaseURL } from '@config/env';

function creatorOrigin() {
  return creatorsBaseURL.replace(/\/$/, '');
}

function getCreatorHeaders(token?: string) {
  const t = (token ?? process.env.YAPP_TEST_ACCESS_TOKEN ?? '').replace(/"/g, '');
  const origin = creatorOrigin();
  return {
    Authorization: `Bearer ${t}`,
    'Content-Type': 'application/json',
    Origin: origin,
    Referer: `${origin}/`,
  };
}

export interface TipButtonState {
  isTipButton: boolean;
  tipButtonText: string;
  tipButtonColor: string;
  tipButtonTextColor: string;
}

export async function setTipButtonVisibility(
  request: APIRequestContext,
  visible: boolean,
  token?: string,
) {
  const headers = getCreatorHeaders(token);
  const response = await request.put(apiUrl('/api/v1/accounts/tip-button'), {
    headers,
    data: { isTipButton: visible },
  });
  if (!response.ok()) {
    throw new Error(`Set tip button visibility failed: ${response.status()} ${await response.text()}`);
  }
  return response.json();
}

export async function showTipButton(request: APIRequestContext, token?: string) {
  return setTipButtonVisibility(request, true, token);
}

export async function hideTipButton(request: APIRequestContext, token?: string) {
  return setTipButtonVisibility(request, false, token);
}
