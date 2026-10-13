import type { APIRequestContext } from '@playwright/test';
import { apiUrl, getHeaders } from './client';
import { testAccounts } from '@test-data/users';

export interface CartItem {
  uuid: string;
  productUUID: string;
  productType: string;
  productTitle: string;
  price: number;
  quantity: number;
  status: string;
}

export async function listCartItems(request: APIRequestContext, token?: string): Promise<CartItem[]> {
  const buyerToken = token ?? process.env[testAccounts.qa.envVar]?.replace(/"/g, '');
  const response = await request.get(apiUrl('/api/v1/cart/items?page=1&limit=50'), {
    headers: getHeaders(buyerToken),
  });
  if (!response.ok()) return [];
  const data = await response.json();
  return (data.data?.data ?? []) as CartItem[];
}

export async function clearCart(request: APIRequestContext, token?: string): Promise<void> {
  const buyerToken = token ?? process.env[testAccounts.qa.envVar]?.replace(/"/g, '');
  const items = await listCartItems(request, buyerToken);
  for (const item of items) {
    await request.delete(apiUrl(`/api/v1/cart/items/${item.uuid}`), {
      headers: getHeaders(buyerToken),
    }).catch(() => {});
  }
}
