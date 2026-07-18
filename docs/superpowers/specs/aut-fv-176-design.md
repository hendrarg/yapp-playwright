# AUT-FV-176 Automation Design

## Goal

Automate Buyer Explore discovery as one Playwright journey with eight descriptive steps and UI-only validation.

## Scope

The journey validates:

- Creators For You, Popular Products, and Recommended For You visibility.
- Static development data and order for Popular Products and Creators For You.
- Product-card thumbnail, name, creator, and price or Free label.
- Recommended order matches the beginning of the full `/explore/products` list, which reflects the newest or most recently updated products.
- Only product links exposed by the public `/explore/products` UI appear in the Explore product sections.
- One product from Popular and one from Recommended can be opened.
- Creator `See More` opens `/explore/creators`, shows the full list, and supports search.
- Product `See More` opens `/explore/products`, shows paid and Free products, and supports search.

The journey does not call or parse an API and does not independently recalculate backend ranking rules.

## Design

### Test data

Keep only stable development expectations in `src/test-data/buyer/explore.data.ts`:

- Popular Products: `Crypto Product`, `Test Discounted Product`.
- Creators For You: `Jason`, `HOHO`, `mutiajaveline`, `iyansr32`.
- Search targets: `Jason` and `Qase Management Testcase`.

### Page object

`ExplorePage` contains only page locators and UI actions/assertions. It will not contain API response types, listeners, or parsers.

Use section-scoped product and creator links. Dynamic cards are identified by captured `href`, not by positional `.first()` locators.

### Test structure

Keep one `authTest` in `tests/buyer/explore.spec.ts` tagged:

```text
@AUT-FV-176 @explore @buyer @regression
```

The test follows the mapped eight steps:

1. Open Explore as Buyer.
2. Validate Popular and Recommended section visibility.
3. Validate product-card metadata.
4. Validate system-defined popularity order using the stable development list.
5. Validate displayed products exist in the public full-product list and Recommended preserves its leading order.
6. Open one product from Popular and one from Recommended.
7. Open Popular Creator `See More`, validate `/explore/creators`, the full creator list, and creator search.
8. Open Popular Products `See More`, validate `/explore/products`, paid and Free products, and product search.

## Failure behavior

A failing `test.step()` stops the journey and identifies the exact validation that needs clarification. Static development data is isolated in one data file so intentional content changes require only one small update.

## Verification

```powershell
npx tsc --noEmit
npx playwright test tests/buyer/explore.spec.ts --project=chromium --grep @AUT-FV-176
```
