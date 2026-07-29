import type { APIRequestContext } from '@playwright/test';
import { creatorsBaseURL } from '@config/env';
import { apiUrl, getHeaders } from '@helpers/api/client';
import { buildBrowserLikeHeaders } from './headers';

export interface CreatePromotionOptions {
  name: string;
  discountType: string;
  discount: number;
  code: string;
  promoProductType: string;
  periodStartAt: string;
  periodEndAt: string;
  isSetAffiliate: boolean;
}

function promotionHeaders(token?: string) {
  return {
    ...getHeaders(token),
    ...buildBrowserLikeHeaders(creatorsBaseURL.replace(/\/$/, '')),
  };
}

export async function createPromotion(
  request: APIRequestContext,
  options: CreatePromotionOptions,
  token?: string,
): Promise<unknown> {
  const response = await request.post(apiUrl('/api/v1/promos'), {
    headers: promotionHeaders(token),
    data: options,
  });

  if (!response.ok()) {
    throw new Error(`Create promotion failed: ${response.status()} ${await response.text()}`);
  }

  return response.json();
}

export async function deletePromotion(
  request: APIRequestContext,
  promotionId: string,
  token?: string,
): Promise<void> {
  const response = await request.delete(apiUrl(`/api/v1/promos/${encodeURIComponent(promotionId)}`), {
    headers: promotionHeaders(token),
  });

  if (!response.ok()) {
    throw new Error(`Delete promotion failed: ${response.status()} ${await response.text()}`);
  }
}
