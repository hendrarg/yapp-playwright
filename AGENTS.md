# Yapp Agent Guide

Playwright E2E tests for Yapp. Buyer and creator flows run across two subdomains.


## Required Agent Runtime

Before making changes, every AI agent must read:

1. `.agents/runtime.md`
2. `.agents/rules/code-style.md`
3. `.agents/rules/testing.md`

When the task matches a workflow in `.agents/skills/registry.md`, read the matching `.agents/skills/*/SKILL.md` before acting. Treat `.agents/commands/` as the command catalog for common project operations.

Priority order when instructions conflict:

1. `AGENTS.md`
2. `.agents/runtime.md`
3. `.agents/rules/*.md`
4. The task-specific skill document

**Non-overridable rules:** Task skills may add workflow detail but must **not** weaken requirements from `.agents/rules/` — especially `code-style.md` (`smartLocator`, reuse-gate exceptions) and `testing.md` (minimum test depth, API seeding, locator placement). Only an explicit user override can relax a rule.

## Fast Path for Scoped Playwright Work

First determine the mode with `rg -n "@<AUT-ID>" tests`:

- **New automation**: no existing test has the exact AUT tag. Create a short local plan at `docs/automation-plans/<AUT-ID>.md` before editing. It contains only the ordered test steps, covered source TC IDs, expected result for each step, and the existing step/helper/locator to reuse. Do not wait for separate plan approval; continue inline.
- **Small update/edit**: the AUT tag already exists and the request changes its current implementation. Do not create a plan document.

Then work inline and finish through this sequence:

1. Load the validated automation context when an AUT ID exists.
2. Complete the Mandatory Reuse Gate.
3. Apply the smallest edit to existing files. **Every new or touched page-object locator must use `smartLocator`** — fragile CSS/XPath-only locators are `Extend`, not `Reuse` unchanged (see `.agents/rules/code-style.md` and `add-test-spec` Step 5).
4. Run `npx tsc --noEmit`.
5. Run only the target AUT once.
6. Stop when it passes.

Do not create long design documents or implementation plans. The short new-automation test-step plan is local-only and must not be committed. Do not create worktrees or subagents, and do not ask the user to choose an execution mode for this fast path.

Use an extended planning or delegated workflow only when the user explicitly requests it, the task spans multiple independent systems, or a blocking architectural decision cannot be resolved from repository evidence.

## Project Commands

| Command | Purpose |
|---------|---------|
| `npm test` | Run all Chromium tests |
| `npm run test:smoke` | Run Chromium smoke tests |
| `npm run test:regression` | Run Chromium regression tests |
| `npx playwright test --project=chromium` | Single browser |
| `npx playwright test tests/buyer/explore.spec.ts` | Single file |
| `npx playwright test tests/buyer/feeds.spec.ts --grep @AUT-E2E-008` | Run one mapped automation by tag |
| `npm run automation:context -- AUT-E2E-002` | Build validated context from Google Sheets |
| `npx playwright test --ui` | Playwright UI mode |
| `npx tsc --noEmit` | Type-check only |
| `npm run audit:tags` | Audit TC, feature, role, priority tags |
| `npm run audit:locators` | Audit fragile locators in page objects |

## Architecture

```text
tests/test-base.ts      fixture entry: test, authTest, creatorAuthTest + buyerNav, creatorNav
src/
  test-data/            static and factory test data
  pages/                page objects
  fixtures/             Playwright fixture wiring (page, buyer-nav, creator-nav)
  helpers/
    buyer/nav.ts        buyerNav routes (authTest)
    creator/nav.ts      creatorNav routes (creatorAuthTest)
  utils/                Playwright utilities and flaky/heal helpers
config/env.ts           environment variable access
.agents/                provider-neutral AI runtime, rules, commands, skills
```

## Navigation fixtures

| Fixture | Domain | Available on | Helper |
|---------|--------|--------------|--------|
| `buyerNav` | Buyer (`baseURL`) | `test`, `authTest` | `src/helpers/buyer/nav.ts` |
| `creatorNav` | Creator (`creatorsBaseURL`) | `test`, `creatorAuthTest` | `src/helpers/creator/nav.ts` |

Prefer `buyerNav.open('feeds')` / `creatorNav.open('products')` over raw `page.goto()` in specs.

**Adding a new route:** follow the domain checklist in `.agents/rules/testing.md`:
- Buyer → section **Buyer navigation** → **Adding a new buyer route**
- Creator → section **Creator navigation** → **Adding a new creator route**

