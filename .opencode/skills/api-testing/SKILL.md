---
name: api-testing
description: Pure API testing with Playwright request fixture — no browser, fast, integrated with Yapp auth conventions
---

## When to use
Use when you need to:
- Test REST API endpoints directly (GET, POST, PUT, PATCH, DELETE)
- Validate response status, headers, body structure
- Seed data via API for E2E tests (10-100x faster than UI setup)
- Test error responses (400, 401, 403, 404, 409)
- Run contract/schema regression tests
- Test business logic in isolation from UI

---

## 1. Quick start — API fixture

Use `api.fixtures.ts` for pre-authenticated request contexts:

```typescript
import { test, expect } from '../../src/fixtures/api.fixtures';

test('GET buyer profile',
  { tag: ['@api', '@buyer', '@smoke', '@profile'] },
  async ({ buyerRequest }) => {
    const response = await buyerRequest.get('/api/profile');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');

    const body = await response.json();
    expect(body).toMatchObject({
      id: expect.any(Number),
      name: expect.any(String),
    });
  });
```

### How auth works

`buyerRequest` and `creatorRequest` auto-inject:
- `Cookie: at=<YAPP_TEST_ACCESS_TOKEN>` (from `.env`)
- `Origin`, `Referer`, `User-Agent` headers (WAF bypass via `buildBrowserLikeHeaders`)
- `baseURL` = `YAPP_BASE_URL` or `YAPP_CREATORS_BASE_URL`

No browser is launched. The test runs in milliseconds.

---

## 2. Test file structure

```
tests/api/
  buyer.example.spec.ts    ← buyer API tests
  creator.example.spec.ts   ← creator API tests
```

API tests use `test.describe` per resource and method:

```typescript
import { test, expect } from '../../src/fixtures/api.fixtures';

test.describe('Products API', () => {
  test.describe('GET /api/products', () => {
    test('returns product list', async ({ creatorRequest }) => { ... });
    test('filters by category', async ({ creatorRequest }) => { ... });
  });

  test.describe('POST /api/products', () => {
    test('creates product with valid data', async ({ creatorRequest }) => { ... });
    test('rejects empty name', async ({ creatorRequest }) => { ... });
  });
});
```

---

## 3. CRUD pattern

```typescript
test('CRUD: create → read → update → delete',
  { tag: ['@api', '@creator', '@smoke', '@products'] },
  async ({ creatorRequest }) => {
    // CREATE
    const createResp = await creatorRequest.post('/api/products', {
      data: { name: 'Test Widget', price: 19.99 },
    });
    expect(createResp.status()).toBe(201);
    const created = await createResp.json();

    // READ
    const getResp = await creatorRequest.get(`/api/products/${created.id}`);
    expect(getResp.status()).toBe(200);
    expect(await getResp.json()).toMatchObject({ name: 'Test Widget' });

    // UPDATE
    const updateResp = await creatorRequest.patch(`/api/products/${created.id}`, {
      data: { price: 29.99 },
    });
    expect(updateResp.ok()).toBeTruthy();

    // DELETE
    const deleteResp = await creatorRequest.delete(`/api/products/${created.id}`);
    expect(deleteResp.status()).toBe(204);
  });
```

---

## 4. Error response testing

Test every HTTP error the API can return:

```typescript
test.describe('Error responses', () => {
  test('400 — validation error', async ({ creatorRequest }) => {
    const resp = await creatorRequest.post('/api/products', {
      data: { name: '' }, // invalid
    });
    expect(resp.status()).toBe(400);
  });

  test('401 — missing auth', async ({ playwright }) => {
    // Create clean context without auth
    const unauthContext = await playwright.request.newContext({
      baseURL: process.env.YAPP_CREATORS_BASE_URL,
    });
    const resp = await unauthContext.get('/api/products');
    expect(resp.status()).toBe(401);
    await unauthContext.dispose();
  });

  test('404 — not found', async ({ creatorRequest }) => {
    const resp = await creatorRequest.get('/api/products/999999');
    expect(resp.status()).toBe(404);
  });
});
```

