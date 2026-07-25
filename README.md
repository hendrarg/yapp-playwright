# Yapp — End-to-End Test Automation

Playwright-based end-to-end test automation for [Yapp](https://yapp.ink), a content monetization platform. Covers both **Buyer** and **Creator** experiences across two subdomains.

## Project Architecture

```
yapp/
├── .agents/                      # Agent runtime, rules, skills, commands
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
│   │   ├── base.fixture.ts       # Combined fixture entry point
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
```

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

Token injection sets the cookie on the apex domain so one token works for both buyer and creator subdomains. If `YAPP_TEST_ACCESS_TOKEN` is expired, `authTest` and `creatorAuthTest` auto-refresh it through the OTP login flow and save the fresh token to `.env`.

| Token | Env var | Owner | Use for |
|-------|---------|-------|---------|
| token1 | `YAPP_TEST_ACCESS_TOKEN` | Hendra (`jendraljohn92`) | Hendra-owned products and promotions |
| token2 | `YAPP_TEST_ACCESS_TOKEN_2` | Sundanese (`x7nv1.sdet`) | Creator-post seeding |

## Fixtures

Fixtures are composed via `test.extend()` in `src/fixtures/`. Spec files import from `tests/test-base.ts`, not `@fixtures/base.fixture` directly.

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
npx playwright test --grep @AUT-FV-082      # Single automation by tag
npx playwright test --ui
npx tsc --noEmit                            # Type-check only
npm run automation:context -- AUT-E2E-002   # Build automation context from Google Sheets
```

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `YAPP_BASE_URL` | Yes | Buyer app URL |
| `YAPP_CREATORS_BASE_URL` | Yes | Creator app URL |
| `YAPP_API_BASE_URL` | Yes | API base URL |
| `YAPP_TEST_ACCESS_TOKEN` | For auth tests | Hendra auth token (do not commit) |
| `YAPP_TEST_ACCESS_TOKEN_2` | Optional | Sundanese token for creator-post seeding |
| `TESTMAIL_API_KEY` | For OTP tests | testmail.app API key |
| `TESTMAIL_NAMESPACE` | For OTP tests | testmail.app namespace |
| `YAPP_AUTOMATION_SHEET_ID` | For `/automation` | Google Spreadsheet ID |
| `YAPP_AUTOMATION_MAPPING_GID` | For `/automation` | Automation Mapping sheet GID |
| `PW_HEADLESS` | No | Run headless (`true`/`false`, default `false` locally) |
| `PW_WORKERS` | No | Parallel worker count (default `1`) |

## CI/CD

GitHub Actions workflow in `.github/workflows/playwright.yml` runs on push to `main`/`master` and on pull requests:

1. `npm ci`
2. `npx playwright install --with-deps chromium`
3. `npx tsc --noEmit`
4. `npm run test:smoke` (skipped if `YAPP_TEST_ACCESS_TOKEN` is not configured)

CI runs on Ubuntu with 1 retry, headless Chromium, and HTML report artifacts (30-day retention).

## Agent Documentation

AI agent workflows, coding rules, and task skills live in `.agents/` and `AGENTS.md`. Read those before making automation changes.
