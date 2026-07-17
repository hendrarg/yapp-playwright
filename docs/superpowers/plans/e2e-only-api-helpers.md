# E2E-Only API Helpers Implementation Plan

> **For agentic workers:** Execute this plan inline with verification checkpoints.

**Goal:** Remove standalone API tests while retaining API calls only as helpers inside browser scenarios.

**Architecture:** Browser projects are the only Playwright projects. API request code remains under `src/helpers/api/` for E2E setup, cleanup, and scenario support; `tests/api/` and the dedicated API fixture/project are removed.

**Tech Stack:** Playwright, TypeScript, GitHub Actions.

## Global Constraints

- CI must run headless.
- Pull requests run Chromium smoke tests only.
- Nightly runs regression tests across Chromium, Firefox, and WebKit.
- API calls may support browser tests but must not be standalone API tests.
- Do not add new dependencies.

### Task 1: Remove standalone API test surface

**Files:**
- Delete: `tests/api/buyer.example.spec.ts`
- Delete: `tests/api/creator.example.spec.ts`
- Delete: `tests/api/creator.post.spec.ts`
- Delete: `src/fixtures/api.fixtures.ts`
- Modify: `playwright.config.ts`

- [ ] Remove the dedicated `api` project and API-only fixture imports.
- [ ] Keep `src/helpers/api/` because browser specs already use API setup and cleanup.
- [ ] Confirm no remaining source imports `api.fixtures`.

### Task 2: Configure CI execution lanes

**Files:**
- Modify: `playwright.config.ts`
- Modify: `.github/workflows/playwright.yml`

- [ ] Force headless mode when `CI` is set while preserving local environment override behavior.
- [ ] Make PR/push execution use Chromium with `--grep @smoke`.
- [ ] Add a scheduled nightly job for all browser projects with regression coverage.
- [ ] Remove API project listing and API-only CI validation.
- [ ] Keep required environment variables and artifact upload behavior.

### Task 3: Verify the resulting test surface

**Files:**
- Test: `playwright.config.ts`, `.github/workflows/playwright.yml`, and remaining `tests/**/*.spec.ts`

- [ ] Run `npx tsc --noEmit`.
- [ ] Run `npx playwright test --project=chromium --list` and confirm no `tests/api` entries.
- [ ] Run `npx playwright test --list` and confirm only browser projects remain.
- [ ] Audit remaining API usage to ensure it is helper/setup usage inside browser specs.
