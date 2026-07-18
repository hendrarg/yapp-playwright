# AUT-FV-177 Automation Design

## Goal

Automate the current Buyer recommendation behavior: `Recommended For You` follows the ordering of the newest or most recently updated publicly discoverable products.

## Scope

One UI-only Playwright journey validates:

- `Recommended For You` is visible and populated for an authenticated Buyer.
- Recommendation cards show product name, image, creator, and price or Free.
- Recommended product links and order match the leading products in `/explore/products`.
- Every recommended product exists in the public product list.
- Selecting a recommendation opens its product detail page.

Interest, followed-creator, activity, purchase, browsing, and low-signal fallback personalization are outside the current development behavior and are not asserted.

## Sheet alignment

Keep and rewrite the source coverage as follows:

- `TC-EXP-B-021`: display a populated Recommended For You section.
- `TC-EXP-B-022`: place newly published public products at the beginning of recommendations.
- `TC-EXP-B-023`: move recently updated public products to the beginning of recommendations.
- `TC-EXP-B-027`: display recommendation product metadata.
- `TC-EXP-B-028`: open product detail from a recommendation.
- `TC-EXP-B-029`: exclude products absent from the public product list.
- `TC-EXP-B-034`: keep the section populated when public products exist.

Remove `TC-EXP-B-024`, `TC-EXP-B-025`, `TC-EXP-B-026`, and `TC-EXP-B-030` through `TC-EXP-B-033` from `AUT-FV-177` coverage. Mark their notes as obsolete because the current feature is recency-based rather than signal- or fallback-based.

Update the Automation Mapping flow to the UI journey below and mark it `Automated` only after the isolated test passes.

## Test design

Add one `authTest` to `tests/buyer/explore.spec.ts` tagged:

```text
@AUT-FV-177 @explore @buyer @regression
```

Use five descriptive steps:

1. Open Explore and validate the populated recommendation section.
2. Validate recommendation card metadata.
3. Capture the visible recommended product links and order.
4. Open `/explore/products` and confirm the captured recommendations match its leading public products in the same order.
5. Return to Explore and open the first recommended product.

Reuse the existing `ExplorePage`, product-card parser, public-product page, and navigation methods. Add only the smallest page-object assertion or action needed to separate recency-order validation from `AUT-FV-176`. Do not add an API baseline, additional account fixture, hardcoded recommendation titles, or a new helper layer.

## Ownership

`AUT-FV-176` keeps general product discovery, static Popular Products ordering, public-list membership, product search, and section navigation. It no longer owns the assertion that Recommended products preserve the leading `/explore/products` order; that rule belongs to `AUT-FV-177`.

## Failure behavior

Comparison failures report the expected public-list order and actual recommendation order. An empty recommendation or public list fails instead of being skipped.

## Verification

```powershell
npm run automation:context -- AUT-FV-177
npx tsc --noEmit
npx playwright test tests/buyer/explore.spec.ts --project=chromium --grep @AUT-FV-177
```
