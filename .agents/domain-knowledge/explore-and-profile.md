# Explore, profile, and landing

Buyer discovery surfaces and the creator's public profile.

## Explore is fed by two different endpoints

- **Recommended** comes from `GET /products/explore`.
- **Popular Products** comes from `GET /products/featured` — and that is a **manual
  curation** ordered by `featuredProductPosition` (1…7, `null` sorting last), **not a
  popularity ranking**.

Never write a popularity assertion against the Popular Products section; assert the
curated order instead.

## Dead and misleading fields on the account payload

- `GET /accounts` returns **`interests: null` permanently**. The real data is at
  `GET /accounts/interests`.
- The correct profile asset fields are `photoProfileUrl` and `backgroundUrl`.

## Both test accounts are already creators

token1 (`hendrarg`) and token2 (`anthony_mosciski`) are both `isCreator: true`, so the
`Be A Creator` CTA always routes to the creator dashboard and the onboarding flow never
opens. Any test case covering buyer-to-creator onboarding needs a clean buyer account.

## Landing page CTAs are anchor + button pairs

Every landing CTA renders an `<a href>` wrapping a `<button>` that has no `href` of its
own — an environment assertion must target the **anchor**. The footer quick links are
the opposite: all four are `<button>` elements with **no** `href`, so their destination
can only be verified by clicking and observing the scroll position.

## Profile tab order is server state

The profile tab strip is reordered through `PUT /accounts/profile-tabs`; the default
body is `{"tabs":["product","link","feed","membership"]}`. Product cards on My Page are
reordered separately through `PATCH /shop/products/reorder`, and toggling a product's
Hide from Profile flag resets it to the front of that arrangement.
