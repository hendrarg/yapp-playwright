---
name: add-page-object
description: Scaffold a new page object file and register it in the fixture system
---

## When to use
Use when asked to create a new page object for a buyer or creator page.

## Steps

1. Determine the domain: **buyer** (`baseURL`) or **creator** (`creatorsBaseURL`). Ask the user if not specified.

2. Determine the route name (e.g. `explore`, `cart`, `settings`, `consultation/sessions`). Extract from the page name or ask.

3. Generate `src/pages/{domain}/{pascalName}.ts`:
   - Import `type { Page }` and `expect` from `@playwright/test`
   - Import `smartLocator` from `@utils/heal-utils`
   - Constructor takes `page: Page` and `baseURL: string`
   - `goto()` — navigate to the route
   - `expectLoaded()` — assert URL matches and no `/auth` redirect
   - **Every locator MUST use `smartLocator(this.page, { ... })` with at least two strategies** (see `.agents/rules/code-style.md`). Never scaffold with bare `page.locator('.class')` or a single `getByRole`/`getByText` without fallback.

4. Update `src/fixtures/page.fixtures.ts`:
   - Add import at the top
   - Add type to `PageFixtures` type
   - Add fixture factory using the correct baseURL constant

5. Run `npx tsc --noEmit` to verify.

6. **Register the route in domain navigation** (required for buyer/creator pages):
   - **Buyer**: update `src/helpers/buyer/nav.ts` (`BuyerRoute`, `goto`, `expectLoaded`, params if needed) and `src/fixtures/buyer-nav.fixture.ts` (`BuyerNavDeps` + destructure). Append route to buyer list in `.agents/rules/testing.md`.
   - **Creator**: update `src/helpers/creator/nav.ts` (`CreatorRoute`, `goto`, `expectLoaded`) and `src/fixtures/creator-nav.fixture.ts` (`CreatorNavDeps` + destructure). Append route to creator list in `.agents/rules/testing.md`.
   - Run `npx playwright test --list` after fixture changes — broken destructuring hides tests from the Playwright panel.

   Specs should navigate with `buyerNav.open('rewards')` or `creatorNav.open('rewards')`, not raw `rewardsPage.goto()` unless testing the page object itself.

   Quick reference: `.agents/commands/add-nav-route.md`

## Locator scaffold

```typescript
import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { smartLocator } from "@utils/heal-utils";

export class RewardsPage {
  constructor(public readonly page: Page, private readonly baseURL: string) {}

  readonly pageHeading = smartLocator(this.page, {
    role: "heading",
    name: "Rewards",
    text: "Rewards",
  });

  async goto() {
    await this.page.goto(new URL("rewards", this.baseURL).toString());
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/rewards/);
    expect(this.page.url()).not.toContain("/auth");
  }
}
```

## Example

For a new buyer page `rewards`:
- Create `src/pages/buyer/RewardsPage.ts`
- Fixture key: `rewardsPage`
- Route: `/rewards`
- Nav route key: `rewards` in `src/helpers/buyer/nav.ts`

For a new creator page `rewards`:
- Create `src/pages/creator/RewardsPage.ts`
- Fixture key: `rewardsPage` (or distinct name if buyer already has one)
- Route: `/rewards`
- Nav route key: `rewards` in `src/helpers/creator/nav.ts`
