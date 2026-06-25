# Yapp — End-to-End Test Automation

Playwright-based end-to-end test automation for [Yapp](https://yapp.ink), a content monetization platform. Covers both **Buyer** and **Creator** experiences across two subdomains.

## Project Architecture

```
yapp/
├── config/
│   └── env.ts                    # Environment variables & config
├── src/
│   ├── pages/                    # Page Object Models
│   │   ├── auth/
│   │   │   └── LoginPage.ts
│   │   ├── buyer/
│   │   │   ├── ExplorePage.ts
│   │   │   ├── CartPage.ts
│   │   │   ├── FeedsPage.ts
│   │   │   ├── LibraryPage.ts
│   │   │   ├── MessagePage.ts
│   │   │   └── ProfilePage.ts
│   │   └── creator/
│   │       ├── AffiliatePage.ts
│   │       ├── AnalyticsPage.ts
│   │       ├── CampaignsPage.ts
│   │       ├── FeedsPage.ts
│   │       ├── MembershipPage.ts
│   │       ├── MessagesPage.ts
│   │       ├── OrdersPage.ts
│   │       ├── ProductsPage.ts
│   │       ├── ProfilePage.ts
│   │       ├── PromotionsPage.ts
│   │       ├── ReferralPage.ts
│   │       ├── SessionsPage.ts
│   │       ├── SettingsPage.ts
│   │       ├── StreamingPage.ts
│   │       └── WalletPage.ts
│   ├── fixtures/
│   │   ├── base.fixture.ts       # Combined fixture entry point
│   │   └── page.fixtures.ts      # Page object registrations
│   ├── helpers/
│   │   ├── api/
│   │   ├── auth/
│   │   └── otp/
│   └── utils/
│       └── playwright.utils.ts   # Safe action helpers
├── tests/
│   ├── test-base.ts              # Base test fixtures
│   ├── auth/
│   ├── buyer/
│   └── creator/
├── playwright.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

## Page Object Model (POM)

Each page object encapsulates locators, actions, and assertions for a single page.

### Page Object Hierarchy

```
LoginPage               → /auth

Buyer Pages (YAPP_BASE_URL)
├── ExplorePage         → /explore
├── CartPage            → /cart
├── FeedsPage           → /feeds
├── LibraryPage         → /dashboard/library
├── MessagePage         → /direct
└── ProfilePage         → /profile

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
import { authTest as test, expect } from "../test-base";

test("explore page loads without auth redirect", async ({ explorePage }) => {
  await explorePage.goto();
  await explorePage.expectLoaded();
});
```

## Authentication

| Method | Description | Fixture |
|--------|-------------|---------|
| OTP Login | Real email OTP via testmail.app | `test` + `LoginPage` |
| Token Injection | Injects `at` cookie from env | `authTest` (buyer), `creatorAuthTest` (creator) |

## Fixtures

Fixtures are composed via `test.extend()` in `src/fixtures/`. All page objects and auth variants are available from `tests/test-base.ts`.

| Fixture | Description |
|---------|-------------|
| `test` | Base unauthenticated test |
| `authTest` | Buyer with injected token |
| `creatorAuthTest` | Creator with injected token |
| `loginPage` | Auth page object |
| `explorePage` | Buyer explore page |
| *all page objects* | Injected automatically |

## Setup

```bash
npm install
npx playwright install
cp .env.example .env
# Fill in env vars
```

## Running Tests

```bash
npm test                              # All tests
npx playwright test --project=chromium
npx playwright test tests/buyer/explore.spec.ts
npx playwright test --ui
```

## Configuration

| Variable | Description |
|----------|-------------|
| `YAPP_BASE_URL` | Buyer app URL |
| `YAPP_CREATORS_BASE_URL` | Creator app URL |
| `YAPP_API_BASE_URL` | API base URL |
| `YAPP_TEST_ACCESS_TOKEN` | Pre-obtained auth token |
| `TESTMAIL_API_KEY` | testmail.app API key |
| `TESTMAIL_NAMESPACE` | testmail.app namespace |
| `PW_HEADLESS` | Run headless (`true`/`false`) |
| `PW_WORKERS` | Parallel worker count |

## CI/CD

GitHub Actions workflow in `.github/workflows/playwright.yml` runs on push to `main`/`master` and on pull requests. Tests run on Ubuntu with retries (2x in CI) and HTML report artifacts.
