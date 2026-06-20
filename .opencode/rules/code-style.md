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

## File Naming
- Page objects: PascalCase (`ExplorePage.ts`, `CartPage.ts`)
- Helpers/utils: camelCase (`otp-login.ts`, `playwright.utils.ts`)
- Fixtures: kebab-case (`page.fixtures.ts`, `base.fixture.ts`)
- Test specs: kebab-case (`explore.spec.ts`, `otp-login.spec.ts`)

## Separation
- `src/pages/` — UI interaction logic only
- `src/helpers/` — service logic (API calls, OTP, auth)
- `src/utils/` — generic reusable utilities
- `src/fixtures/` — Playwright fixture wiring
