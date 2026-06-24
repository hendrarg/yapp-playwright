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

1. **Load `add-test-spec` skill** — this loads the full workflow:
   ```bash
   skill add-test-spec
   ```
   - Automatically reads the TC `.md` file
   - Calls `reuse-patterns` to check existing locators/helpers
   - Calls `add-page-object` if page object missing
   - Creates test data files if needed
   - Generates the spec file
   - Runs `tsc --noEmit` and `npx playwright test`

2. **If FAIL → load `resolve-flaky-tests` skill**:
   ```bash
   skill resolve-flaky-tests
   ```
   - Read error → apply fix pattern → re-run

3. **Extract helpers**: Check for repeated patterns between Round 1's test and existing tests. If found, extract to `src/helpers/`.

4. **Mark as reference**: This test is now the *reference* for Round 2.

---

## Round 2: New E2E test with reference

1. **Load `reuse-patterns` skill** — check Round 1 test + existing code for reusable locators/steps.

2. **Create new spec** using `add-test-spec` workflow.

3. **Run** → if FAIL → `resolve-flaky-tests` → fix → PASS.

4. **Extract helpers**: If step sequences from Round 1 + Round 2 overlap, extract to `src/helpers/{domain}/{action}.ts`.

5. **Check self-healing**: If a locator fails consistently, update the page object to use `smartLocator` from `@utils/heal-utils` with full fallback chain.

---

## Round 3: Stabilized pattern

1. **Create new E2E test** using:
   - Reference from Round 1
   - Helpers extracted from Round 2
   - Working page objects

2. **Run** — should PASS or need minimal fixes.

3. Helpers and page objects are now stable.

---

## Round 4: Batch functional verification (AT-FV-*)

1. **Create multiple FV tests** (`tests/buyer/` or `tests/creator/`).
   - Load `reuse-patterns` first — leverage all existing page objects, helpers, and locators
   - Use `test.beforeEach()` to share setup
   - Data from `src/test-data/`

2. **Run all FV tests in batch**: `npx playwright test tests/{domain}/`
   - Expect mostly green.
   - If FAIL → `resolve-flaky-tests` batch.

3. If a pattern repeats across 3+ tests, extract further into helpers.

---

## Round 5: API tests (AT-API-*)

1. **Load `api-testing` skill**:
   ```bash
   skill api-testing
   ```
   - Uses `buyerRequest`/`creatorRequest` from `@fixtures/api.fixtures`
   - Auto-injects `at` cookie + browser-like headers (WAF bypass)
   - No browser launched — tests run in milliseconds

2. **Create API-only spec** in `tests/api/`:
   - Import `test` from `../../src/fixtures/api.fixtures`
   - Use `buyerRequest` for buyer API, `creatorRequest` for creator API
   - Data still comes from `src/test-data/`
   - Tags: `@api`, `@buyer|@creator`, `@smoke|@regression|@sanity`

3. **Run API tests**: `npx playwright test --project=api`

---

## Verification

After each round:
```bash
npx tsc --noEmit
npx playwright test tests/{domain}
```

Before committing (if requested):
```bash
npx playwright test
npx tsc --noEmit
```
