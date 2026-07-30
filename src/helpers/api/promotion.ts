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
  productUUIDs?: string[];
  maxUsed?: number | null;
}

export function getPromotionId(response: unknown): string {
  const body = response as {
    data?: { uuid?: string; id?: string };
    uuid?: string;
    id?: string;
  };
  const id = body.data?.uuid ?? body.data?.id ?? body.uuid ?? body.id;
  if (!id) throw new Error("Create promotion response did not include an ID");
  return id;
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

export async function setPromotionActiveStatus(
  request: APIRequestContext,
  promotionId: string,
  isActive: boolean,
  token?: string,
): Promise<void> {
  const response = await request.put(apiUrl(`/api/v1/promos/${encodeURIComponent(promotionId)}/status`), {
    headers: promotionHeaders(token),
    data: { isActive },
  });

  if (!response.ok()) {
    throw new Error(
      `Set promotion status failed: ${response.status()} ${await response.text()}`,
    );
  }
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
