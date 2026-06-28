# Testing Guidelines

## Fixture Selection

### Browser / E2E tests
- `authTest` — **DEFAULT for buyer pages**. Injects `at` cookie via `loginWithToken`. No browser login needed.
- `creatorAuthTest` — **DEFAULT for creator pages**. Injects `at` cookie via `loginWithToken`. No browser login needed.
- `mockTest` (from `@fixtures/mock.fixtures`) — Use when test needs mocked external services (payment, email, analytics). Supports `test.use({ mockPayments: false })` to toggle per test.
- `test` — **Only for auth-specific tests** (OTP login flow, unauth page access). Do NOT use for feature/business-logic tests.

### API tests (no browser)
- `test` (from `@fixtures/api.fixtures`) — Provides `buyerRequest` + `creatorRequest` pre-authenticated `APIRequestContext`. No browser launched.
  - `buyerRequest` — auto-injects `at` cookie + browser-like headers for buyer baseURL
  - `creatorRequest` — auto-injects `at` cookie + browser-like headers for creator baseURL

## Test Structure
- Every test must use a page object fixture: `pageObject.goto()` + `pageObject.expectLoaded()`
- Add meaningful interactions beyond navigation when applicable
- Set `test.setTimeout()` only when needed (e.g. OTP flow = 90000ms)
- **Step naming**: Use descriptive step names ONLY. Do **NOT** prefix with `Step N:`, `Step 1:`, etc. Playwright already numbers steps automatically.
  ```typescript
  // ✅ Good
  test.step('Open feeds and verify Following tab', async () => { ... });
  
  // ❌ Forbidden
  test.step('Step 1: Open feeds and verify Following tab', async () => { ... });
  ```
- **Exception**: API tests (in `tests/api/`) use `buyerRequest`/`creatorRequest` fixtures — no page object, no browser

## Tagging Convention

Every test must have at least one tag from each applicable category:

```typescript
test('description', { tag: ['@T<id>', '@feature', '@role', '@priority'] }, async ({ pageObject }) => {
  // ...
});
```

Tags at `test.describe()` level apply to all child tests.

### Tag Reference

| Category | Tags | Required |
|----------|------|----------|
| Test ID | `@T<number>` | Yes if linked to test case |
| Feature | `@cart`, `@checkout`, `@auth`, `@membership`, `@products`, `@feeds`, `@profile`, `@messages`, `@wallet`, `@settings`, `@analytics`, `@campaigns`, `@streaming`, `@affiliate`, `@referral`, `@promotions`, `@sessions`, `@network-mock`, `@payment` | Yes |
| Role | `@buyer`, `@creator` | Yes |
| Priority | `@smoke`, `@regression`, `@sanity` | Yes |
| Status | `@flaky`, `@slow` | Optional |
| Domain | `@api`, `@ui` | Optional |

### Filtering

```bash
npx playwright test --grep @smoke
npx playwright test --grep-invert @flaky
npx playwright test --grep "(?=.*@smoke)(?=.*@cart)"
```

## Test Data
- Store all test data in `src/test-data/` — never hardcode business values in test specs
- Use `@test-data/` path alias for imports
- Use **factory functions** (`generateProduct()`, etc.) for unique data per run
- Use **static templates** for fixed reference data (expected values, form defaults)
- When adding a new feature, create corresponding data file in `src/test-data/{domain}/`

```typescript
// ✅ Good
import { generateProduct } from '@test-data/creator/product.data';
const product = generateProduct({ category: 'digital' });

// ❌ Avoid — hardcoded in test
const product = { name: 'E-Book', price: 29.99 };
```

## Forbidden
- `test.only()` on shared branches (CI fails via `forbidOnly`)
- Importing `test`/`expect` directly from `@playwright/test` in spec files
- Deep relative imports bypassing path aliases
- `--repeat-each` for reCAPTCHA tests (e.g. `tests/auth/otp-login.spec.ts`) — rapid repeats from the same IP/machine tank the reCAPTCHA v3 score and trigger rate-limiting, causing cascading failures. To verify reliability, re-run the single test with a few minutes of cool-down between runs.
