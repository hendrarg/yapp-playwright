---
name: add-test-spec
description: Scaffold a new test spec file following existing POM conventions
---

## When to use
Use when asked to create a new test spec or add a test case.

## Steps

1. Determine the domain and pick the right fixture:
   - **Buyer (authenticated) — DEFAULT**: `authTest` from `../test-base`. Uses token injection, no OTP.
   - **Creator (authenticated) — DEFAULT**: `creatorAuthTest` from `../test-base`. Uses token injection, no OTP.
   - **Auth / unauth (only if testing auth flow)**: `test` from `../test-base`. OTP login is for auth tests only.

2. Determine which page object fixture to use from `src/fixtures/page.fixtures.ts`. If the page object does not exist, offer to create it first.

3. Prepare test data:
   - Check if test data exists in `src/test-data/` for the feature (product, cart, user, etc.)
   - If missing, create data in the appropriate `src/test-data/{domain}/` file with both static templates and factory functions
   - Import data via `@test-data/` path alias

4. Create `tests/{domain}/{name}.spec.ts`:
   - Import `{ fixture as test }` from `../test-base`
   - Import test data from `@test-data/{domain}/{feature}.data` or `@test-data`
   - Use factory functions (`generateProduct()`, etc.) for unique data per test run
   - Use static templates for fixed reference data
   - Test body: `pageObject.goto()` → interactions using test data → assertions

5. Run `npx tsc --noEmit` to verify.

## Example

```typescript
import { authTest as test } from '../test-base';
import { generateProduct } from '@test-data/creator/product.data';

test('create a digital product', async ({ productsPage }) => {
  const product = generateProduct({ category: 'digital', price: 29.99 });
  await productsPage.goto();
  await productsPage.createProduct(product);
  await productsPage.expectProductVisible(product.name);
});
```
