# Testing Guidelines

## Fixture Selection
- `test` — unauth pages, OTP login flow
- `authTest` — buyer pages (injects `at` cookie for `baseURL`)
- `creatorAuthTest` — creator pages (injects `at` cookie for `creatorsBaseURL`)

## Test Structure
- Every test must use a page object fixture: `pageObject.goto()` + `pageObject.expectLoaded()`
- Add meaningful interactions beyond navigation when applicable
- Set `test.setTimeout()` only when needed (e.g. OTP flow = 90000ms)

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
| Feature | `@cart`, `@checkout`, `@auth`, `@membership`, `@products`, `@feeds`, `@profile`, `@messages`, `@wallet`, `@settings`, `@analytics`, `@campaigns`, `@streaming`, `@affiliate`, `@referral`, `@promotions`, `@sessions` | Yes |
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

## Forbidden
- `test.only()` on shared branches (CI fails via `forbidOnly`)
- Importing `test`/`expect` directly from `@playwright/test` in spec files
- Deep relative imports bypassing path aliases
