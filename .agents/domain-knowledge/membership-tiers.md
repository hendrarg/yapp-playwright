> **Obsidian:** [[projects/yapp/domain-knowledge/index|Domain knowledge index]]

# Membership tiers — the creator's own subscription programme

The tiers a creator sells at `/membership`, their per-duration prices, and the perks
they unlock. **This is not a product**, and it is not the same feature as a Discord or
Telegram membership — see [[membership-products]] for those.

## A tier membership is not a product

Three separate things share the word "membership". Confusing them sends a test to the
wrong table, the wrong route, and the wrong sheet. Confirmed against the dev schema
2026-09-02:

| Thing | Where it lives | Route / API | Test sheet |
|-------|----------------|-------------|------------|
| **Tier membership** (this note) | its own `tier_memberships` table — **absent from `products`** — with `tier_membership_prices`, `tier_membership_product_and_benefit`, `tier_membership_users`, `tier_membership_purchases`, `promo_code_tier_memberships` | `/membership/*`, `GET/POST/PUT/DELETE /api/v1/tier-memberships` | `Membership` |
| **Discord Membership product** | `products` with `product_type='discord_membership'` (28 live) | the normal product routes, `shop/products` | `Discord Membership` |
| **Telegram Membership product** | `products` with `product_type='telegram_membership'` (8 live), plus its own `product_telegram_tiers` (21 rows) | product routes plus `/telegram` | `Telegram Membership` |

`product_type` has exactly seven values and **none of them is a tier membership**:
`digital_product`, `digital_download`, `ticket_event`, `appointment`,
`discord_membership`, `online_course`, `telegram_membership`.

The one place the two worlds touch: a tier's perk row
(`tier_membership_product_and_benefit`) carries a foreign key **into `products`**, so a
tier membership can grant access to a product. That is a reference, not a kinship — the
tier itself is never a product.

Note the vocabulary trap: `product_telegram_tiers` are tiers **of a Telegram product**,
so a sentence about "tiers" can mean either feature. This note only ever means
`tier_memberships`.

## No fixture account holds an active membership subscription

Checked 2026-08-31: token1 (`hendrarg` / QA Tester) is the creator of the membership
tiers, so it cannot subscribe to itself, and token2 (Sundanese) still shows
`Subscribe` on that profile. The buyer Library lists Discord and Telegram *membership
products* ([[membership-products]]), which are a different thing from a creator
membership subscription.

The practical consequence: **anything that needs a live subscription cannot be tested
today** — auto-renewal preference, renewal failure, tier upgrade or downgrade,
post-expiry access. There is also no auto-renewal control visible anywhere on the
buyer surfaces that do exist, but that is an absence observed without a subscription
in hand, not a confirmed product decision.

Seed a real subscription first, or expect these to stay blocked.


## Tier price fields are gated by the period checkbox

On `/membership/create` the four per-period price fields (1, 3, 6, 12 months, IDR)
start **disabled**. A field only becomes editable after its own period checkbox is
ticked, so any test that types a tier price must tick the period first or it will
silently write nothing.

Once enabled, the field behaves plainly: `Ctrl+A` then `Backspace` leaves it **empty**
(not a residual `0`), and a typed value is kept exactly, rendered with thousand
separators — `20000` shows as `20,000`, `5000` as `5,000`, `123` as `123`. There is no
10× inflation. Verified 2026-09-02; an earlier report of a stuck `0` and 10× inflation
no longer reproduces.


## Membership Perk Hybrid: `accessMode` exists in the API but not in the UI

A tier perk lives in `tier_membership_product_and_benefit` and is **either** a product
or a post (`productUUID` XOR `postUUID` — the API says so in as many words). It carries
two independent axes, both established live 2026-09-02 against
`POST/PUT /api/v1/tier-memberships`:

| Column | Default | Allowed |
|--------|---------|---------|
| `access_type` | `free` | `free`, `discount` (+ `discount_type` `percentage`/`flat`, `discount_amount`) |
| `access_mode` | `permanent` | `permanent`, `membership_bound` |

`membership_bound` is the "only while subscribed" perk. Its rules are enforced
server-side and the messages are precise:

- `discount is not allowed when accessMode=membership_bound`
- `membership_bound is only allowed for online_course products` (a post trips this)
- `membership_bound accessMode is only allowed for online_course, got digital_download`
  (also `appointment` — note the **different wording** for the product-type case)
- `duplicate productUUID <uuid> (first at index 0)` — and the same for `postUUID`.
  A duplicate is rejected even when the two entries carry different `accessMode`s
- `accessMode must be permanent or membership_bound`
- `accessType must be free or discount when accessMode=permanent`

