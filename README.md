> **Obsidian:** Source of truth for this README — the vault mirror is `raw/sources/yapp/README.md`. Vault: [[../../../raw/sources/yapp/README|raw mirror]] · [[projects/yapp/yapp|Hub]] · [[home|Vault home]]

# Yapp — End-to-End Test Automation

Playwright-based end-to-end test automation for [Yapp](https://yapp.ink), a content monetization platform. Covers both **Buyer** and **Creator** experiences across two subdomains.

## Multi-agent setup

This repo is worked on by several AI coding agents. `AGENTS.md` and `.agents/` are the
single source of truth for all of them — **edit only those.** Each tool reaches them
through a thin adapter:

| Tool | Reads | Adapter |
|------|-------|---------|
| Codex | `AGENTS.md` at the repo root | none needed |
| Cursor | `AGENTS.md`, `.cursor/rules/*.mdc` | generated |
| OpenCode | `AGENTS.md`, `opencode.json` → `.agents/rules/*` | committed config |
| Claude Code | `CLAUDE.md` → `AGENTS.md`, `.claude/skills/`, `.claude/commands/` | generated |

Rules travel as-is because `AGENTS.md` is a cross-tool convention. Skills and slash
commands cannot: every tool has its own format and only scans its own directory, so
`npm run agents:sync` projects `.agents/skills/` and `.agents/commands/` into each
tool's path. Those copies are **git-ignored and disposable** — editing one loses the
change on the next sync and hides it from the other agents.

```bash
npm run agents:sync    # regenerate adapters (also runs on postinstall)
npm run agents:check   # fail if any adapter is stale
```

## Project Architecture

```
yapp/
├── AGENTS.md                     # Project guide — source of truth for every agent
├── .agents/                      # ONLY place to edit agent config
│   ├── runtime.md                # Load order and rule precedence
│   ├── rules/                    # Always-on project rules
│   ├── skills/                   # Task workflows (+ registry.md)
│   └── commands/                 # Operation catalog / slash commands
├── CLAUDE.md                     # One line (@AGENTS.md) so Claude Code auto-loads it
├── opencode.json                 # Points OpenCode at .agents/rules/*
├── config/
│   └── env.ts                    # Environment variables & config
├── scripts/
│   ├── automation-context.mjs      # Google Sheets automation context builder
│   └── automation-context.test.mjs
├── src/
│   ├── pages/                    # Page Object Models
│   │   ├── auth/
│   │   ├── buyer/
│   │   ├── creator/
│   │   └── shared/
│   │       └── locators.ts       # Shared locators (≥2 pages)
│   ├── fixtures/
│   │   ├── page.fixtures.ts      # Page object registrations
│   │   └── mock.fixtures.ts      # Payment/email/analytics mocks
│   ├── helpers/
│   │   ├── api/                  # API seeding (post, promotion, webhook)
│   │   ├── auth/                 # Token login, OTP, token refresh
│   │   ├── network/              # Network mock helpers
│   │   └── otp/                  # testmail.app client
│   ├── test-data/
│   │   ├── buyer/
│   │   ├── creator/
│   │   ├── mocks/                # Mock response data
│   │   └── shared/
│   └── utils/
│       ├── playwright.utils.ts   # safeClick, safeFill, safeCheck
│       ├── heal-utils.ts         # smartLocator with fallback chain
│       └── flaky-utils.ts        # Flaky element resolution
├── tests/
│   ├── test-base.ts              # test, authTest, creatorAuthTest
│   ├── unit/                     # Offline unit tests (AI test-data generator)
│   ├── auth/
│   ├── buyer/
│   └── creator/
├── playwright.config.ts
├── tsconfig.json
└── package.json
```

## Page Object Model (POM)

Each page object encapsulates locators, actions, and assertions for a single page. Buyer pages receive `baseURL`; creator pages receive `creatorsBaseURL`. `LoginPage` only takes `page`.

### Page Object Hierarchy

```
LoginPage               → /auth

Buyer Pages (YAPP_BASE_URL)
├── ExplorePage         → /explore
├── LandingPage         → /
├── CartPage            → /cart
├── ProductPurchasePage → /{product-path}
├── FeedsPage           → /feeds, /post/{id}
├── LibraryPage         → /dashboard/library
├── MembershipPage      → /{handle}/membership
├── MessagePage         → /direct
├── ProfilePage         → /{handle}
├── TierDetailPage      → /{handle}/membership/{tierId}
├── TipPage             → /{handle}/tip
└── TransactionPage     → /transaction/{orderId}

Creator Pages (YAPP_CREATORS_BASE_URL)
├── AffiliatePage       → /affiliate
├── AnalyticsPage       → /analytics
├── CampaignsPage       → /campaigns
├── CustomizePage       → /customize
├── FeedsPage           → /feeds
├── MembershipPage      → /membership
├── MessagesPage        → /messages
├── OrdersPage          → /orders
├── ProductsPage        → /products
├── ProfilePage         → /profile
├── PromotionsPage      → /promotions
├── ReferralPage        → /referral
├── SessionsPage        → /consultation/sessions
├── SettingsPage        → /settings
├── StreamingPage       → /streaming
└── WalletPage          → /wallet

Product-type editors (page-object fixtures only — no buyerNav/creatorNav route yet)
├── ConsultationPage
├── DigitalProductPage
├── DiscordMembershipPage
├── EventsPage
├── EventGuestsPage
├── OnlineCoursePage
├── TelegramMembershipPage
└── StreamerOverlaysPage
```

Every page-object fixture is listed in `src/fixtures/page.fixtures.ts`; the routes above are the
ones wired into `buyerNav` / `creatorNav` (`src/helpers/buyer/nav.ts`, `src/helpers/creator/nav.ts`).
Adding a page to a nav is a six-step checklist — see `.agents/rules/testing.md`.

### Example

```typescript
import { authTest as test, expect } from '../test-base';

test('explore page loads without auth redirect', { tag: ['@explore', '@buyer', '@smoke'] }, async ({ explorePage }) => {
  await explorePage.goto();
  await explorePage.expectLoaded();
});
```

## Authentication

| Method | Description | Fixture |
|--------|-------------|---------|
| OTP Login | Real email OTP via testmail.app | `test` + `loginPage` |
| Token Injection | Injects `at` cookie from env | `authTest` (buyer), `creatorAuthTest` (creator) |

Token injection sets the cookie on the apex domain so one token works for both buyer and creator subdomains.

**Important:** every account has its own token slot, and a refresh writes back to **that** slot — it can no longer swap accounts. Token1 is the creator `hendrarg` (its OTP login uses `YAPP_CREATOR_LOGIN_EMAIL`); the buyer `anthony_mosciski` lives in `YAPP_TEST_ACCESS_TOKEN_BUYER` and logs in through the testmail QA inbox (`{TESTMAIL_NAMESPACE}.qa@inbox.testmail.app`); Sundanese uses `{TESTMAIL_NAMESPACE}.sdet@inbox.testmail.app` → `YAPP_TEST_ACCESS_TOKEN_2`. Owners are checked by the JWT **uuid**, since Yapp tokens carry no username. Run `npm run token:inspect` to verify which user each env var holds, or `npm run token:refresh -- creator|qa|sundanese` to refresh one slot (prefer `PW_WORKERS=1` so workers do not race one OTP inbox).

| Token | Env var | Owner | Use for |
|-------|---------|-------|---------|
| token1 | `YAPP_TEST_ACCESS_TOKEN` | Creator `hendrarg` (user 317) | `creatorAuthTest` + all creator-side seeding (products, promotions, consultations) |
| token2 | `YAPP_TEST_ACCESS_TOKEN_2` | Sundanese (user 345) | Creator-post seeding and second-account flows |
| buyer | `YAPP_TEST_ACCESS_TOKEN_BUYER` | QA buyer `anthony_mosciski` (user 459) | `authTest` — the buyer session |

## Fixtures

Fixtures are composed via `test.extend()` in `tests/test-base.ts`, which pulls the page, buyer-nav, and creator-nav fixtures out of `src/fixtures/`. Spec files import from `tests/test-base.ts`.

| Fixture | Description |
|---------|-------------|
| `test` | Base unauthenticated test |
| `authTest` | Buyer with injected token (default for buyer pages) |
| `creatorAuthTest` | Creator with injected token (default for creator pages) |
| `mockTest` | From `@fixtures/mock.fixtures` — toggleable payment/email/analytics mocks |

Page object fixtures (`explorePage`, `buyerFeedsPage`, `productsPage`, etc.) are injected automatically. See `src/fixtures/page.fixtures.ts` for the full list.

Mixed auth + guest specs:

```typescript
import { authTest as test, test as guestTest, expect } from '../test-base';
```

## AI-Assisted Test Data

Creator-content fields (product/consultation titles & descriptions, online-course chapters/episodes, post captions, campaign and membership copy) are generated **AI-first, seeded-Faker fallback** — the same pattern as the eDOT project. Factories in `src/test-data/` read from `src/test-data/ai/`.

- **How it works:** one Gemini call per run (`tests/test-base.ts` → `warmAiCache()`) fetches a JSON content bundle; synchronous factories consume it via `getAiText(kind, fallback)`. When the bundle is missing or exhausted, or no `GEMINI_API_KEY` is set, factories fall back to seeded Faker — the generator never fails.
- **Determinism:** the Faker fallback is seeded per run (`getRunSeed()` → `faker.seed()`), so output is reproducible within a run and unique across runs. Gemini output itself is not deterministic; replay a logged bundle via `YAPP_TEST_AI_BUNDLE` to reproduce an AI-enabled run exactly.
- **Scope:** only creator-content text is AI-generated. Prices, stock, categories, addresses, promo names/codes, and exact-word-count fields (e.g. the 500-word buyer-only description) stay Faker/static.
- **Product-type aware:** the prompt carries Yapp's five offering types (Digital Product, Online Course, Consultation, Discord/Telegram Membership, Events and Tickets), and digital products draw from a different content pool than online courses — so a downloadable gets download wording and a course gets learning-program wording.
- **Pricing aware:** the prompt states that every product type starts free — the `Add Pricing` toggle is ON by default with a price value of `0`, and switching it OFF is free too — and that price `0` renders as a `Free` label / `FREE` checkout badge with payment skipped. Because one content pool serves both free and paid offerings, generated copy never mentions prices, discounts, or currency amounts, and never uses a bare `Free`/`Gratis` as a title — those are UI price labels.
- **Offline:** with no `GEMINI_API_KEY` the SDK is never imported and no network call is made.

Run `npm run test:unit` to verify the generator offline.

## Setup

```bash
npm install
npx playwright install
cp .env.example .env
# Fill in env vars
```

## Running Tests

```bash
npm test                                    # All Chromium tests
npm run test:smoke                          # @smoke only
npm run test:regression                     # @regression only
npx playwright test tests/buyer/explore.spec.ts
npx playwright test --grep @AUT-FE-012      # Single automation by tag (legacy @AUT-FV-* tags still run)
npx playwright test --ui
npm run typecheck                           # tsc --noEmit
npx eslint .                                # Lint; add --fix for mechanical fixes
npm run audit:tags                          # Tag audit
npm run audit:locators                      # Fragile-locator audit
npm run audit:aut-order                     # Ascending @AUT-* order
npm run clean:artifacts                     # Drop MCP dumps older than 7 days
npm run db:shell -- "SELECT 1"              # Read-only SQL against the dev DB
npm run automation:context -- AUT-E2E-002   # Build automation context from Google Sheets
```

Viewport is fixed at 1440x900 to match the MCP browser, because the app renders separate
mobile and desktop trees. Override with `PW_VIEWPORT=1280x720` or `PW_VIEWPORT=maximized`.

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `YAPP_BASE_URL` | Yes | Buyer app URL |
| `YAPP_CREATORS_BASE_URL` | Yes | Creator app URL |
| `YAPP_API_BASE_URL` | Yes | API base URL |
| `YAPP_TEST_ACCESS_TOKEN` | For creator auth/API seeding | Creator `hendrarg` token; auto-refreshed via OTP, code read from `otp_codes` (do not commit) |
| `YAPP_TEST_ACCESS_TOKEN_BUYER` | For buyer auth | QA buyer `anthony_mosciski` token; auto-refreshed via `*.qa@inbox.testmail.app` (do not commit) |
| `YAPP_CREATOR_LOGIN_EMAIL` | For creator token refresh | Login email of `hendrarg` (do not commit) |
| `YAPP_TEST_ACCESS_TOKEN_2` | Optional | Sundanese token for creator-post seeding and second-account flows |
| `TESTMAIL_API_KEY` | For OTP tests | testmail.app API key |
| `TESTMAIL_NAMESPACE` | For OTP tests | testmail.app namespace |
| `YAPP_AUTOMATION_SHEET_ID` | For `/automation` | Google Spreadsheet ID |
| `YAPP_AUTOMATION_MAPPING_GID` | For `/automation` | Automation Mapping sheet GID |
| `YAPP_AUTOMATION_CLARIFICATIONS_SHEET` | No | Defaults to `Automation Clarifications` |
| `PW_HEADLESS` | No | Run headless (`true`/`false`, default `false` locally) |
| `PW_WORKERS` | No | Parallel worker count (default `1`; prefer `1` when a run may refresh a token) |
| `PW_VIEWPORT` | No | `1440x900` default; `<w>x<h>` or `maximized` |
| `YAPP_MCP_ACCOUNT` | No | Account injected into the MCP browser: `creator` (default), `buyer`, `sundanese`, or `guest` |
| `YAPP_PLAYWRIGHT_BROWSERS_PATH` | No | Stable Playwright browser cache; sandboxes otherwise re-download Chromium |
| `YAPP_DB_FIXTURES` | No | `1` lets the `dbFixtures` fixture change whitelisted dev-DB rows (restored after each test); never set against production |
| `GEMINI_API_KEY` | No | Enables AI-assisted test data (Google Gemini). Absent → seeded-Faker only |
| `GEMINI_MODEL` | No | Gemini model for test data (default `gemini-3.5-flash-lite`) |
| `YAPP_TEST_SEED` | No | Fixed Faker seed to reproduce a run exactly (default per-run timestamp) |
| `YAPP_TEST_AI_BUNDLE` | No | Replay a previously logged AI bundle for an exact AI-enabled re-run |

## CI/CD

`.github/workflows/playwright.yml` runs on push to `main`/`master`, on pull requests, on a
nightly cron (19:00 UTC), and on manual dispatch. Two jobs:

**`static`** — no browser, no credentials, fails in under a minute:
`npm ci` → `npm run typecheck` → `npx eslint .` → `npm run audit:aut-order`, then
`audit:tags` and `audit:locators` as advisory steps (see **Known backlog** in `AGENTS.md`).

**`test`** — needs `static`: installs Chromium, then runs `test:smoke` on push/PR,
`test:regression` on the nightly cron, or the suite picked via `workflow_dispatch`.
Skipped when `YAPP_TEST_ACCESS_TOKEN` is not configured. Uploads the HTML report and
`test-results/junit.xml` (30-day retention). Ubuntu, headless Chromium, 1 retry.

**Locally**, `.githooks/pre-commit` runs the same blocking checks. Enable it once per
clone with `git config core.hooksPath .githooks`; bypass with `SKIP_HOOKS=1`.

## Agent Documentation

AI agent workflows, coding rules, and task skills live in `.agents/` and `AGENTS.md`. Read those before making automation changes.
