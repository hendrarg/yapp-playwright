---
name: migrate-unmapped-aut
description: Assign @AUT-* tags and business flows to smoke tests that lack Automation Mapping IDs
---

## When to use

Use when a spec has no `@AUT-E2E-*` or `@AUT-FV-*` tag, or still carries a retired `@TAT-*` tag.

Do **not** invent an `@AUT-*` ID. The Automation Mapping row must exist in Google Sheets before migration starts.

## Workflow

1. Find unmapped or retired-tag tests:
   ```bash
   rg -n "@TAT-" tests
   rg -P "tag: \[(?![^\]]*'@AUT-(E2E|FV)-)" tests
   ```

2. For each test, locate the matching Automation Mapping row:
   ```bash
   npm run automation:context -- <AUT-ID>
   ```
   If no mapping exists, stop and report — do not leave the test untagged or reuse `@TAT-*`.

3. Read `.agents/skills/add-test-spec/SKILL.md` and follow the full generate workflow for that `@AUT-ID`.

4. Replace the unmapped test in place (same spec file) or merge into an existing `@AUT-*` test if the mapping already partially exists.

5. Update tags:
   - Remove any `@TAT-*` tag (retired)
   - Add exact `@AUT-E2E-*` or `@AUT-FV-*` from the sheet
   - Keep feature, role, and priority tags

6. Upgrade test depth — smoke-only tests are not acceptable after migration:
   - **Forbidden after migration:** `goto()` + `expectLoaded()` only
   - **Required:** one `test.step()` per covered manual TC step with interaction + assertion

7. Run verification:
   ```bash
   npx tsc --noEmit
   npx playwright test tests/{domain}/{feature}.spec.ts --project=chromium --grep @<AUT-ID>
   npm run audit:tags
   ```

## Migration checklist

- [ ] Automation Mapping row validated via `automation:context`
- [ ] Retired `@TAT-*` tag removed (if present)
- [ ] Exact `@AUT-*` tag added
- [ ] Covered TC IDs represented as `test.step()` calls
- [ ] Minimum test depth met (see `add-test-spec` Step 5 checklist)
- [ ] API seeding added if the flow needs pre-created data (see `add-test-spec` Step 4b)
- [ ] Locators use `smartLocator` for every new/touched element
- [ ] `npm run audit:tags` passes with no `@TAT-*` remaining

## Example

### Before (unmapped smoke)

```typescript
test('injected "at" token loads the products page without redirecting to auth', {
  tag: ['@products', '@creator', '@smoke'],
}, async ({ productsPage }) => {
  await productsPage.goto();
  await productsPage.expectLoaded();
});
```

### After (mapped AUT with business flow)

```typescript
test('Creator Products — Create and verify digital product in list', {
  tag: ['@AUT-FV-042', '@products', '@creator', '@smoke'],
}, async ({ productsPage }) => {
  await test.step('Open products page', async () => {
    await productsPage.goto();
    await productsPage.expectLoaded();
  });

  await test.step('Create digital product and verify it appears in list', async () => {
    // interactions + assertions from covered TC steps
  });
});
```