**All of these come back as HTTP 500, not 400** — same 500-for-validation habit as the
promo estimation endpoint. Only the top-level required-field check
(`Name`/`Description`/`IsActive`/`Prices`/`TierMembershipProductAndBenefits`) answers
400, with an `error` array. `TierMembershipProductAndBenefits` must be *present* but
**may be an empty array** — a tier with no perks is accepted.

**There is no `access_mode` control anywhere in the creator UI.** `/membership/create`
and `/membership/{uuid}/update` render a perk as a static row with no dropdown, and the
UI's create payload is exactly `[{"accessType":"free","productUUID":"…"}]`. So the
browser can only ever produce `free` + `permanent`; `discount` perks (33 rows on dev)
and every `membership_bound` perk must be seeded through the API.

The row label does reflect **`access_type`** — a free perk reads `Free access`, a
percentage perk reads `100% Discounted Price` — but **nothing on the row reflects
`access_mode`**, so a `membership_bound` perk is shown as plain `Free access`,
indistinguishable from a permanent one. The buyer side spells the same axis out under
`Rewards`: `Free access for "<product>"`, `100% discount for "<product>"`, plus
`Direct Message Access` when the tier enables DM — and it, too, says nothing about
permanent vs subscription-bound.

**Fixture state:** dev had **zero** `membership_bound` rows before this session, and is
back to zero. All 144 live perk rows are `permanent`. `access_type='free'` is stored
two ways — `discount_type` NULL (82 rows) and `discount_type=''` (29 rows) — so match
on `access_type`, never on `discount_type IS NULL`. Neither column has a CHECK
constraint; the whole enum lives in application code.


## Saving a tier from the UI silently resets `membership_bound` to `permanent`

The consequence of the gap above, verified end to end 2026-09-02. A perk stored as
`membership_bound` shows on the edit page as `Free access` — **indistinguishable from a
permanent free perk** — and pressing `Save Changes` without touching the benefit sends
`[{"accessType":"free","productUUID":"…"}]` with `accessMode` omitted. The server falls
back to the column default and the perk comes back `permanent`.

So any unrelated edit of the tier (rename, price change) converts subscription-bound
course access into permanent lifetime access, with no warning and nothing on screen to
reveal it. Treat `access_mode` as unsafe to seed until the UI round-trips it.


## Tier price display uses the lowest-duration price, not a monthly rate

`tier_membership_prices` holds one row per `duration_month`, and
`tier_memberships.monthly_price_idr` is NULL on every tier on dev. The creator detail
page at `/membership/{uuid}` renders the lowest-duration price with its own duration —
a tier priced only at 3 months for Rp150.000 reads **`Rp150.000,00/ 3 month`**, and a
3/6/12-month tier reads `Rp50.000,00/ 3 month`. It does **not** fall back to
`Rp0/month`. Verified 2026-09-02.

Do not mistake the `Per month` figure beside it for the price: `Per month` and
`All-Time` sit under the **Analytics** heading and are revenue. A brand-new tier shows
`Per month Rp0,00` **and** `All-Time Rp0,00`, which is what proves they are earnings.


## The tier form and the API disagree on required fields

Client-side validation on the tier form enforces `Price must be at least IDR 20,000`
and `Thumbnail URL is required`. The API enforces **neither** — `POST
/api/v1/tier-memberships` accepted `priceIDR: 10000`, and its required-field list is
only `Name`, `Description`, `IsActive`, `Prices`,
`TierMembershipProductAndBenefits`, with `thumbnailURL` absent. So an API-seeded tier
can hold values the UI would refuse.

**Seeding trap, not a defect:** a tier seeded through the API with a bare relative
`thumbnailURL` (e.g. `84ae3e39-…/files/….png`) opens in the edit form with
`Thumbnail URL is required` and `Save Changes` fires no request at all. On tiers the
creator actually built in the UI the hero image hydrates fine — image rendered, no
warning, Save enabled — verified on two real tiers 2026-09-02. So if a seeded fixture
cannot be saved from the browser, suspect the seeded thumbnail format first; do not
report it as a hydration bug.

**Upload trap:** `/membership/create` has **two** `input[type=file]`. Index 0 is the
markdown editor's hidden image input (`accept="image/*"`, `class="hidden"`); the hero
dropzone is **index 1** (`accept="image/jpeg,.jpeg,…"`). `setInputFiles` on `.first()`
uploads into the description editor and leaves Hero Image empty — the form then fails
with `Thumbnail URL is required` and never fires a request. The hero upload itself goes
`POST /api/v1/file/upload/create` -> PUT to the asset host -> `POST
/api/v1/file/upload/complete`.
