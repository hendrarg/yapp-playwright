# Yapp Agent Guide

Playwright E2E tests for Yapp. Buyer and creator flows run across two subdomains.

## Superpowers Workflow

Superpowers is the default development workflow for this repository.

- Start each task by invoking `using-superpowers` and checking for a matching skill.
- For new behavior or features, use `brainstorming` before implementation and get one approval for the design.
- After design approval, write and self-review the spec, then continue to `writing-plans` for multi-step work without requesting separate spec approval. Ask again only if the written spec materially changes the approved scope or leaves unresolved ambiguity.
- Default automation work to Inline Execution and do not ask the user to choose an execution mode. Use subagents only when explicitly requested or required by a mandatory repository workflow.
- Use `test-driven-development` for code changes, `systematic-debugging` for bugs, and `verification-before-completion` before claiming completion.
- Use `requesting-code-review` for substantial changes or before merging.
- Review the diff and run required verification before committing. After review, stage and commit each logical change in one execution.
- Name files under `docs/superpowers/specs/` and `docs/superpowers/plans/` without a date prefix.
- Keep this repository-specific guidance and the existing `.agents/` rules in force; do not copy the Superpowers plugin into the repository.

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

If `YAPP_TEST_ACCESS_TOKEN` is expired, `authTest` and `creatorAuthTest` auto-refresh it through the OTP login flow, save the fresh token to `.env`, then inject it. With `PW_WORKERS > 1`, an expired token can cause multiple workers to attempt OTP login at once; refresh the token once first or use `PW_WORKERS=1`.

## Environment Variables

| Var | Required | Notes |
|-----|----------|-------|
| `YAPP_BASE_URL` | Yes | Buyer app |
| `YAPP_CREATORS_BASE_URL` | Yes | Creator app |
| `YAPP_API_BASE_URL` | Yes | API base URL |
| `YAPP_TEST_ACCESS_TOKEN` | For auth fixtures | Do not commit |
| `YAPP_TEST_ACCESS_TOKEN_2` | Optional | Used to seed creator posts for E2E tests |
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

Do not create intermediate Markdown files. Automation Mapping and its active source TC sheets are the only supported inputs for generating new automation.

## Required Tags

Every mapped test must include:

- `@<Automation ID>` such as `@AUT-E2E-008` for mapped automation

Existing unmapped auth and creator tests may retain legacy `@TAT-A-*` or `@TAT-C-*` identifiers until a validated Automation Mapping row exists. Do not use these legacy identifiers for new tests.

Every test must also include:

- one feature tag such as `@feeds`
- one role tag: `@buyer` or `@creator`
- one priority tag: `@smoke`, `@regression`, or `@sanity`

## CI

GitHub Actions workflow: `.github/workflows/playwright.yml`.

Pipeline: `npm ci` -> `npx playwright install --with-deps chromium` -> `npm run test:smoke`.
