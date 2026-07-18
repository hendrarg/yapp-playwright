# AUT-FV-175 Automation Design

## Goal

Automate Buyer creator search and discovery as one traceable Playwright journey, with creator behavior owned only by `AUT-FV-175`.

## Scope

The journey validates:

- Explore opens for an authenticated Buyer and displays the main Search input.
- A display-name query returns all matching creators.
- Replacing the query with a username updates the creator results.
- A unique no-match query displays the creator empty state.
- Creators For You displays creator name, username, and an avatar image or initial fallback.
- Creator category is validated only when the UI renders a category for that creator.
- A creator profile can be opened from search results and Creators For You.
- Creators For You `See More` opens `/explore/creators` with additional creator cards.

Product discovery, product metadata, product ordering, and `/explore/products` belong only to `AUT-FV-176`.

## Test data

Keep stable development expectations in `src/test-data/buyer/explore.data.ts`:

- display-name query: `Jason`;
- username query: `yoms07`;
- selected creator: `Jason` at `/yoms07`;
- no-match query: `no-creator-aut-fv-175`;
- Creators For You: `Jason`, `HOHO`, `mutiajaveline`, and `iyansr32`.

## Test structure

Replace the placeholder authentication test in `tests/buyer/explore.spec.ts` with one `authTest` tagged:

```text
@AUT-FV-175 @explore @buyer @smoke @regression
```

Use seven descriptive steps:

1. Open Explore and validate the Search input.
2. Search by display name and validate multiple matching creators.
3. Replace the query with a username and validate the updated exact result.
4. Search a unique no-match query and validate the creator empty state.
5. Clear search and validate Creators For You metadata using conditional category rules.
6. Open the known creator from search results and Creators For You.
7. Select Creators For You `See More` and validate `/explore/creators` plus additional creator cards.

Remove the unrelated `@AUT-FV-175` tags from Buyer feeds tests so an isolated grep runs only this mapping.

## Page object

Extend the existing `ExplorePage` with only the main-search and creator-card locators/actions required by the journey. Reuse its existing Explore navigation, authentication, Creators For You section, and `openAllCreators()` support. Do not add API calls or a new helper layer.

## Sheet ownership

After both Explore mappings pass:

- mark `AUT-FV-175` as `Automated`;
- remove the creator `See More` step and creator wording from `AUT-FV-176` because `TC-EXP-B-041` belongs to `AUT-FV-175`;
- keep `AUT-FV-176` status `Automated` after its reduced product-only journey passes.

## Verification

```powershell
npx tsc --noEmit
npx playwright test tests/buyer/explore.spec.ts --project=chromium --grep @AUT-FV-175
npx playwright test tests/buyer/explore.spec.ts --project=chromium --grep @AUT-FV-176
```
