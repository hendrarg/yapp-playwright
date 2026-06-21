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
| `AT-A-API-001` | auth | API | `test-cases/auth/AT-A-API-001*` |

1. Extract domain letter from ID:
   - `B` → buyer → fixture: `authTest`, glob: `test-cases/buyer/`
   - `C` → creator → fixture: `creatorAuthTest`, glob: `test-cases/creator/`
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
- **Buyer**: `authTest` + buyer page (e.g. `explorePage`, `cartPage`)
- **Creator**: `creatorAuthTest` + creator page
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

## Step 6: Create spec file
- Path: `tests/{domain}/{tcId}.spec.ts`
- Import fixture from `../test-base`
- Import test data using **relative path**: `from '../src/test-data/{domain}/{feature}'`
- Tags: `@T<number>`, `@<feature>`, `@buyer|@creator`, `@smoke|@regression|@sanity`
- Locators: `smartLocator` from `@utils/heal-utils`
- Interactions: `safeClick`/`safeFill`/`safeCheck` or `flakyClick`/`flakyFill`

## Step 7: Run `tsc --noEmit`
```bash
npx tsc --noEmit
```
- If type errors → `fix-tsc-errors` skill

## Step 8: Run test
```bash
npx playwright test tests/{domain}/{tcId}.spec.ts
```

## Step 9: If FAIL → resolve flaky
```bash
skill resolve-flaky-tests
```
- Fix → re-run from Step 7 until PASS ✅

---

## Verification

Each round completes only when:
- `tsc --noEmit` ✅
- `npx playwright test <spec>` PASS ✅

## Examples

### /tc AT-B-E2E-001
→ glob `test-cases/buyer/AT-B-E2E-001*` → read `.md`
→ fixture: `authTest`
→ spec: `tests/buyer/AT-B-E2E-001.spec.ts`
→ run: `npx playwright test tests/buyer/AT-B-E2E-001.spec.ts`

### /tc AT-C-E2E-001
→ glob `test-cases/creator/AT-C-E2E-001*` → read `.md`
→ fixture: `creatorAuthTest`
→ spec: `tests/creator/AT-C-E2E-001.spec.ts`
→ run: `npx playwright test tests/creator/AT-C-E2E-001.spec.ts`
