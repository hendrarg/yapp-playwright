# Code Style

## Imports
- Use path aliases: `@pages/`, `@fixtures/`, `@utils/`, `@helpers/`, `@config/`
- Test specs import from `../test-base` (relative), never from `@fixtures/base.fixture` directly
- Do not use deep relative imports (`../../src/...`) where path aliases work

## Page Objects
- Constructor: `(page: Page, baseURL: string)` — buyer pages get `baseURL`, creator pages get `creatorsBaseURL`
- `LoginPage` only takes `page: Page` (no baseURL needed)
- Locators declared as `readonly` properties in constructor
- Each page object must have `goto()` and `expectLoaded()`
- Methods named as actions (`search()`, `selectFilter()`, `submitForm()`)
- Assertion methods prefixed `expect*()` (`expectLoaded()`, `expectItemVisible()`)
- Use `safeClick`/`safeFill`/`safeCheck` from `@utils/playwright.utils` for flakiness-prone interactions
- **Reuse over rewrite**: Before adding a new locator/method, check existing page objects, helpers, and utils for identical or similar patterns. If the same locator appears in ≥2 pages, extract to `src/pages/shared/locators.ts`. If the same step sequence appears in ≥2 tests, extract to a helper.

## Selector Priority
When creating locators, use `smartLocator` from `@utils/heal-utils` with fallback chain. Always provide multiple selector strategies ordered by stability:

| Priority | Strategy | Stability |
|----------|----------|-----------|
| 1 | `testId` — `data-testid` attribute | 🌟 Most stable |
| 2 | `role` — `getByRole()` semantic selector | Semantic, rarely changes |
| 3 | `text` — `getByText()` visible text | Visible text |
| 4 | `label` — `getByLabel()` form labels | Form elements |
| 5 | `placeholder` — `getByPlaceholder()` | Input hints |
| 6 | `selector` — CSS/XPath (avoid if possible) | 💀 Fragile |

```typescript
// ✅ Good — full fallback chain
readonly nameInput = smartLocator(this.page, {
  testId: 'name-input',
  role: 'textbox',
  label: 'Name',
  placeholder: 'Enter name',
});

// ❌ Avoid — single fragile locator
readonly nameInput = this.page.locator('.form-input-name');
```

## File Naming
- Page objects: PascalCase (`ExplorePage.ts`, `CartPage.ts`)
- Helpers/utils: camelCase (`otp-login.ts`, `playwright.utils.ts`)
- Fixtures: kebab-case (`page.fixtures.ts`, `base.fixture.ts`)
- Test specs: kebab-case (`explore.spec.ts`, `otp-login.spec.ts`)

## Separation
- `src/pages/` — UI interaction logic only
- `src/helpers/` — service logic (API calls, OTP, auth, network mocking, seeding)
  - `src/helpers/api/` — API seeding helpers
  - `src/helpers/auth/` — auth helpers (token-login, OTP login)
  - `src/helpers/network/` — network mock helpers
  - `src/helpers/otp/` — testmail.app client
- `src/utils/` — generic reusable utilities
- `src/fixtures/` — Playwright fixture wiring (page, API, mock)
- `src/test-data/` — test data (static + factory pattern)
  - `src/test-data/mocks/` — mock response data (payment, email, errors)
- `tests/api/` — API-only test specs (no browser)
