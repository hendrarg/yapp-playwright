> **Obsidian:** [[projects/yapp/knowledge/index|Domain knowledge index]]

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

## Subscription fixtures: what exists and what still does not

**Corrected 2026-09-02.** An earlier note claimed no fixture account holds an active
membership subscription. That is wrong — dev carries **96 subscription rows**
(`tier_membership_users`), and token1 (`hendrarg`, user 317) holds two of them:

| Subscription | Tier | Creator | `expired_at` | State | Product perks |
|---|---|---|---|---|---|
| 95 | `satubulan` (id 82) | coba2 (416) | 26 Sep 2026 | **active** | 0 |
| 91 | `Enable Message` (id 79) | geri (161) | 21 Aug 2026 | **expired** | 0 |

So token1 can be used **today** for anything gated on holding an active subscription
versus an expired one — DM access above all, since both tiers have
`is_enable_direct_message` on. token1 cannot subscribe to its *own* tiers, but it is
already subscribed to two other creators'.

What is still missing is a fixture for **product entitlement**: both of token1's
subscriptions are to tiers with zero perks, so no subscription belonging to token1 or
token2 has a single product benefit row. Auto-renewal preference, upgrade and downgrade
also remain untestable.

**The tiers to subscribe to now exist.** Two tiers on the Sundanese account (token2)
carry an online-course perk, one per `access_mode` — see the fixture table under
[Membership Perk Hybrid](#membership-perk-hybrid-the-two-perk-axes-and-the-ui-that-now-exposes-both).
Subscribing token1 to either closes this gap; nobody is subscribed to them yet.

## The entitlement is a snapshot taken at subscribe time

`tier_membership_user_benefits` is not a view onto the tier's perks — it is a **copy**
made per subscriber, carrying its own `product_id` / `post_id`, `access_type`,
`discount_type`, `discount_amount`, and `access_mode`. It has **no expiry column of its
own**; its validity hangs on the parent `tier_membership_users.expired_at`.

Two consequences worth knowing before writing assertions:

- **Editing a tier does not rewrite existing subscribers' entitlements.** So while the
  save-reset defect was live (H-08, fixed 4 Sep 2026) it damaged only *future*
  subscribers. The same rule still matters on its own: removing a perk from a tier does
  not revoke it from people already subscribed — their snapshot keeps it until
  `expired_at` passes or they renew.
- **`permanent` benefits outlive the subscription.** 125 product benefit rows across
  **54 expired** subscriptions are still present and un-deleted, which is the structural
  meaning of `permanent`: the row is not cleaned up when `expired_at` passes.
  Caveat: rows persisting is not the same as the app still honouring them. The read path
  is unverified, and the contrast against `membership_bound` is still unmeasured at the
  entitlement layer — dev held 0 `membership_bound` rows out of 144 tier perks until
  4 Sep 2026, and the two tiers that now carry one have no subscribers yet, so no
  materialized `membership_bound` entitlement exists to read.

## The buyer can tell a lifetime perk from a subscription-bound one (since 4 Sep 2026)

`GET /api/v1/account/{accountUUID}/tier-memberships` returns `accessMode` on every perk
(a buyer's own subscriptions are at `GET /api/v1/tier-membership-users`), and the buyer
UI now **renders the distinction**.

Verified 2026-09-04 on one public profile carrying two tiers that both point at the same
online course, one perk per mode. The `Rewards` lists read:

```
Free access for "Belajar Openclaw"                <- accessMode: permanent
Access to "Belajar Openclaw" while subscribed     <- accessMode: membership_bound
```

Two different sentences, and the subscription-bound one names the condition. This
replaces the behaviour recorded on 2026-09-02, when both modes rendered the identical
`Free access for "<product>"` and nothing on the deciding surface distinguished them.

Still unverified: the wording for a **discount** perk (`accessType=discount`) under each
mode. On 2026-09-02 it read `100% discount for "<product>"` with no duration qualifier;
whether that string also gained a mode clause has not been checked.

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


## Membership Perk Hybrid: the two perk axes, and the UI that now exposes both

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

### The creator UI exposes `access_mode` on two surfaces

Superseded 2026-09-04. Until 2026-09-03 there was **no** `access_mode` control anywhere
in the creator UI: a perk rendered as a static row, the create payload was exactly
`[{"accessType":"free","productUUID":"…"}]`, and the browser could only ever produce
`free` + `permanent` (filed as M-68). That is fixed. Two surfaces now carry the axis,
and they use **the same copy but different controls** — do not reuse locators between
them:

| Surface | Route | Control shape |
|---|---|---|
| Tier side | `/membership/create`, `/membership/{uuid}/update` | `Add Tier Benefit` → `Select Products` dialog → `Add` on a card → a second dialog with two **comboboxes** and `Back` / `Add Benefit` |
| Product side | `/products/update/online-course/{uuid}`, **step 2 only** (past `Next: Edit Details`) | `Membership Benefits` block, one row per tier, `Add Benefit` **expands the row inline** — no dialog, no popover — with `Cancel` / `Confirm` |

The option copy is identical on both:

- **While subscribed** — "Members can open the course while their membership is active
  — no purchase required." → `membership_bound`
- **Permanent via purchase** — "Members buy the course through the normal checkout
  (free or discounted) and keep it permanently." → `permanent`

Three behaviours worth knowing before writing a test:

- **The default is `Permanent via purchase`, not the top option.** In the tier-side
  dialog `While subscribed` is listed *first* but `Permanent via purchase` is the one
  selected when the dialog opens.
- **Choosing `While subscribed` removes the Access Type control entirely** on both
  surfaces — `Free Access` / `Discounted Price` (tier side) and `Free Access` /
  `Discount` (product side) disappear rather than being disabled, and the confirm
  button becomes available. That is the UI enforcing
  `discount is not allowed when accessMode=membership_bound` by construction.
- **A non-`online_course` product is never offered the axis.** Its config dialog holds
  `Access Type` only — no Access Mode field at all, not a one-option or disabled
  dropdown. So the server's `only allowed for online_course` message is no longer
  reachable from the browser.

`Access Type` itself reads `Free Access` / `Discounted Price` on the tier side and
`Free Access` ("Members get this content for free") / `Discount` ("Members gets a % of
the price") on the product side. That last string is narrower than the feature — flat
discounts exist in the data (`discount_type='flat'`).

The tier-side benefit **row label now names the mode** (`Online Course / <product> /
While subscribed`), where it used to read `Free access` for every perk. The
**product-side** row shows an Access Type pill (`Free Access`) and **never the mode**.

### The product-side surface writes perks the creator did not ask for

Verified end to end 2026-09-04 with the account owner's consent; filed as
`TC-MEM-C-061` and `TC-MEM-C-062`. Two defects, one cause.

A perk removed from a tier at `/membership` **stays rendered as configured** on
`/products/update/online-course/{uuid}` step 2 — the tier row keeps its gradient card
and `Free Access` pill while `GET /api/v1/tier-memberships/{uuid}` reports no perk for
that product at all. It is not a browser cache: the removal stamped the tier at
`12:08:26Z`, and two fresh browser contexts at `12:2x` and `12:36` both still showed the
pill.

Then **pressing `Save` without touching anything re-creates it** — and writes it **five
times**. One save turned a tier holding a single `digital_download` perk into a tier
holding six: the original plus five identical `online_course` / `permanent` / `free`
rows for the product being edited. Five is exactly the number of tier rows showing
`Add Benefit`, so the payload most likely emits one benefit entry per tier row and the
server writes them all against one tier — unconfirmed until someone reads the full
`PUT /api/v1/shop/products/{uuid}` body.

Two consequences for testing:

- **The duplicate guard is path-specific.** `POST/PUT /api/v1/tier-memberships` rejects
  `duplicate productUUID <uuid> (first at index 0)`, but the product path wrote five
  duplicates without complaint. Never assume a server-side rule proven on one endpoint
  holds on another.
- **`tier_memberships.updatedAt` does not move when perks change through this path.** It
  stayed `2026-09-04T12:08:26.542088Z` across a write that added five perk rows, so
  `updatedAt` is useless as a change signal for perks — diff the perk list itself.

Practical warning while this is open: **do not open a product's edit page and save it**
while a tier fixture matters, and re-read the tier's perks after any product save.

**What the UI sends.** The create payload for a `While subscribed` perk is
`[{"accessMode":"membership_bound","productUUID":"…"}]` — `accessMode` present,
`accessType` **omitted**, and the server fills `access_type='free'` from the column
default. So a read-back reports `accessMode=membership_bound, accessType=free`.

**Fixture state:** dev held **zero** `membership_bound` rows before 4 Sep 2026. Two
tiers now exist on the **Sundanese** account (token2, `@sundanese`), both priced
Rp25.000 / 1 month, both pointing at its online course `Belajar Openclaw`
(`ababebb3-3743-43c9-bc41-11e2acd190f6`):

| Tier | uuid | Perk |
|---|---|---|
| `MB Dropdown Check 107394` | `53c105e8-ba02-47dc-a2d7-2c46878a26cc` | `membership_bound` + free — built through the UI, so its hero image round-trips and it is editable from the form |
| `MB Permanent Contrast` | `3533fd40-8fad-4a90-93cd-794a0213e8ab` | `permanent` + free — API-seeded with an empty `thumbnailURL`, so the edit form will refuse to save it (see the seeding trap below) |

token1 is not subscribed to either, so **these are the fixtures to subscribe token1 to**
for the product-entitlement gap described above. `access_type='free'` is still stored two
ways — `discount_type` NULL and `discount_type=''` — so match on `access_type`, never on
`discount_type IS NULL`. Neither column has a CHECK constraint; the whole enum lives in
application code.

## Saving a tier from the UI used to reset `membership_bound` — fixed 4 Sep 2026

Recorded 2026-09-02 as H-08: a perk stored as `membership_bound` showed on the edit page
as `Free access`, indistinguishable from a permanent free perk, and pressing
`Save Changes` without touching the benefit sent
`[{"accessType":"free","productUUID":"…"}]` with `accessMode` omitted, so the server
fell back to the column default and the perk came back `permanent`. Any unrelated edit
(rename, price change) silently converted subscription-bound course access into
permanent access.

**Retested end to end 2026-09-04: fixed.** The edit page renders the row as
`Online Course / <product> / While subscribed`, the PUT that `Save Changes` fires carries
`[{"accessMode":"membership_bound","productUUID":"…"}]`, and the read-back after saving
still reports `accessMode=membership_bound`. `access_mode` is safe to seed and safe to
leave on a tier the creator may edit.

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
