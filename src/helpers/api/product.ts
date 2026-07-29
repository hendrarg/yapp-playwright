import type { APIRequestContext } from '@playwright/test';
import { expect } from '@playwright/test';
import { apiUrl, getHeaders } from '@helpers/api/post';

export async function setProductHideFromProfile(
  request: APIRequestContext,
  productUuid: string,
  isHideFromProfile: boolean,
  token?: string,
) {
  const response = await request.put(apiUrl(`/api/v1/shop/products/${productUuid}/hide-from-profile`), {
    headers: getHeaders(token),
    data: { isHideFromProfile },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
}

export async function expectProductHideFromProfile(
  request: APIRequestContext,
  productUuid: string,
  isHideFromProfile: boolean,
  token?: string,
) {
  const response = await request.get(apiUrl(`/api/v1/shop/products/${productUuid}`), {
    headers: getHeaders(token),
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  const body = await response.json();
  expect(body.data.isHideFromProfile).toBe(isHideFromProfile);
}
