---
name: add-test-spec
description: Scaffold a new test spec file following existing POM conventions
---

## When to use
Use when asked to create a new test spec or add a test case.

## Steps

1. Determine the domain and pick the right fixture:
   - **Buyer (authenticated)**: `authTest` from `../test-base`
   - **Creator (authenticated)**: `creatorAuthTest` from `../test-base`
   - **Auth / unauth**: `test` from `../test-base`

2. Determine which page object fixture to use from `src/fixtures/page.fixtures.ts`. If the page object does not exist, offer to create it first.

3. Create `tests/{domain}/{name}.spec.ts`:
   - Import `{ fixture as test }` from `../test-base`
   - Test body calls `pageObject.goto()` then `pageObject.expectLoaded()`
   - Add meaningful interactions if specified

4. Run `npx tsc --noEmit` to verify.

## Example

```typescript
import { authTest as test } from '../test-base';

test('explore page loads without auth redirect', async ({ explorePage }) => {
  await explorePage.goto();
  await explorePage.expectLoaded();
});
```
