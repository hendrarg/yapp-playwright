# Code Style

## Enforcement

Most of this file is machine-checked — do not rely on remembering it:

| Rule | Enforced by |
|------|-------------|
| Inline named imports | `@stylistic/object-curly-newline` (ESLint) |
| No deep relative imports | `no-restricted-imports` (ESLint) |
| No `@playwright/test` import in specs | `no-restricted-imports`, specs only |
| No locators in spec files | `no-restricted-syntax`, specs only |
| No dead imports / unused vars | `@typescript-eslint/no-unused-vars` |
| Fragile CSS/XPath locators | `npm run audit:locators` (advisory) |

Run `npx eslint .` (and `--fix` for the mechanical ones) before finishing. ESLint is a
blocking check in CI and in `.githooks/pre-commit`.

## Before any edit
- **Always `Read` the file first** before applying any `Edit`. Never apply edits based on memory or assumption — the user may have made manual changes since you last read the file.
- If an edit fails with "oldString not found", re-read the file to see the current state, then retry.

## Imports
- Use path aliases: `@pages/`, `@fixtures/`, `@utils/`, `@helpers/`, `@config/`
- Test specs import from `../test-base` (relative), never from `@fixtures/base.fixture` directly
- Do not use deep relative imports (`../../src/...`) where path aliases work
- **Inline named imports** — keep each `import { ... } from '...'` on **one line**. Do not wrap/brace-break named import lists across multiple lines in `tests/**/*.spec.ts` (or when adding imports elsewhere in this repo).

```typescript
// ✅ Good — inline
import { authTest as test, test as guestTest, expect } from '../test-base';
import { creatorProfile, tipAmountBoundary, tipCheckoutData } from '@test-data/buyer/profile.data';

// ❌ Forbidden — wrapped / multi-line named import
import {
  creatorProfile,
  tipAmountBoundary,
  tipCheckoutData,
} from '@test-data/buyer/profile.data';
```

## Page Objects
- Constructor: `(page: Page, baseURL: string)` — buyer pages get `baseURL`, creator pages get `creatorsBaseURL`
- `LoginPage` only takes `page: Page` (no baseURL needed)
- Locators declared as `readonly` properties in constructor
- Each page object must have `goto()` and `expectLoaded()`
- Methods named as actions (`search()`, `selectFilter()`, `submitForm()`)
- Assertion methods prefixed `expect*()` (`expectLoaded()`, `expectItemVisible()`)
- Use `safeClick`/`safeFill`/`safeCheck` from `@utils/playwright.utils` for flakiness-prone interactions
## Mandatory Reuse Gate

Before editing any Playwright test, page object, fixture, helper, mock, or test data:

1. Read the target spec, its page objects, and every existing AUT explicitly referenced by the user.
2. Search `tests/` and `src/` with `rg` for matching step intent, locator labels, page-object methods, helpers, utilities, fixtures, mocks, and test data.
3. Classify every required operation as **Reuse**, **Extend**, or **New** in the working conversation.
4. Do not edit until this inventory is complete.

Reuse an existing implementation unchanged whenever its behavior matches. If it almost fits, parameterize or minimally extend it. Add a new locator, method, helper, mock, test-data file, or page object only when the search proves no suitable implementation exists. User-referenced AUTs are mandatory implementation references.

**Exception — fragile locators:** "Reuse unchanged" does **not** apply to CSS/XPath-only locators or single-strategy selectors. Reuse the **page-object method** or **element intent**; when touching that code, classify the locator as **Extend** and wrap or replace it with `smartLocator`. Never propagate `page.locator('.class')` or raw XPath into new tests or locators.

If the same locator appears in ≥2 pages, extract it to `src/pages/shared/locators.ts` using `smartLocator`. If the same step sequence appears in ≥2 tests, extract it to a helper.

## Selector Priority

**Mandatory for all new and touched locators in page objects.** Spec files must not contain locators.

When creating or editing locators, use `smartLocator` from `@utils/heal-utils` with fallback chain. Always provide multiple selector strategies ordered by stability:

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
