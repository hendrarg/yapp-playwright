---
name: iterative-e2e-testing
description: Iterative round-based E2E test development — write, run, fix, extract helpers, batch, and stabilize
---

## When to use
Use when asked to create mapped browser automation (for example `AUT-E2E-*` or `AUT-FV-*`) or when adding a batch of tests. This skill formalizes the pattern of building tests incrementally across rounds, each round reusing and extracting from prior work.

## Core pattern

```
Round N: Test(s) + reference(s) + helpers + context → run → fix → PASS
         ↓ extract reusable logic into helpers
```

| Round type | Description |
|------------|-------------|
| `AUT-E2E-*` | Full browser E2E (Playwright + page objects) |
| `AUT-FV-*`  | Functional verification (helpers-only, lighter, batch) |

---

## Round 1: First E2E test — no reference

1. **Load `add-test-spec` skill** — this loads the full workflow:
   ```bash
   read .agents/skills/add-test-spec/SKILL.md
   ```
   - Builds validated context from Automation Mapping and active source TC sheets
   - Calls `reuse-patterns` to check existing locators/helpers
   - Calls `add-page-object` if page object missing
   - Creates test data files if needed
   - Generates the spec file with **`smartLocator` in every new/touched page-object locator** (see `add-test-spec` Step 5)
   - Runs `tsc --noEmit` and `npx playwright test`

2. **If FAIL → load `resolve-flaky-tests` skill**:
   ```bash
   read .agents/skills/resolve-flaky-tests/SKILL.md
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

5. **Upgrade locators touched in this round**: Any page-object locator added or edited in Round 2 MUST use `smartLocator` with ≥2 strategies. If reusing a page object that still has CSS-only locators, upgrade those locators when you touch that file — do not wait for a flaky failure.

---

## Round 3: Stabilized pattern

1. **Create new E2E test** using:
   - Reference from Round 1
   - Helpers extracted from Round 2
   - Working page objects

2. **Run** — should PASS or need minimal fixes.

3. Helpers and page objects are now stable.

---

## Round 4: Batch functional verification (AUT-FV-*)

1. **Create multiple FV tests** (`tests/buyer/` or `tests/creator/`).
   - Load `reuse-patterns` first — leverage all existing page objects, helpers, and locators
   - Use `test.beforeEach()` to share setup
   - Data from `src/test-data/`

2. **Run all FV tests in batch**: `npx playwright test tests/{domain}/`
   - Expect mostly green.
   - If FAIL → `resolve-flaky-tests` batch.

3. If a pattern repeats across 3+ tests, extract further into helpers.

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
