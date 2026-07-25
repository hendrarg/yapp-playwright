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
tests/test-base.ts      fixture entry: test, authTest, creatorAuthTest
src/
  test-data/            static and factory test data
  pages/                page objects
  fixtures/             Playwright fixture wiring
  helpers/              auth, API, OTP, network helpers
  utils/                Playwright utilities and flaky/heal helpers
config/env.ts           environment variable access
.agents/                provider-neutral AI runtime, rules, commands, skills
```

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

If `YAPP_TEST_ACCESS_TOKEN` is expired, `authTest` and `creatorAuthTest` auto-refresh it through the OTP login flow, save the fresh token to `.env`, then inject it. With `PW_WORKERS > 1`, an expired token can cause multiple workers to attempt OTP login at once; refresh the token once first or use `PW_WORKERS=1`.

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

Do not use `@TAT-*` tags — they are retired. Unmapped tests must be assigned a validated `@AUT-*` ID via Google Sheets before merge.

Every test must also include:

- one feature tag such as `@feeds`
- one role tag: `@buyer` or `@creator`
- one priority tag: `@smoke`, `@regression`, or `@sanity`

## CI

GitHub Actions workflow: `.github/workflows/playwright.yml`.

Pipeline: `npm ci` -> `npx playwright install --with-deps chromium` -> `npm run test:smoke`.
