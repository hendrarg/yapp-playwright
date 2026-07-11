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
   - Constructor takes `page: Page` and `baseURL: string`
   - `goto()` — navigate to the route
   - `expectLoaded()` — assert URL matches and no `/auth` redirect

4. Update `src/fixtures/page.fixtures.ts`:
   - Add import at the top
   - Add type to `PageFixtures` type
   - Add fixture factory using the correct baseURL constant

5. Run `npx tsc --noEmit` to verify.

## Example

For a new buyer page `rewards`:
- Create `src/pages/buyer/RewardsPage.ts`
- Fixture key: `rewardsPage`
- Route: `/rewards`
