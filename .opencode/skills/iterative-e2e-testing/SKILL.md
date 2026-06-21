---
name: iterative-e2e-testing
description: Iterative round-based E2E test development — write, run, fix, extract helpers, batch, and stabilize
---

## When to use
Use when asked to create a new test case (e.g. `AT-E2E-xxx`, `AT-FV-xxx`, `AT-API-xxx`) or when adding a batch of tests. This skill formalizes the pattern of building tests incrementally across rounds, each round reusing and extracting from prior work.

## Core pattern

```
Round N: Test(s) + reference(s) + helpers + context → run → fix → PASS
         ↓ extract reusable logic into helpers
```

| Round type | Description |
|------------|-------------|
| `AT-E2E-*` | Full browser E2E (Playwright + page objects) |
| `AT-FV-*`  | Functional verification (helpers-only, lighter, batch) |
| `AT-API-*` | API-level tests (no browser, use `fetch` / `request` fixture) |

---

## Round 1: First E2E test — no reference

1. **Plan**: Read the test case document from `test-cases/{domain}/{TC-ID}.md`
   - Parse **Steps**, **Expected**, **Test Data**, **Tags** from the `.md`
   - Identify domain: buyer (`authTest`) or creator (`creatorAuthTest`) or unauth (`test`)
   - Page(s) involved — create page objects if missing (use `add-page-object` skill)
   - **Test data**: Check `src/test-data/` for existing data. Create new data file in `src/test-data/{domain}/` with `generate*()` factory + static templates if missing.
   - **Reuse check**: Before creating new locators, scan existing page objects and `src/pages/shared/locators.ts` (if exists) for matching selectors

2. **Create spec**: `tests/{domain}/{test-id}.spec.ts`
   - Import fixture from `../test-base`
   - Use `pageObject.goto()` → `pageObject.expectLoaded()` → interactions → assertions
   - Tag with `@T<id>`, `@<feature>`, `@buyer|@creator`, `@smoke|@regression`

3. **Run**: `npx playwright test tests/{domain}/{test-id}.spec.ts`
   - If FAIL: read error → fix locators/logic → re-run → repeat until PASS

4. **Mark as reference**: This test is now the *reference* for Round 2.

---

## Round 2: New E2E test with reference

1. **Read Round 1 test** as reference for patterns (login, navigation, assertions style).

2. **Create new spec** following same patterns.

3. **Run** → fix → PASS.

4. **Check self-healing**: If a locator fails consistently, update the page object to use `Healable` with fallback strategies from `@utils/heal-utils`.

4. **Extract helpers** from both tests if any shared logic exists:
   - Common login setup → `src/helpers/auth/token-login.ts` (or augment existing)
   - Repeated navigation pattern → `src/helpers/navigation.ts`
   - Repeated upload interaction → `src/helpers/upload.ts`
   - General: `src/helpers/{domain}/{action}.ts`
   
   Helper conventions:
   - Named export functions
   - Accept `page: Page` as first param
   - Return `Promise<void>` unless data is needed

---

## Round 3: Stabilized pattern

1. **Create new E2E test** using:
   - Reference from Round 1
   - Helpers extracted from Round 2
   - Working page objects
   - **Reuse check**: Scan existing locators and step sequences — extract any new duplication found across the 3 rounds

2. **Run** — should PASS or need minimal fixes.

3. Helpers and page objects are now stable.

---

## Round 4: Batch functional verification (AT-FV-*)

1. **Create multiple FV tests** (`tests/buyer/` or `tests/creator/`).
   - These are *lighter* — may skip full navigation, focus on specific flows.
   - Reuse existing helpers and page objects heavily.
   - Can use `test.beforeEach()` to share setup.

2. **Run all FV tests in batch**: `npx playwright test tests/{domain}/`
   - Expect mostly green.
   - Fix any regressions caused by batch interactions.

3. If a pattern repeats across 3+ tests, extract further into helpers.

---

## Round 5: API tests (AT-API-*)

1. **Create API-only spec** (use `test` fixture, no page objects needed):
   ```typescript
   import { test, expect } from '@playwright/test';

   test('GET /api/health returns 200', async ({ request }) => {
     const res = await request.get(`${process.env.YAPP_BASE_URL}/api/health`);
     expect(res.ok()).toBeTruthy();
   });
   ```
   - Use `{ request }` fixture for HTTP calls.
   - Auth via `Authorization` header with test token.

2. **Run all** → PASS.

---

## Verification

After each round, run:
- `npx tsc --noEmit` — type-check
- Targeted `npx playwright test <spec>` — test pass

Before committing (if requested), run:
- `npx playwright test` — full suite
- `npx tsc --noEmit`
