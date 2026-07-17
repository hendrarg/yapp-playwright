# AUT-FV-176 Automation Design

## Goal

Automate the Buyer Explore flow for Popular and Recommended product discovery as one Playwright test with descriptive `test.step()` reporting.

The test covers the active Automation Mapping row for `AUT-FV-176` and its nine source cases from the `Explore Page` sheet.

## Scope

The automation will validate:

- Popular Products and Recommended For You section visibility.
- Popular card thumbnail, product name, creator picture, creator name, and price or Free label against the Explore API response used by the page.
- Recommended card thumbnail, product name, creator name, and price or Free label against the Explore API response used by the page.
- Popular product order against the API response order.
- UI eligibility at the discovery boundary: only product IDs returned by the discovery API may appear in each section.
- Navigation from one Popular card and one Recommended card to the matching product detail URL.
- Popular Products `See More` navigation to `/explore/products`.
- The full products view contains additional eligible products and preserves the API-defined order.

The test will not independently validate the backend popularity algorithm. Backend ranking calculation belongs in API-level tests; this UI test verifies that the frontend preserves the system-provided order.

## Design

### Test structure

Add one test to `tests/buyer/explore.spec.ts` using `authTest` and the existing `explorePage` fixture.

The test will have these steps:

1. Register response listeners and open Explore.
2. Validate Popular and Recommended section visibility.
3. Validate Popular card metadata, eligibility, and order.
4. Open a Popular product and validate its detail URL, then return to Explore.
5. Validate Recommended card metadata and eligibility.
6. Open a Recommended product and validate its detail URL, then return to Explore.
7. Select Popular Products `See More` and validate the full products view, additional products, and order.

The test will use these tags:

```text
@AUT-FV-176 @explore @buyer @regression
```

### Data source

The real Explore API responses captured during the run are the dynamic baseline. Tests will not hardcode product names, IDs, prices, or order from the mutable development environment.

The captured data must expose enough information to identify products, expected metadata, and ordering. Missing or malformed response data will fail with a clear contract error instead of weakening assertions.

### Page object

Extend `src/pages/buyer/ExplorePage.ts` with page-specific locators and methods for:

- section visibility;
- scoped product cards;
- exact metadata comparison;
- product-detail navigation;
- Popular Products `See More` navigation;
- returning to Explore between navigation checks.

Locators will be scoped by section and stable product ID or `href`. Positional `.first()` selection will not be used. Existing Playwright utilities will be reused for interactions.

### Failure behavior

One test is intentional to match the repository's journey-style automation. A failed step stops later steps, while Playwright reporting identifies the failing validation by step name.

The test will fail clearly when:

- either required section is absent;
- the API returns no usable products for a required section;
- displayed metadata or order differs from the response;
- an unexpected product appears in a section;
- product detail or `See More` navigation targets the wrong URL;
- the full products view has no additional eligible products.

## Verification

Run only the mapped automation during development:

```powershell
npx tsc --noEmit
npx playwright test tests/buyer/explore.spec.ts --project=chromium --grep @AUT-FV-176
```

Completion requires both commands to pass.
