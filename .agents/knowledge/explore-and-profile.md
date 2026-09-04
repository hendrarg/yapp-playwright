> [[projects/yapp/knowledge/index|Domain knowledge index]]

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
`Be A Creator` CTA always routes to the creator dashboard and the buyer-to-creator
onboarding flow never opens on either of them.

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

## Customize: what the profile form actually enforces

The creator edits the profile at `/customize` (four section tabs: Theme, Profile, Tip
Button, Domain), **not** at `/profile` — that route is My Page. Verified 2026-08-31.

**Only Bio has a length limit.** `#design-profile-bio` carries `maxlength=200` and
shows an `n/200` counter. `#design-profile-name` (Your Name) and
`#design-profile-username` (Link) have **no `maxlength` and no counter at all** — the
same shape as the Event title defect.

**Required-ness is asymmetric and invisible.** Clearing Your Name leaves `Save`
disabled forever with no error message, so the field is effectively required but never
says so. Clearing Link *enables* `Save`. Nothing in the UI explains the difference.

**Invalid colours are swallowed.** The three custom colour fields
(`#theme-backgroundColor`, `#theme-primaryColor`, `#theme-secondaryColor`) are plain
text inputs. A valid hex enables `Save`; `zzzzzz`, `#GGGGGG`, `#12` and `red` are all
kept verbatim in the field with **no error message**, and `Save` simply stays
disabled. The disabled button is the only feedback that a value was rejected.

**The palette is 5 + 3, not "about ten".** Theme presets are exactly Default, Sunset,
Ocean, Forest and Midnight, plus a non-selectable `Custom` entry; the Custom section
holds exactly three colour controls. There is no ten-colour swatch palette anywhere.

**Preview has two device modes.** The `Preview` dialog holds exactly two toggle
buttons plus Close: the default renders the iframe at **1222px**, the second at
**388px**. Neither toggle has an accessible name — they are icon-only.

**Image upload guidance** (Header Background → Upload tab): `accept="image/*"`, single
file, and the copy states *wider than 1080px*, *maximum file size 20MB*, *recommended
aspect ratio 1:1*.

## Explore search fans out to three endpoints

Verified 2026-09-01. One keystroke burst fires **three parallel requests**, and the
parameter name is not consistent between them:

| Endpoint | Parameter |
|----------|-----------|
| `campaign/explore` | `q` |
| `creators/explore` | **`keyword`** |
| `products/explore` | `q` |

The input is debounced — six keystrokes produced a single wave of requests, not six —
and the query **is** reflected in the page URL as `?keyword=`. That is the opposite of
the creator Products list, whose search never touches the URL (`TC-PROD-C-061`).

Matching is **case-insensitive** and **partial**: `hendrarg`, `HENDRARG`, `HeNdRaRg`
and `hend` all return the creator. Appending a special character (`hendrarg!`) returns
zero, so there is no character normalisation.

**Assert on the API response, not the page text.** The QA account is itself a creator,
so its own name sits in the page header and any `innerText` check for it is a false
positive. Count the `creators/explore` payload instead.

**Still unknown:** leading/trailing whitespace. Keystrokes were dropped mid-typing in
testing, so the keyword actually sent was not the one intended and the result is not
evidence either way. Worth settling, because the creator product search and promo code
redemption both *reject* padded input.
