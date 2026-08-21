---
name: add-test-spec
description: Use when generating Playwright automation from a Google Sheets AUT mapping ID
---

## When to use

Use `/automation <AUT-ID>` for an Automation Mapping row and its covered manual TCs in Google Sheets.

## Execution Mode

Check for the exact AUT tag with `rg -n "@<AUT-ID>" tests`. If it does not exist, create `docs/automation-plans/<AUT-ID>.md` containing only an ordered table of source TC ID, test step, expected result, and reuse target; keep it local and uncommitted, then continue inline without an approval pause. If the tag exists and this is a small update/edit, create no plan. Continue with context → reuse gate → minimum edit → type-check → one isolated run → stop on pass. Do not create long plans, worktrees, or subagents unless an extended workflow condition in `AGENTS.md` is met.

## Workflow

1. Run `npm run automation:context -- <AUT-ID>`.
2. If validation fails, stop and report the exact TC IDs, source rows, or open clarifications. Do not guess.
3. Complete the blocking Mandatory Reuse Gate in Step 1. Do not edit before it is complete.
4. For every Automation Mapping ID, generate exactly one Playwright `test()`; the mapping is the automation testcase.
5. For `AUT-E2E-*`, make the covered journey actions `test.step()` calls. Do not add `covers` annotations — Automation Mapping already holds the covered TC IDs (see `.agents/rules/testing.md`).
6. For `AUT-FV-*`, keep covered manual TCs as ordered `test.step()` calls inside the single test; parameterize only identical flows with different data.
7. Tag the single generated test with the exact Automation ID, for example `@AUT-E2E-008`.
8. Continue with the fixture, page-object, test-data, type-check, and isolated Playwright steps below.

Do not create intermediate Markdown files other than the required short test-step plan for a new AUT. Keep locators in page objects and never hide ambiguity with `.first()`.

## Step 1: Complete the Mandatory Reuse Gate

```bash
read .agents/skills/reuse-patterns/SKILL.md
```

- Read the target spec, its page objects, 1-2 similar specs, and every AUT explicitly referenced by the user.
- Search `tests/` and `src/` with `rg` for matching step intent, locators, page-object methods, helpers, utils, fixtures, mocks, and test data.
- In the working conversation, classify every required operation as **Reuse**, **Extend**, or **New**.
- Do not begin implementation until this inventory is complete.
- New code requires search evidence that no suitable implementation can be reused or minimally extended.
- Extract locators if at least two pages use the same element.
- **Reuse behavior and page-object methods, not fragile selectors.** If an existing locator is CSS/XPath-only (`page.locator('.class')`, raw XPath) or a single-strategy `getByRole`/`getByText` without fallback, classify it as **Extend** and wrap or replace it with `smartLocator` when you touch that page object for this AUT. Do not copy fragile selectors unchanged into new code.

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
- If needed, create `src/test-data/{domain}/{feature}.data.ts` (feature slice, not per AUT ID).
- Free-text inputs (title, description, notes, comments) **must** use faker factories — see `.agents/rules/testing.md` → **Free-text input factories**. Never prefix values with `@AUT-*` / `AUT-FV-*`.
- Update `src/test-data/index.ts`.

## Step 4b: API seeding and cleanup (when pre-created data is required)

Search existing helpers before writing new API calls:

```bash
rg "createPost|deletePost|depositWebhook|createPromotion" src/helpers/api tests/
```

| Token | Env var | Owner | Use for |
|-------|---------|-------|---------|
| token1 | `YAPP_TEST_ACCESS_TOKEN` | QA Tester (`x7nv1.qa`) | Primary auth + products, promotions, buyer media seeding (auto OTP refresh when expired) |
| token2 | `YAPP_TEST_ACCESS_TOKEN_2` | Sundanese (`x7nv1.sdet`) | Creator-post seeding consumed by buyer tests |

**When to seed via API:** the UI under test depends on data that does not exist reliably in the environment (new post, promotion, exclusive content, order state).

**Pattern:**

```typescript
const seedToken = process.env.YAPP_TEST_ACCESS_TOKEN_2?.replace(/"/g, '');
test.skip(!seedToken, 'YAPP_TEST_ACCESS_TOKEN_2 is required to seed creator post for this test');
if (!seedToken) return;

const postData = generatePostData({ content: `AUT-FV-077 ${Date.now()}`, visibility: 'public' });
let postId = '';

try {
  await test.step('Create public post via API', async () => {
    ({ postId } = await createPost(page.request, postData, seedToken));
    expect(postId).toBeDefined();
  });

  await test.step('Verify post appears in feeds', async () => {
    // UI steps...
  });
} finally {
  if (postId) await deletePost(page.request, postId, seedToken);
}
```

