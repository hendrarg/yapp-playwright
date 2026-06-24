import type { APIRequestContext } from '@playwright/test';

/**
 * Generic API seeding helper — create a resource and return its ID.
 * Automatically registers cleanup via `delete` after the test.
 *
 * @example
 * // In a test:
 * const productId = await seedResource(request, '/api/products', { name: 'Widget' });
 * // ... test UI ...
 * // Cleanup is automatic via test.afterEach
 */

type SeedResult = { id: string | number;[key: string]: unknown };

const cleanupQueue: Array<{ request: APIRequestContext; url: string }> = [];

/**
 * Seed a resource via POST and queue cleanup via DELETE.
 * Returns the created resource body.
 */
export async function seedResource(
  request: APIRequestContext,
  endpoint: string,
  data: Record<string, unknown>
): Promise<SeedResult> {
  const response = await request.post(endpoint, { data });
  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`Seed failed: POST ${endpoint} → ${response.status()} ${body}`);
  }
  const resource = await response.json();
  const deleteUrl = `${endpoint}/${resource.id}`;
  cleanupQueue.push({ request, url: deleteUrl });
  return resource;
}

/**
 * Run all queued cleanups. Call in afterEach or afterAll.
 */
export async function runCleanup() {
  const items = cleanupQueue.splice(0);
  for (const { request, url } of items) {
    await request.delete(url).catch(() => {
      // Resource may already be deleted or not found — ignore
    });
  }
}
