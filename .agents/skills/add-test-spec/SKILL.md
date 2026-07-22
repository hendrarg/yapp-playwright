---
name: add-test-spec
description: Use when generating Playwright automation from a Google Sheets AUT mapping ID
---

## When to use

Use `/automation <AUT-ID>` for an Automation Mapping row and its covered manual TCs in Google Sheets.

## Workflow

1. Run `npm run automation:context -- <AUT-ID>`.
2. If validation fails, stop and report the exact TC IDs, source rows, or open clarifications. Do not guess.
3. Load `reuse-patterns` and inspect existing page objects, helpers, test data, and similar specs.
4. For every Automation Mapping ID, generate exactly one Playwright `test()`; the mapping is the automation testcase.
5. For `AUT-E2E-*`, make the covered journey actions `test.step()` calls and attach covered TC IDs as annotations.
6. For `AUT-FV-*`, keep covered manual TCs as ordered `test.step()` calls inside the single test; parameterize only identical flows with different data.
7. Tag the single generated test with the exact Automation ID, for example `@AUT-E2E-008`.
8. Continue with the fixture, page-object, test-data, type-check, and isolated Playwright steps below.

Do not create intermediate Markdown files. Keep locators in page objects and never hide ambiguity with `.first()`.

## Step 1: Load `reuse-patterns`

```bash
read .agents/skills/reuse-patterns/SKILL.md
```

- Check existing page objects, helpers, utils, and shared locators.
- Extract locators if at least two pages use the same element.

## Step 2: Pick fixture and page object

- **Buyer E2E/FV**: `authTest` plus a buyer page object.
- **Creator E2E/FV**: `creatorAuthTest` plus a creator page object.
- **Auth only**: `test` plus `loginPage`.

## Step 3: Create a page object if missing

```bash
read .agents/skills/add-page-object/SKILL.md
```

- Scaffold `src/pages/{domain}/{Name}Page.ts`.
- Register it in `src/fixtures/page.fixtures.ts`.

## Step 4: Create or reuse test data

- Check `src/test-data/{domain}/` first.
- If needed, create `src/test-data/{domain}/{feature}.data.ts`.
- Update `src/test-data/index.ts`.

## Step 5: Append the mapped automation to its feature spec

- Append to `tests/{domain}/{feature}.spec.ts`; create the feature spec only if it does not exist. Import the fixture from `../test-base`.
- Import test data with `@test-data/{domain}/{feature}.data`.
- Use the exact `@<AUT-ID>`, one feature tag, `@buyer` or `@creator`, and one priority tag.
- Use the descriptive automation title as the test title; keep the Automation ID in the tag.
- Use descriptive `test.step()` names without `Step N` prefixes.
- Keep locators in page objects. Prefer `data-testid`, then role, text, label, placeholder, and selector fallbacks. Use `safeClick`, `safeFill`, `safeCheck`, `flakyClick`, or `flakyFill` where appropriate.

## Step 6: Type-check

```bash
npx tsc --noEmit
```

If type errors occur, load `fix-tsc-errors`.

## Step 7: Run only the generated mapping

Never run the whole feature file while developing one mapping.

```bash
npx playwright test tests/{domain}/{feature}.spec.ts --project=chromium --grep @<AUT-ID>
```

## Step 8: Diagnose failures before changing locators

If the test fails at least twice, capture the actual browser state and inspect the DOM before making another change. Then load `.agents/skills/resolve-flaky-tests/SKILL.md`, apply the smallest fix, and repeat Steps 6 and 7.

## Verification

Each round completes only when:

- `npx tsc --noEmit` passes.
- The isolated Playwright command for `@<AUT-ID>` passes.

## Example

### /automation AUT-E2E-008

- Run `npm run automation:context -- AUT-E2E-008`.
- Resolve the active source TC sheets.
- Update `tests/buyer/feeds.spec.ts`.
- Run `npx playwright test tests/buyer/feeds.spec.ts --project=chromium --grep @AUT-E2E-008`.