**Rules:**
- Always clean up mutable seeded data in `finally` when the helper supports delete.
- Use `test.skip()` with a clear message when a required token is missing — do not throw inside the test body for optional env deps.
- Use factory data from `@test-data/` — never hardcode business payloads in specs.
- Prefer existing helpers in `@helpers/api/` over raw `page.request` calls.

## Step 5: Insert the mapped automation into its feature spec (ascending AUT order)

- Add to `tests/{domain}/{feature}.spec.ts`; create the feature spec only if it does not exist. Import the fixture from `../test-base`.
- **Insert the new `test()` in ascending `@AUT-*` order** inside the describe block (`@AUT-E2E-*` before `@AUT-FV-*`, then by numeric ID). Do not append out of order at the bottom — see `.agents/rules/testing.md` → **Ascending AUT order**.
- Import test data with `@test-data/{domain}/{feature}.data`.
- Use the exact `@<AUT-ID>`, one feature tag, `@buyer` or `@creator`, and one priority tag.
- Use the descriptive automation title as the test title; keep the Automation ID in the tag.
- Use descriptive `test.step()` names without `Step N` or manual TC ID prefixes (e.g. no `TC-PRM-C-018:` in the step title). Traceability lives in the `@AUT-*` tag and Automation Mapping, not in the spec.
- Keep locators in page objects — never in spec files.
- **Every new or touched locator MUST use `smartLocator` from `@utils/heal-utils`** with the full fallback chain from `.agents/rules/code-style.md`: `testId` → `role` → `text` → `label` → `placeholder` → `selector` (last resort only).
- Provide at least two strategies per locator. CSS/XPath alone is forbidden for new locators.
- For interactions on `smartLocator` elements, use `smartClick` / `smartFill` from `@utils/heal-utils`, or `safeClick` / `safeFill` / `safeCheck` from `@utils/playwright.utils` on standard Playwright locators.
- When extending an existing page object, upgrade any fragile locator you rely on in this AUT to `smartLocator` in the same edit — do not leave CSS-only locators adjacent to new `smartLocator` ones on the same page.

### Minimum test depth checklist (required before Step 6)

Every generated `@AUT-*` test must pass this checklist:

- [ ] Every covered manual TC ID from the automation context has a matching `test.step()`, and no TC ID appears in a step title.
- [ ] **`@AUT-E2E-*`:** full journey from the sheet — smoke-only (`goto` + `expectLoaded`) is **forbidden**.
- [ ] **`@AUT-FV-*`:** at least one interaction and one assertion beyond `expectLoaded()` per covered TC step.
- [ ] No locators in the spec file — all UI targeting lives in page objects.
- [ ] API seeding added when the flow needs pre-created data (Step 4b).
- [ ] After append, run `npm run audit:tags` — fix any tag gaps before finishing.

For new locators, read `.agents/skills/generate-locators-mcp/SKILL.md` and validate against the browser before writing the spec.

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

If the test fails at least twice, capture the actual browser state and inspect the DOM before making another change. Load `.agents/skills/generate-locators-mcp/SKILL.md` when defining or fixing locators, then `.agents/skills/resolve-flaky-tests/SKILL.md` for actionability fixes. Repeat Steps 6 and 7. When a locator fix is needed, prefer rewriting with `smartLocator` (add missing strategies from the DOM snapshot) over swapping one fragile selector for another.

## Verification

Each round completes only when:

- `npx tsc --noEmit` passes.
- The isolated Playwright command for `@<AUT-ID>` passes.

Run the isolated target once after the latest code change and stop when it passes. After a failure and fix, run it once again. Do not use `--repeat-each`, repeated confirmation runs, a full spec, or a broader suite unless the user explicitly requests them.

## Example

### /automation AUT-E2E-008

- Run `npm run automation:context -- AUT-E2E-008`.
- Resolve the active source TC sheets.
- Update `tests/buyer/feeds.spec.ts`.
- Run `npx playwright test tests/buyer/feeds.spec.ts --project=chromium --grep @AUT-E2E-008`.
