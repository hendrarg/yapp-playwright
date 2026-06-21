---
name: add-test-spec
description: Scaffold a new test spec file from a test case document in test-cases/
---

## When to use
Use when asked to create a new test spec or add a test case. The test case must already exist as a `.md` file in `test-cases/`.

## Steps

0. **Read the TC document**: Look for `test-cases/{domain}/{TC-ID}-{description}.md`
   - Parse **Steps**, **Expected**, **Test Data**, **Tags** (Feature, Role, Priority)
   - Use this info to guide all subsequent steps

1. Determine the domain and pick the right fixture:
   - **Buyer (authenticated) — DEFAULT**: `authTest` from `../test-base`. Uses token injection, no OTP.
   - **Creator (authenticated) — DEFAULT**: `creatorAuthTest` from `../test-base`. Uses token injection, no OTP.
   - **Auth / unauth (only if testing auth flow)**: `test` from `../test-base`. OTP login is for auth tests only.

2. Determine which page object fixture to use from `src/fixtures/page.fixtures.ts`. If the page object does not exist, offer to create it first (use `add-page-object` skill).

3. Prepare test data:
   - Check if test data exists in `src/test-data/` for the feature
   - If missing, create data in `src/test-data/{domain}/` with `generate*()` factory + static templates
   - Import data via `@test-data/` path alias

4. Create `tests/{domain}/{TC-ID}-{description}.spec.ts`:
   - Import `{ fixture as test }` from `../test-base`
   - Import test data from `@test-data/{domain}/{feature}.data` or `@test-data`
   - Tag with `@T<id>`, `@<feature>`, `@role`, `@priority`
   - Implement each **Step** from TC doc as Playwright actions
   - Assert each **Expected** result from TC doc
   - Use `smartLocator` for locators, `safeClick`/`flakyClick` for interactions

5. Run `npx tsc --noEmit` then `npx playwright test <spec>` — fix until PASS.

## Example

### Input: `test-cases/buyer/AT-E2E-001-explore.md`

```markdown
# AT-E2E-001: Explore Page Load
**Feature:** @explore
**Role:** @buyer
**Priority:** @smoke

## Steps
1. Goto explore page
2. Wait for page load
## Expected
- Page loads without redirecting to /auth
- URL contains /explore
```

### Output: `tests/buyer/AT-E2E-001-explore.spec.ts`

```typescript
import { authTest as test } from '../test-base';

test('AT-E2E-001: Explore Page Load', {
  tag: ['@T001', '@explore', '@buyer', '@smoke'],
}, async ({ explorePage }) => {
  await explorePage.goto();
  await explorePage.expectLoaded();
});
```
