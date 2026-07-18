# AUT-FV-176 Automation Design

## Goal

Automate Buyer product discovery as one Playwright journey with seven descriptive steps and UI-only validation.

## Scope

The journey validates:

- Popular Products and Recommended For You visibility.
- Static development data and order for Popular Products.
- Product-card thumbnail, name, creator, and price or Free label.
- Recommended order matches the beginning of the full `/explore/products` list, which reflects the newest or most recently updated products.
- Only product links exposed by the public `/explore/products` UI appear in the Explore product sections.
- One product from Popular and one from Recommended can be opened.
- Product `See More` opens `/explore/products`, shows paid and Free products, and supports search.

The journey does not call or parse an API and does not independently recalculate backend ranking rules.

## Design

### Test data

Keep only stable development expectations in `src/test-data/buyer/explore.data.ts`:

- Popular Products: `Crypto Product`, `Test Discounted Product`.
- Product search target: `Qase Management Testcase`.

### Page object

`ExplorePage` contains only page locators and UI actions/assertions. It will not contain API response types, listeners, or parsers.

Use section-scoped product links. Dynamic cards are identified by captured `href`, not by positional `.first()` locators.

### Test structure

Keep one `authTest` in `tests/buyer/explore.spec.ts` tagged:

```text
@AUT-FV-176 @explore @buyer @regression
```

The test follows the mapped seven steps:

1. Open Explore as Buyer.
2. Validate Popular and Recommended section visibility.
3. Validate product-card metadata.
4. Validate system-defined Popular Products order using the stable development list.
5. Validate displayed products exist in the public full-product list and Recommended preserves its leading order.
6. Open one product from Popular and one from Recommended.
7. Open Popular Products `See More`, validate `/explore/products`, paid and Free products, and product search.

Creator search, Creators For You metadata/navigation, and `/explore/creators` belong only to `AUT-FV-175`.

## Failure behavior

A failing `test.step()` stops the journey and identifies the exact validation that needs clarification. Static development data is isolated in one data file so intentional content changes require only one small update.

## Verification

```powershell
npx tsc --noEmit
npx playwright test tests/buyer/explore.spec.ts --project=chromium --grep @AUT-FV-176
```