---

## 5. Response assertion patterns

```typescript
test('assertion patterns', async ({ buyerRequest }) => {
  const response = await buyerRequest.get('/api/profile');

  // Always check status first
  expect(response.status()).toBe(200);
  expect(response.ok()).toBeTruthy();

  // Check critical headers
  expect(response.headers()['content-type']).toContain('application/json');

  const body = await response.json();

  // Partial match — ignore fields you don't care about
  expect(body).toMatchObject({
    id: expect.any(Number),
    name: expect.any(String),
    email: expect.stringContaining('@'),
  });

  // Exact match on specific fields
  expect(typeof body.id).toBe('number');

  // Array content
  expect(body.tags).toEqual(expect.arrayContaining(['tag1']));

  // Nested object
  expect(body.settings).toMatchObject({
    theme: expect.any(String),
  });
});
```

---

## 6. API data seeding (for E2E tests)

Use `@helpers/api/seed` to seed data via API before UI tests:

```typescript
import { authTest as test, expect } from '../test-base';
import { seedResource, runCleanup } from '@helpers/api/seed';
import { generateProduct } from '@test-data/creator/product.data';

test.describe('Product dashboard', () => {
  test.afterEach(async () => {
    await runCleanup(); // Auto-deletes all seeded resources
  });

  test('displays seeded product on dashboard',
    { tag: ['@products', '@creator', '@regression'] },
    async ({ page, productsPage }) => {
      const product = generateProduct();
      const seeded = await seedResource(page.request, '/api/products', product);

      await productsPage.goto();
      await expect(page.getByText(product.name)).toBeVisible();
    });
});
```

> Note: `page.request` shares browser context cookies — use it when you need browser-auth for API calls. For pure API tests (no browser), use the `buyerRequest`/`creatorRequest` fixture instead.

---

## 7. Hybrid E2E+API pattern

Seed via API, verify in browser, cleanup via API:

```typescript
import { authTest as test, expect } from '../test-base';

test('hybrid: seed API → verify UI → cleanup API',
  { tag: ['@products', '@creator', '@regression'] },
  async ({ page, request, productsPage }) => {
    // 1. Seed via API
    const resp = await request.post('/api/products', {
      data: { name: `Test ${Date.now()}`, price: 42 },
      headers: {
        Cookie: `at=${process.env.YAPP_TEST_ACCESS_TOKEN}`,
        Origin: process.env.YAPP_CREATORS_BASE_URL!,
        Referer: `${process.env.YAPP_CREATORS_BASE_URL}/`,
      },
    });
    expect(resp.ok()).toBeTruthy();
    const product = await resp.json();

    // 2. Verify via browser
    await productsPage.goto();
    await expect(page.getByText(product.name)).toBeVisible();

    // 3. Cleanup via API
    await request.delete(`/api/products/${product.id}`);
  });
```

---

## 8. Config

Add to `playwright.config.ts`:

```typescript
{
  name: 'api',
  testDir: './tests/api',
  use: {
    // No browserName — uses request fixture only
  },
}
```

Run: `npx playwright test --project=api`

---

## Anti-patterns

| Don't | Problem | Do |
|-------|---------|-----|
| Use `request` fixture without auth headers | 401 / 403 from Yapp WAF | Use `buyerRequest` or `creatorRequest` fixture |
| Skip `response.status()` check | 500 with fallback body passes all assertion | Always `expect(response.status()).toBe(200)` first |
| Hardcode IDs in API tests | IDs change between runs | Create resources in test, use returned ID |
| Share mutable state between tests | Flaky when run in parallel | Each test creates + cleans up own data |
| Use E2E tests for pure API validation | Slow, launches browser unnecessarily | Use `request` fixture — no browser |
| Forget cleanup after creating resources | Test pollution | Use `runCleanup()` in `afterEach` or `afterAll` |

## Related skills
- `network-mocking` — mock external services in E2E tests
- `add-test-spec` — workflow to create new specs from test case docs
- `iterative-e2e-testing` — Round 5 (API tests) in the multi-round workflow
