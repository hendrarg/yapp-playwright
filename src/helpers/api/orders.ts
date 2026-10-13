import type { APIRequestContext } from '@playwright/test';
import { apiUrl, getHeaders } from '@helpers/api/client';

const creatorOrigin = 'https://creators-dev.yapp.ink';

/** One row of the creator Orders list (`GET /api/v1/shop/orders`). */
export interface ShopOrder {
  orderUUID: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhoneNumber: string;
  productName: string;
  productType: string;
  purchaseDate: string;
  originalPrice: number;
  priceAfterDiscount: number;
  receivedBySeller: number;
}

/** `GET /api/v1/shop/orders/{uuid}` — what Order Details renders. */
export interface ShopOrderDetail {
  uuid: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhoneNumber: string;
  productName: string;
  paymentMethod: string;
  quantity: number;
  originalPrice: number;
  priceAfterDiscount: number;
  receivedBySeller: number;
  /** Set when the buyer redeemed a promo code (name and rupiah discount). */
  promoCodeName?: string;
  promoCodeDiscount?: number;
  paidAt: string;
  createdAt: string;
}

export interface OrderSummary {
  totalEarnings: number;
  totalSales: number;
  totalEarningOnRangeTime: number;
  totalSalesOnRangeTime: number;
}

export interface OrderQuery {
  /** `YYYY-MM-DD`, local date — the page sends the same. Default: the page's All Time start. */
  start?: string;
  end?: string;
  productTypes?: string[];
}

/** The Orders page's own date bounds: All Time starts 2020-01-01; presets are today minus N days. */
export function orderDate(daysAgo = 0): string {
  const d = new Date(Date.now() - daysAgo * 864e5);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export const allTimeStart = '2020-01-01';

async function get<T>(request: APIRequestContext, path: string, token?: string): Promise<T> {
  const response = await request.get(apiUrl(path), { headers: getHeaders(token, creatorOrigin) });
  if (!response.ok()) throw new Error(`GET ${path} failed: ${response.status()} ${await response.text()}`);
  return (await response.json()).data as T;
}

export async function getOrderSummary(request: APIRequestContext, query: OrderQuery = {}, token?: string): Promise<OrderSummary> {
  return get(request, `/api/v1/shop/orders/summary?start_date=${query.start ?? allTimeStart}&end_date=${query.end ?? orderDate()}`, token);
}

/** One page of completed orders, newest first — the request the Orders list makes. */
export async function listOrders(request: APIRequestContext, query: OrderQuery & { page?: number; limit?: number } = {}, token?: string) {
  const types = query.productTypes?.length ? `&product_type=${query.productTypes.join(',')}` : '';
  return get<{ totalResults: number; totalPages: number; data: ShopOrder[] }>(request,
    `/api/v1/shop/orders?page=${query.page ?? 1}&limit=${query.limit ?? 10}&status=completed&start_date=${query.start ?? allTimeStart}&end_date=${query.end ?? orderDate()}&direction=desc${types}`, token);
}

/** Every completed order in the range (pages of 100). */
export async function listAllOrders(request: APIRequestContext, query: OrderQuery = {}, token?: string): Promise<ShopOrder[]> {
  const all: ShopOrder[] = [];
  for (let page = 1; ; page++) {
    const result = await listOrders(request, { ...query, page, limit: 100 }, token);
    all.push(...result.data);
    if (page >= result.totalPages) return all;
  }
}

export async function getOrder(request: APIRequestContext, orderUuid: string, token?: string): Promise<ShopOrderDetail> {
  return get(request, `/api/v1/shop/orders/${orderUuid}`, token);
}
