# AUT-FV-176 Implementation Plan

**Goal:** Replace the API-based draft with one minimal UI-only Buyer Explore journey.

**Architecture:** Put stable development expectations in one test-data file, keep `ExplorePage` limited to UI locators/actions/assertions, and keep the mapped flow as one eight-step test.

## Constraints

- No API listener, response type, parser, product seeding, or intermediate Markdown.
- No positional `.first()` selection for dynamic cards.
- Reuse the existing `authTest`, `explorePage` fixture, and Playwright utilities.
- Preserve the existing `@AUT-FV-175` test.

## Task 1: Write the UI-only journey first

**Files:**

- Modify `tests/buyer/explore.spec.ts`.

1. Replace only the draft `@AUT-FV-176` journey with the approved eight UI steps.
2. Reference the desired minimal `ExplorePage` methods and static Explore data.
3. Run `npx tsc --noEmit` and confirm it fails because the new page-object interface does not exist.

## Task 2: Add the minimum implementation

**Files:**

- Create `src/test-data/buyer/explore.data.ts`.
- Replace the API-heavy additions in `src/pages/buyer/ExplorePage.ts` with UI-only support.

1. Add only the stable Popular, creator, and search expectations.
2. Add scoped locators and small methods for section checks, metadata, captured product links, navigation, list validation, and search.
3. Compare Recommended links with the leading links on `/explore/products`.
4. Validate at least one paid and one Free product on the full-product page.
5. Run `npx tsc --noEmit` until it passes without weakening the approved assertions.

## Task 3: Verify and review

1. Run `npx playwright test tests/buyer/explore.spec.ts --project=chromium --grep @AUT-FV-176`.
2. If it fails, use systematic debugging and correct the inaccurate locator or assumption without adding API code.
3. Run `git diff --check`, review only the planned files, and commit the verified change.