Also see `.agents/skills/add-page-object/SKILL.md` step 6 when scaffolding a page object.

## Import Conventions

- Use path aliases: `@pages/`, `@fixtures/`, `@utils/`, `@helpers/`, `@config/`, `@test-data/`.
- Test specs import from `../test-base`, not `@fixtures/base.fixture`.
- Page objects receive `baseURL` for buyer pages or `creatorsBaseURL` for creator pages through fixtures.

## Auth

| Fixture | Auth method | Use for |
|---------|-------------|---------|
| `test` | None | OTP login tests, guest flows, unauth pages |
| `authTest` | Injects `at` cookie for `baseURL` | Buyer pages |
| `creatorAuthTest` | Injects `at` cookie for `creatorsBaseURL` | Creator pages |

Token injection sets the cookie on the apex domain so one token can serve buyer and creator subdomains. Set `YAPP_TEST_ACCESS_TOKEN` in `.env`.

Token mapping:

- `YAPP_TEST_ACCESS_TOKEN` (token1) belongs to Hendra (`jendraljohn92`). Use it for Hendra-owned products and promotions.
- `YAPP_TEST_ACCESS_TOKEN_2` (token2) belongs to Sundanese (`x7nv1.sdet`). Use it for creator-post seeding.

If `YAPP_TEST_ACCESS_TOKEN` is expired or belongs to the wrong user, `authTest` / `creatorAuthTest` fail fast with a clear error. **OTP login uses the testmail Sundanese inbox** (`{TESTMAIL_NAMESPACE}.sdet@inbox.testmail.app`) and saves to `YAPP_TEST_ACCESS_TOKEN_2` only — it must not overwrite token1. Refresh Hendra (token1) manually. Run `npm run token:inspect` to verify mapping. With `PW_WORKERS > 1`, an expired token can cause multiple workers to fail at once; refresh token1 first or use `PW_WORKERS=1`.

## Environment Variables

| Var | Required | Notes |
|-----|----------|-------|
| `YAPP_BASE_URL` | Yes | Buyer app |
| `YAPP_CREATORS_BASE_URL` | Yes | Creator app |
| `YAPP_API_BASE_URL` | Yes | API base URL |
| `YAPP_TEST_ACCESS_TOKEN` | For Hendra auth/API setup | Do not commit |
| `YAPP_TEST_ACCESS_TOKEN_2` | Optional Sundanese token | Used to seed creator posts for E2E tests |
| `YAPP_AUTOMATION_SHEET_ID` | For `/automation` | Google Spreadsheet ID |
| `YAPP_AUTOMATION_MAPPING_GID` | For `/automation` | Automation Mapping sheet GID |
| `YAPP_AUTOMATION_CLARIFICATIONS_SHEET` | No | Defaults to `Automation Clarifications` |
| `TESTMAIL_API_KEY` | For OTP tests | Do not commit |
| `TESTMAIL_NAMESPACE` | For OTP tests | Do not commit |
| `PW_HEADLESS` | No | Defaults to `false` |
| `PW_WORKERS` | No | Defaults to 1 |
| `YAPP_PLAYWRIGHT_BROWSERS_PATH` | No | Optional stable Playwright browser cache. Cursor sandboxes otherwise point at empty Temp paths and re-download Chromium. |

## Test Case Flow

```text
/automation <AUT-ID>
  -> read Automation Mapping and active source TC sheets
  -> load relevant .agents skill
  -> append to tests/{domain}/{feature}.spec.ts
  -> import data from src/test-data/{domain}/{feature}.data.ts
  -> run only the mapped automation with --grep @<AUT-ID>
```

Do not create intermediate Markdown files other than the required short, local test-step plan for a new AUT. Automation Mapping and its active source TC sheets remain the authoritative inputs.

## Required Tags

Every mapped test must include:

- `@<Automation ID>` such as `@AUT-E2E-008` or `@AUT-FV-216` from Automation Mapping

Unmapped tests must be assigned a validated `@AUT-*` ID via Google Sheets before merge.

Every test must also include:

- one feature tag such as `@feeds`
- one role tag: `@buyer` or `@creator`
- one priority tag: `@smoke`, `@regression`, or `@sanity`

## CI

GitHub Actions workflow: `.github/workflows/playwright.yml`.

Pipeline: `npm ci` -> `npx playwright install --with-deps chromium` -> `npm run test:smoke`.
