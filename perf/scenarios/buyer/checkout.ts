import { check, group, sleep } from 'k6';
import type { Options } from 'k6/options';
import { env } from '../../config/env.ts';
import { scenarioFor } from '../../config/profiles.ts';
import { thresholdsFor } from '../../lib/tc.ts';
import { TCS } from './checkout.tcs.ts';
import { featuredProducts, pick } from '../../lib/data.ts';
import { apiGet, apiWrite, listOf } from '../../lib/http.ts';

/**
 * Checkout without paying, as the QA buyer.
 *
 * - `checkout` (PROFILE load shape): product detail → `POST /orders/quote/estimation`,
 *   what `/product/:uuid/checkout` fires on load. It prices the order and creates
 *   nothing, so it parallelises safely. `Pay` / `POST /orders/quote` is never called.
 * - `cart` (always 1 VU): add → list → remove. Every VU shares the QA buyer's single
 *   cart and a repeated add answers 409 `product already exists in cart`, so cart writes
 *   cannot run concurrently on one account — this measures write latency, not cart
 *   concurrency. It also collides with E2E cart tests on the same account; do not run
 *   it alongside them.
 */
export const options: Options = {
  scenarios: {
    checkout: { ...scenarioFor(env.profile), exec: 'checkout' },
    cart: { executor: 'constant-vus', vus: 1, duration: env.profile === 'smoke' ? '1m' : '10m', exec: 'cart' },
  },
  thresholds: thresholdsFor(TCS, env.profile),
};

const auth = { token: env.buyerToken };

interface SetupData {
  productUuids: string[];
  /** Products already in the cart before the run — never touched. */
  preexisting: string[];
}

/** Paid, cart-eligible types whose estimation needs only `{productUUID, quantity, paymentMethod}`. */
const CHECKOUT_TYPES = ['digital_product', 'digital_download'];

function cartItems() {
  return listOf<{ uuid: string; productUUID: string }>(apiGet('/api/v1/cart/items?page=1&limit=50', 'GET /cart/items', auth));
}

export function setup(): SetupData {
  if (!env.buyerToken) throw new Error('YAPP_TEST_ACCESS_TOKEN_BUYER is required for buyer/checkout');
  const preexisting = cartItems().map((i) => i.productUUID);
  const productUuids = featuredProducts(auth)
    .filter((p) => CHECKOUT_TYPES.includes(p.productType) && p.price > 0 && !preexisting.includes(p.uuid))
    .map((p) => p.uuid);
  if (!productUuids.length) throw new Error('setup found no paid digital product to check out');
  return { productUuids, preexisting };
}

export function checkout(data: SetupData) {
  const productUUID = pick(data.productUuids);
  group('product detail', () => {
    apiGet(`/api/v1/products/${productUUID}`, 'GET /products/:uuid', auth);
  });
  sleep(1 + Math.random() * 2);
  group('checkout estimation', () => {
    apiWrite('POST', '/api/v1/orders/quote/estimation', 'POST /orders/quote/estimation', { productUUID, quantity: 1, paymentMethod: 'qris' }, { ...auth, expect: [200] });
  });
  sleep(2 + Math.random() * 3);
}

export function cart(data: SetupData) {
  const productUUID = pick(data.productUuids);
  group('cart', () => {
    const added = apiWrite('POST', '/api/v1/cart/items', 'POST /cart/items', { productUUID, quantity: 1 }, { ...auth, expect: [200] });
    const uuid = (added.json() as { data?: { uuid?: string } })?.data?.uuid;
    sleep(1);
    cartItems();
    sleep(1);
    if (uuid) apiWrite('DELETE', `/api/v1/cart/items/${uuid}`, 'DELETE /cart/items/:uuid', undefined, { ...auth, expect: [200] });
  });
  sleep(2);
}

/** Remove anything this run left behind (an iteration cut off between add and delete). */
export function teardown(data: SetupData) {
  for (const item of cartItems()) {
    if (data.productUuids.includes(item.productUUID) && !data.preexisting.includes(item.productUUID)) {
      apiWrite('DELETE', `/api/v1/cart/items/${item.uuid}`, 'teardown: DELETE /cart/items/:uuid', undefined, { ...auth, expect: [200] });
    }
  }
  // TC-PERF-B-005: the cart holds exactly what it held before the run.
  const after = cartItems().map((i) => i.productUUID).sort();
  check(after, { 'cart matches its pre-run state': (a) => JSON.stringify(a) === JSON.stringify([...data.preexisting].sort()) });
}
