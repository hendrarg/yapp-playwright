---
name: add-test-spec
description: Generate a Playwright test spec from a test case document in test-cases/
---

## When to use
Use when asked to create a new test spec or when `/tc <ID>` is invoked. The test case must already exist as a `.md` file in `test-cases/`.

## Workflow

```
/tc AT-B-E2E-001  (user input)
    ↓
Parse ID: AT-{Domain}-{Type}-{Number}
  Domain: B=buyer, C=creator, A=auth
    ↓
glob test-cases/**/AT-B-E2E-001* → find file
    ↓
Read .md → Steps, Expected, Data, Tags
    ↓
skill reuse-patterns
    ↓
skill add-page-object (if needed)
    ↓
Create/check test-data
    ↓
Generate spec → tsc → test → fix until PASS
```

## Step 0: Parse TC ID

Input format: `AT-{Domain}-{Type}-{Number}`

| Pattern | Domain | Type | Globs for file |
|---------|--------|------|----------------|
| `AT-B-E2E-001` | buyer | E2E | `test-cases/buyer/AT-B-E2E-001*` |
| `AT-C-E2E-001` | creator | E2E | `test-cases/creator/AT-C-E2E-001*` |
| `AT-B-FV-001` | buyer | FV | `test-cases/buyer/AT-B-FV-001*` |
| `AT-B-API-001` | buyer | API | `test-cases/buyer/AT-B-API-001*` |
| `AT-C-API-001` | creator | API | `test-cases/creator/AT-C-API-001*` |
| `AT-A-API-001` | auth | API | `test-cases/auth/AT-A-API-001*` |

1. Extract domain letter from ID:
   - `B` → buyer → fixture: `authTest` (E2E/FV) or `buyerRequest` (API), glob: `test-cases/buyer/`
   - `C` → creator → fixture: `creatorAuthTest` (E2E/FV) or `creatorRequest` (API), glob: `test-cases/creator/`
   - `A` → auth → fixture: `test`, glob: `test-cases/auth/`

2. Glob file: `glob test-cases/{domain}/{tcId}*` → read the `.md`

## Step 1: Read TC document
- Parse: **Steps**, **Expected**, **Test Data**, **Tags**

## Step 2: Load `reuse-patterns` skill
```bash
skill reuse-patterns
```
- Check existing page objects, helpers, utils, shared locators
- Extract locators if ≥2 pages use the same element

## Step 3: Pick fixture + page object
- **Buyer E2E/FV**: `authTest` + buyer page (e.g. `explorePage`, `cartPage`)
- **Creator E2E/FV**: `creatorAuthTest` + creator page
- **Buyer API**: `buyerRequest` from `@fixtures/api.fixtures` — load `api-testing` skill
- **Creator API**: `creatorRequest` from `@fixtures/api.fixtures` — load `api-testing` skill
- **Auth only**: `test` + `loginPage`

## Step 4: Create page object (if missing)
```bash
skill add-page-object
```
- Scaffold `src/pages/{domain}/{Name}Page.ts`
- Register in `src/fixtures/page.fixtures.ts`

## Step 5: Create/check test data
- Check `src/test-data/{domain}/` for existing data
- If missing, create `src/test-data/{domain}/{feature}.data.ts`
- Update `src/test-data/index.ts`

## Step 6: Append TC to feature spec file
- **E2E/FV**: Append to existing `tests/{domain}/{feature}.spec.ts` (e.g. `tests/buyer/feeds.spec.ts`). If the feature spec does not exist, create it. **Never** create `tests/{domain}/{TC-ID}.spec.ts`. Import fixture from `../test-base`.
- **API**: Append to existing `tests/api/{domain}.{feature}.spec.ts` (e.g. `tests/api/buyer.feeds.spec.ts`). If missing, create it. Import `test` from `../../src/fixtures/api.fixtures`.
- Import test data using path alias: `from '@test-data/{domain}/{feature}.data'`
- Tags: `@T<TC-ID>` (literal full TC ID, e.g. `@TAT-B-E2E-001`), `@<feature>`, `@buyer|@creator`, `@smoke|@regression|@sanity`
- Test title = the TC's descriptive title (NOT the TC ID) — the TC ID goes only in the tag.
- `test.step(' descriptive step name ')` — use descriptive step names, not "Step N — ...".
- **E2E only**: Locators via `smartLocator` from `@utils/heal-utils` with fallback chain (testId → role → text → label → placeholder → selector). If the app has no `data-testid`, use `getByRole` + `getByText` as primary.
- **E2E only**: Interactions: `safeClick`/`safeFill`/`safeCheck` or `flakyClick`/`flakyFill`
- **API only**: Use `buyerRequest.get()` / `.post()` / `.patch()` / `.delete()` — no locators

## Step 7: Run `tsc --noEmit`
```bash
npx tsc --noEmit
```
- If type errors → `fix-tsc-errors` skill

## Step 8: Run ONLY the new TC (grep by TC-ID tag)
```bash
# E2E/FV
npx playwright test tests/{domain}/{feature}.spec.ts --grep @T{TC-ID}

# API
npx playwright test --project=api tests/api/{domain}.{feature}.spec.ts --grep @T{TC-ID}
```
**Do NOT run the whole feature spec** — only the new TC via its tag.

## Step 9: If FAIL → resolve flaky
```bash
skill resolve-flaky-tests
```
- Fix → re-run from Step 7 until PASS ✅

---

## Verification

Each round completes only when:
- `tsc --noEmit` ✅
- `npx playwright test tests/{domain}/{feature}.spec.ts --grep @T{TC-ID}` PASS ✅

## Examples

### /tc AT-B-E2E-001
→ glob `test-cases/buyer/AT-B-E2E-001*` → read `.md`
→ fixture: `authTest`
→ feature spec: `tests/buyer/feeds.spec.ts` (append, do not create `tests/buyer/AT-B-E2E-001.spec.ts`)
→ run: `npx playwright test tests/buyer/feeds.spec.ts --grep @TAT-B-E2E-001`

### /tc AT-C-E2E-001
→ glob `test-cases/creator/AT-C-E2E-001*` → read `.md`
→ fixture: `creatorAuthTest`
→ feature spec: `tests/creator/{feature}.spec.ts`
→ run: `npx playwright test tests/creator/{feature}.spec.ts --grep @TAT-C-E2E-001`

### /tc AT-B-API-001
→ glob `test-cases/buyer/AT-B-API-001*` → read `.md`
→ Type is **API** → load `api-testing` skill
→ fixture: `buyerRequest` from `@fixtures/api.fixtures`
→ feature spec: `tests/api/buyer.{feature}.spec.ts`
→ run: `npx playwright test --project=api tests/api/buyer.{feature}.spec.ts --grep @TAT-B-API-001`
