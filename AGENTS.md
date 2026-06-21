# Yapp E2E — Agent Guide

Playwright E2E tests for [Yapp](https://yapp.ink). Buyer and creator flows on two subdomains.

## OSS Commands

| Command | Purpose |
|---------|---------|
| `npm test` | Run all Playwright tests |
| `npx playwright test --project=chromium` | Single browser |
| `npx playwright test tests/buyer/explore.spec.ts` | Single file |
| `npx playwright test --ui` | UI mode |
| `npx tsc --noEmit` | Type-check only |

## TUI Commands (type `/` in OpenCode TUI)

| Command | Usage |
|---------|-------|
| `/test` | Run all tests |
| `/typecheck` | TypeScript type-check |
| `/test-file <path>` | Single test file (e.g. `/test-file tests/buyer/explore.spec.ts`) |
| `/test-ui` | Open Playwright UI mode |
| `/flaky <spec>` | Re-run a flaky test 3x with trace (e.g. `/flaky tests/buyer/explore.spec.ts`) |
| `/flaky-analyze` | Show trace from last failed flaky test |

## Architecture

```
test-cases/             ← test case documents (.md) — source of truth
  buyer/
  creator/
  auth/
tests/test-base.ts      ← fixture entry: test, authTest, creatorAuthTest
src/
  test-data/            ← test data (static + factory pattern)
  pages/                ← page objects (auth/, buyer/, creator/)
  fixtures/
    page.fixtures.ts    ← registers all page objects as fixtures
    base.fixture.ts     ← combo fixture (for tests that import from @fixtures/)
  helpers/
    auth/               ← token-login.ts, otp-login.ts
    otp/                ← Mailosaur client
  utils/
    playwright.utils.ts ← safeClick/safeFill/safeCheck, navigateAndWait, waitForLoaded
    flaky-utils.ts      ← flakyClick/flakyFill, retryUntil, flakyExpectText, flakyGoto
    heal-utils.ts       ← smartLocator/SmartHealable, smartClick/smartFill, buildSmartStrategies, Healable
config/env.ts           ← reads env vars (requireEnv pattern)
```

## Import conventions

- Use **path aliases**: `@pages/`, `@fixtures/`, `@utils/`, `@helpers/`, `@config/`
- Test specs import from `../test-base` (relative), not `@fixtures/base.fixture` directly
- Page objects get `baseURL` (buyer) or `creatorsBaseURL` (creator) injected via fixture

## Auth

Three fixture variants in `tests/test-base.ts`:

| Fixture | Auth method | Use for |
|---------|-------------|---------|
| `test` | None | OTP login tests, unauth pages |
| `authTest` | Injects `at` cookie for `baseURL` | Buyer pages |
| `creatorAuthTest` | Injects `at` cookie for `creatorsBaseURL` | Creator pages |

Token injection sets cookie on the **apex domain** (e.g. `.yapp.ink`) so one token serves both subdomains. Set `YAPP_TEST_ACCESS_TOKEN` in `.env`.

OTP login (Mailosaur) has 90s timeout. The `continue` button retry handles reCAPTCHA timing.

## Page objects

22 page objects in `src/pages/`:
- 6 buyer: `explorePage`, `cartPage`, `buyerFeedsPage`, `libraryPage`, `messagePage`, `buyerProfilePage`
- 15 creator: `affiliatePage`, `analyticsPage`, `campaignsPage`, `creatorFeedsPage`, `membershipPage`, `messagesPage`, `ordersPage`, `productsPage`, `creatorProfilePage`, `promotionsPage`, `referralPage`, `sessionsPage`, `settingsPage`, `streamingPage`, `walletPage`
- 1 auth: `loginPage`

Each has `goto()` and `expectLoaded()`. Add locators and methods as needed. Use:
- `safeClick`/`safeFill`/`safeCheck` from `@utils/playwright.utils` for standard interactions
- `flakyClick`/`flakyFill`/`flakyExpectText`/`flakyGoto` from `@utils/flaky-utils` for flaky elements
- `waitForLoaded`/`navigateAndWait` from `@utils/playwright.utils` for loading states

## Env vars

Loads `.env` at project root via `dotenv` in `playwright.config.ts`.

| Var | Required | Notes |
|-----|----------|-------|
| `YAPP_BASE_URL` | Yes | Buyer app |
| `YAPP_CREATORS_BASE_URL` | Yes | Creator app |
| `YAPP_TEST_ACCESS_TOKEN` | For authTest/creatorAuthTest | Do not commit |
| `MAILOSAUR_API_KEY` | For OTP tests | Do not commit |
| `MAILOSAUR_SERVER_ID` | For OTP tests | — |
| `PW_HEADLESS` | No | Defaults to `false` (headed) |
| `PW_WORKERS` | No | CI defaults to 1 |

## Conventions

- Viewport: full screen (`viewport: null` + `--start-maximized`)
- Runs **headed** by default (`headless: false` unless `PW_HEADLESS=true`)
- `forbidOnly: !!process.env.CI` — `test.only` fails on CI
- Retries: 2 on CI, 0 locally
- Page is closed in `afterEach` (logs `pass browser close`)
- Never commit `.env` (gitignored)

## Rules

Rules loaded from `.opencode/rules/` via `opencode.json`:

| File | Purpose |
|------|---------|
| `code-style.md` | TypeScript, POM, imports, naming conventions |
| `testing.md` | Fixture selection, test structure, tagging reference |

All tests must include tags from: `@T<id>`, `@<feature>`, `@buyer|@creator`, `@smoke|@regression|@sanity`.

## Test Cases → Automation Flow

```
test-cases/{domain}/{TC-ID}-{description}.md
    ↓ baca
add-test-spec skill
    ↓ generate
tests/{domain}/{TC-ID}-{description}.spec.ts
    ↓ import data dari
src/test-data/{domain}/{feature}.data.ts
```

Setiap automation test bersumber dari dokumen `.md` di `test-cases/`.
Dokumen `.md` berisi: Steps, Expected, Test Data, Tags.
AI membaca `.md` lalu mengimplementasikan Playwright spec-nya.

## Skills

Project-local skills in `.opencode/skills/` loaded automatically by the `skill` tool:

| Skill | Purpose |
|-------|---------|
| `add-page-object` | Scaffold a page object + register in fixtures |
| `add-test-spec` | Create a test spec following POM conventions |
| `fix-tsc-errors` | Run `tsc --noEmit` and fix type errors |
| `resolve-flaky-tests` | Systematic flaky element resolution — diagnose, apply fix, log pattern |
| `iterative-e2e-testing` | Round-based iterative test development (E2E → FV → API) |

## CI

GitHub Actions (`.github/workflows/playwright.yml`): `npm ci` → `npx playwright install --with-deps` → `npx playwright test`. Runs on push/PR to `main`/`master`.
