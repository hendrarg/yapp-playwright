# Testing Guidelines

## Fixture Selection

### Browser / E2E tests
- `authTest` — **DEFAULT for buyer pages**. Injects `at` cookie via `loginWithToken`. No browser login needed.
- `creatorAuthTest` — **DEFAULT for creator pages**. Injects `at` cookie via `loginWithToken`. No browser login needed.
- `mockTest` (from `@fixtures/mock.fixtures`) — Use when test needs mocked external services (payment, email, analytics). Supports `test.use({ mockPayments: false })` to toggle per test.
- `test` — **Only for auth-specific tests** (OTP login flow, unauth page access). Do NOT use for feature/business-logic tests.

### Import convention for mixed auth + guest specs
When a spec file has both authenticated and guest tests:
```typescript
import { authTest as test, test as guestTest, expect } from '../test-base';

test('authenticated test...', ...)    // authTest aliased
guestTest('guest/FV test...', ...)     // plain test for no-auth
```

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

## Tagging Convention

Every test must have at least one tag from each applicable category:

```typescript
test('description', { tag: ['@AUT-FV-216', '@feature', '@role', '@priority'] }, async ({ pageObject }) => {
  // ...
});
```

Tags at `test.describe()` level apply to all child tests.

### Tag Reference

| Category | Tags | Required |
|----------|------|----------|
| Automation ID | `@AUT-E2E-*`, `@AUT-FV-*` | Yes for mapped automation |
| Legacy Test ID | `@TAT-A-*`, `@TAT-C-*` | Existing unmapped tests only; do not use for new tests |
| Feature | `@cart`, `@checkout`, `@auth`, `@membership`, `@products`, `@feeds`, `@profile`, `@messages`, `@wallet`, `@settings`, `@analytics`, `@campaigns`, `@streaming`, `@affiliate`, `@referral`, `@promotions`, `@sessions`, `@network-mock`, `@payment` | Yes |
| Role | `@buyer`, `@creator` | Yes |
| Priority | `@smoke`, `@regression`, `@sanity` | Yes |
| Status | `@flaky`, `@slow` | Optional |

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

## Single-pass Verification

- Run the isolated target once after the latest code change.
- A passing run ends verification.
- After a failure and fix, run the isolated target once again.
- Do not use `--repeat-each`, repeated confirmation runs, a full spec, or a broader suite unless the user explicitly requests them.

## Forbidden
- `test.only()` on shared branches (CI fails via `forbidOnly`)
- Importing `test`/`expect` directly from `@playwright/test` in spec files
- Deep relative imports bypassing path aliases
- `--repeat-each` unless the user explicitly requests repeated verification. This is especially important for reCAPTCHA tests, where rapid repeats from the same IP/machine reduce the reCAPTCHA v3 score and trigger rate-limiting.
- **Running full spec file during mapped automation development** — always use `--grep @<AUT-ID>` to isolate the mapping. Running the whole file wastes time and tests unrelated functionality.
