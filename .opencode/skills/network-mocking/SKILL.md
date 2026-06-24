---
name: network-mocking
description: Mock external services (payment, email, analytics) in E2E tests using Playwright route interception, integrated with Yapp conventions
---

## When to use
Use when you need to:
- Mock third-party services (Stripe, Mailosaur, analytics) in E2E tests
- Simulate error states (500, network failure, timeout) deterministically
- Block noisy third-party requests that slow tests
- Test retry/error-handling UI without real API failures

## Golden Rule: mock at the boundary

Mock external services you **do not own**. Never mock your own app's API. Your tests should prove YOUR code works, not that Stripe/SendGrid is up.

---

## 1. Quick start — mock fixture (recommended)

Use `mock.fixtures.ts` for toggleable mock control. Default: all mocks ON.

```typescript
import { test, expect } from '@fixtures/mock.fixtures';

test('checkout with mocked payment',
  { tag: ['@checkout', '@buyer', '@smoke'] },
  async ({ page, cartPage }) => {
    // Payment, email, analytics all mocked by default
    await cartPage.goto();
    // ...
  });

test('real payment integration (nightly)',
  { tag: ['@checkout', '@buyer', '@regression'] },
  async ({ page, cartPage }) => {
    test.use({ mockPayments: false }); // Override
    await cartPage.goto();
    // Hits real Stripe test API
  });
```

### Available toggles

| Option | Default | What it mocks |
|--------|---------|---------------|
| `mockPayments` | `true` | `**/api/payment*/**` → success response |
| `mockEmail` | `true` | `**/api/email*/**` → sent response |
| `mockAnalytics` | `true` | Blocks segment, google-analytics, hotjar, mixpanel, intercom |

---

## 2. Manual route interception

For one-off mocks that don't fit the fixture pattern:

### Full mock (replace response entirely)

```typescript
import { paymentMock } from '@test-data/mocks/payment.data';

test('mock payment success', async ({ page }) => {
  await page.route('**/api/payment/confirm', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(paymentMock.success),
    })
  );

  await page.goto('/checkout');
  // ... UI interaction ...
});
```

### Partial mock (modify real response)

```typescript
test('simulate low stock via response tweak', async ({ page }) => {
  await page.route('**/api/products/*', async (route) => {
    const response = await route.fetch(); // Forward to real server
    const body = await response.json();
    body.stock = 2; // Override just stock count
    await route.fulfill({ response, json: body });
  });

  await page.goto('/products/123');
  await expect(page.getByText('Only 2 left')).toBeVisible();
});
```

### Block unwanted requests

```typescript
test('block analytics noise', async ({ page }) => {
  await page.route(
    '**/{google-analytics,segment,hotjar,mixpanel}.**/**',
    (route) => route.abort()
  );
  await page.goto('/dashboard');
});
```

### Verify request payload sent by frontend

```typescript
test('verify checkout sends correct payload', async ({ page }) => {
  const requestPromise = page.waitForRequest('**/api/checkout');

  await page.goto('/checkout');
  await page.getByRole('button', { name: 'Place order' }).click();

  const request = await requestPromise;
  expect(request.method()).toBe('POST');
  expect(request.postDataJSON()).toMatchObject({
    items: expect.any(Array),
    total: expect.any(Number),
  });
});
```

### Verify response before asserting UI

```typescript
test('verify API response before DOM check', async ({ page }) => {
  const responsePromise = page.waitForResponse('**/api/products');

  await page.goto('/products');
  await page.getByRole('button', { name: 'Refresh' }).click();

  const response = await responsePromise;
  expect(response.status()).toBe(200);
  const data = await response.json();
  expect(data.length).toBeGreaterThan(0);
});
```

---

## 3. Error simulation helpers

Use pre-built helpers from `@helpers/network/mock`:

```typescript
import {
  mockServerError,
  mockNetworkFailure,
  mockTimeout,
  mockIntermittent,
} from '@helpers/network/mock';

test('error UI on 500', async ({ page }) => {
  await mockServerError(page, '**/api/products');
  await page.goto('/products');
  await expect(page.getByText('Something went wrong')).toBeVisible();
});

test('error UI on network failure', async ({ page }) => {
  await mockNetworkFailure(page, '**/api/products');
  await page.goto('/products');
  await expect(page.getByText('Network error')).toBeVisible();
});

test('retry succeeds after 2 failures', async ({ page }) => {
  await mockIntermittent(page, '**/api/products', [{ id: 1, name: 'Widget' }], 2);
  await page.goto('/products');
  // Click retry × 2, data appears on 3rd attempt
});
```

### Abort reasons (for `mockNetworkFailure` 2nd param)

`'aborted' | 'accessdenied' | 'addressunreachable' | 'blockedbyclient' | 'blockedbyresponse' | 'connectionaborted' | 'connectionclosed' | 'connectionfailed' | 'connectionrefused' | 'connectionreset' | 'internetdisconnected' | 'namenotresolved' | 'timedout' | 'failed'`

---

## 4. URL pattern reference

| Pattern | Matches | Does NOT match |
|---------|---------|----------------|
| `**/api/users` | `/api/users`, `/v2/api/users` | `/api/users/1` |
| `**/api/users*` | `/api/users`, `/api/users?page=1` | `/api/users/1` |
| `**/api/users/*` | `/api/users/1` | `/api/users/1/orders` |
| `**/*.{png,jpg}` | `/logo.png`, `/deep/img.jpg` | `/file.svg` |
| `/\/api\/users\/\d+$/` (regex) | `/api/users/123` | `/api/users/abc` |

---

## 5. Test data

All mock response data lives in `src/test-data/mocks/`:

| File | What |
|------|------|
| `payment.data.ts` | `paymentMock.success`, `.pending`, `.failure` |
| `email.data.ts` | `emailMock.sent`, `.bounced`, `.throttled` |
| `common.data.ts` | `errorMock.serverError`, `.notFound`, `.forbidden`, `.unauthorized` |

Import via `@test-data/mocks/`:
```typescript
import { paymentMock } from '@test-data/mocks/payment.data';
import { errorMock } from '@test-data/mocks/common.data';
```

---

## 6. Anti-patterns

| Don't | Problem | Do |
|-------|---------|-----|
| Mock your own API (`**/api/profile`) | You test a fiction | Only mock external: Stripe, SendGrid, analytics |
| Set up routes AFTER `page.goto()` | Route not registered for initial requests | Always `await page.route(...)` BEFORE `page.goto()` |
| Forget to call `route.fulfill()`/`abort()`/`continue()` | Test hangs | Every handler must call exactly one |
| Hardcode mock data in every test | Duplicated, hard to update | Use `@test-data/mocks/` — single source of truth |
| Use `route.continue()` thinking it mocks | Passes request to real server | Use `route.fulfill()` to serve fake data |

## Related skills
- `api-testing` — pure API tests without browser
- `resolve-flaky-tests` — if mocked UI tests are still flaky
- `reuse-patterns` — extract shared mock patterns to helpers
