---
title: Membership tiers — the creator's own subscription programme
type: note
category: project
tags: [yapp, product, automation, membership-tiers]
project: yapp
created: 2026-09-04
updated: 2026-09-16
sources: 0
status: active
---

> **Obsidian:** [[projects/yapp/knowledge/index|Knowledge index]]

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
  save-reset defect was live (H-09; fixed 4 Sep 2026) it damaged only *future*
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
`free` + `permanent` (filed as M-36). That is fixed. Two surfaces now carry the axis,
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

**Updated 2026-09-09:** one materialized `membership_bound` entitlement now exists —
`tier_membership_user_benefits` id 301 on the tier `Live Time and Bound Online Course`
(hendrarg), held by `faqih49+testcoursemem@gmail.com` and valid to 4 Oct 2026. Nobody in
this project holds that session, so it can be read in the database but not exercised in a
browser.

token1 is not subscribed to either, so **these are the fixtures to subscribe token1 to**
for the product-entitlement gap described above. `access_type='free'` is still stored two
ways — `discount_type` NULL and `discount_type=''` — so match on `access_type`, never on
`discount_type IS NULL`. Neither column has a CHECK constraint; the whole enum lives in
application code.

## Saving a tier from the UI used to reset `membership_bound` — fixed 4 Sep 2026

Recorded 2026-09-02 as H-09: a perk stored as `membership_bound` showed on the edit page
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

## Which surfaces can attach a perk, and which product types they offer

Enumerated 2026-09-09 across every product type, step 1 and step 2, with all accordions
open. The two surfaces disagree, and neither matches the test-case assumption that all
five "supported" types expose tier configuration:

| Product type | `Membership Benefits` on the product editor | Offered in the tier-side `Select Products` dialog |
|---|---|---|
| Online Course | yes (step 2) | yes |
| Digital Download | yes (step 2) | yes |
| Digital Product | — (not re-checked) | yes |
| Consultation | **yes** (Details tab) | **no** |
| Discord Membership | no | no |
| Telegram Membership | no | no |
| Events & Tickets | no | no |

So a consultation perk can only be created from the product side, and Discord / Event
perks cannot be created at all. Filed as `M-38`.

The product-side section is behind a **switch** (`Set benefits for membership`): while it
is off the block shows only its heading and subtitle, and the tier rows with their
`Add Benefit` buttons appear only once it is on — reading the block while the switch is
off looks like an empty or broken section.

**A free (Rp0) non-course product skips the config dialog entirely.** Pressing `Add` on
`Digital Product / Qase Management Testcase (Rp0)` adds the perk immediately as
`Free access`, with no Access Type step — only a *priced* non-course product opens the
Access Type dialog.

## There is no renewal rule, and no per-subscriber price

Checked 2026-09-09 while testing `TC-MEM-C-033`. The tier form (`/membership/{uuid}/update`)
holds Tier Name, the four period prices, Description, Hero Image, `Enable Direct Message`,
Tiers Benefit, Exclusive Post, a `Set Inactive` switch and `Save Changes` — and **no
control or copy about renewal, grandfathering, or existing subscribers**. The database
agrees: `tier_membership_users` has no price column at all (id, uuid,
tier_membership_id, user_id, expired_at, timestamps, three reminder-email columns).

Nothing stores what a subscriber paid, so no per-subscriber price can be preserved. Any
test phrased around a "configured renewal rule" has nothing to configure.

## Disabling a tier: the control and what it does to the public profile

`Set Inactive` on `/membership/{uuid}/update` is a real `role="switch"` next to
`Save Changes` — an earlier note calling it a non-interactive label was wrong.

An inactive tier **disappears from the public profile**: on `/hendrarg` as a guest the
Membership section listed the five active tiers with `Subscribe` buttons and omitted the
one inactive tier entirely. The creator's own `/membership` list still shows it, and
**without any inactive marker in the card text** — read `is_active` from the API, not from
the card.

## The price a subscriber pays lives on the purchase, not the subscription

Corrected 2026-09-09. `tier_membership_users` has no price column, but
`tier_membership_purchases` does — `original_price_idr`, `price_paid_by_buyer`,
`paid_currency`, `promo_code_discount`, its own `expired_at`.

The buyer surface reads from that purchase: `/profile/membership` → Active showed
`kuy — IDR 20.000 / 1 month — Next Billing Date 03 Oct 2026` while the tier's 1-month
price row in `tier_membership_prices` had already been **soft-deleted** and the public
card advertises `Rp50.000 / 3 months`. So a running plan follows what was bought, not the
tier's current pricing — and a test comparing the two surfaces will see two different
numbers by design.

What is still unverified is the **renewal charge**: nothing in the tier form configures a
renewal rule, and reading which price a renewal picks needs an actual renewal.

## Subscribing: the modal, the voucher, and the Rp0 path

Verified 2026-09-10 end to end on `MB Dropdown Check 107394`.

The tier card's `Subscribe` opens a dialog at `/<creator>/membership` (that URL **404s on
direct navigation** — it only exists as a client-side transition). It holds the duration
picker, a required phone number, the payment methods (`QRIS`, `CREDIT CARD`, `VA BRI`,
`EWALLET SHOPEEPAY`, `Show More →`), `Redeem Voucher`, and a fee breakdown:
`Price + Transaction Fee + Payment Gateway Fee = Total`, with the CTA carrying the total
(`Pay Rp25.755`).

**`Redeem Voucher` has two halves and only one works.** `Choose Voucher` lists nothing at
all — even with an active 100 % promo from that creator — and its `Select` stays disabled
(`L-41`). Typing the code into the same panel returns `✓ Discount applied` and does apply
it.

**A 100 % voucher removes the payment step entirely.** The summary collapses to
`Price − Voucher Discount = Subtotal Rp0 / Total Rp0`, the fee lines disappear, the CTA
becomes `Pay Rp0`, and pressing it goes straight to `Payment Successful!` — one
`POST /api/v1/tier-memberships/{uuid}/purchase/fiat`, no QRIS screen. The subscription is
active immediately for the chosen duration, `tier_membership_purchases` records
`status=completed, price_paid_by_buyer=0`, and the entitlement snapshot is written just
like a paid subscription. Promos are created at `POST /api/v1/promos`
(`promoProductType: all_product`) — the promo form offers only All Product / Selected
Product, so a tier-scoped promo cannot be made from the UI at all.

## The membership_bound perk is not honoured on the buyer side

Verified 2026-09-10 with an active subscription whose entitlement row exists
(`tier_membership_user_benefits`, `access_mode=membership_bound`, valid a month out).

The buyer product page asks
`GET /api/v1/tier-membership-users/products/{productUUID}/benefit-check`, and it answers
**`{"hasBenefit": false}`** for the very buyer who holds that entitlement, so that page
keeps its ordinary purchase CTA (`M-39`).

**The perk itself does work — it lives on a different surface.** `/profile/membership`
→ tap the active membership → the detail panel lists `Rewards` with the perk row
(`Online Course · <name> · While subscribed`) and an **`Open Course`** button. That button
goes to `/product/{productUUID}/course?page=…&chapter=…`, served by
`GET /api/v1/tier-membership-users/products/{uuid}/course` (200, full content). So a member
reaches the course from *My Memberships*, never from the product page. The same endpoint answers the identical `hasBenefit:false` for a
`digital_download`, an `appointment`, and a product with no perk at all — so its answer
currently distinguishes nothing; only an unknown UUID differs (`404 product not found`).

**And such a course can no longer be saved.** Opening an online course that is attached as
a `membership_bound` perk and pressing `Save` — with no edits — returns
`500 discount fields must be omitted when accessMode=membership_bound`, with **no toast**
(`H-13`). So the perk both fails to grant access and locks the product's editor.

## What a subscription can and cannot do after it is bought

Mapped 2026-09-10 across an active subscription and a lapsed one.

`/profile/membership` lists active memberships with `Next Billing Date`. Opening one shows
Tier Name, Billing, that date, Description, the `Rewards` list (with `Open Course` for a
course perk) and a `Manage Membership` heading whose only action is **`Upgrade or Add
Tier`** — which just navigates back to the creator's tier list. There is **no renew, no
extend, no cancel** anywhere, so renewal is only the automatic billing cycle.

**A tier you already hold shows an inert `Subscribed` button**, and that state is
*not* cleared when the subscription lapses: an expired subscription still renders
`Subscribed` on the tier card, and the creator's profile still shows the `Member` badge
with `Direct Message` enabled — while the chat itself already blocks sending.

The **`History` tab** of `/profile/membership` does list the lapsed membership with a
`Resubscribe` button, and the chat banner offers `Subscribe` — but both only navigate to
`/<creator>/membership`, where that same inert `Subscribed` card is waiting. So the
resubscribe path exists end to end in the UI and still cannot be completed (`H-10`).

## DM access follows the tier flag, live

Verified 2026-09-10 by toggling `Enable Direct Message` on a tier with an active
subscriber:

- flag **off** → the subscriber's composer disappears on their next load, replaced by
  `You can't send a message right now` and `Messages only accept from subscribers. Your
  chat history is saved.`
- flag **on** again → the composer returns.

An **expired** subscription produces the same block plus its own banner —
`Your subscription to <creator> ended, resubscribe to keep chatting` — and the API is
explicit: `POST /api/v1/dm/conversations` returns `canSend: false`, `GET /api/v1/dm/settings`
reports `accessPolicy: subscriber`. The conversation stays open and is never archived.

The wording is wrong in the creator-disable case: it also says the *subscription ended*
even though it is active (`L-40`). Do not use that string to detect expiry.

## An expired membership_bound entitlement still opens the course

Verified 2026-09-10 on a subscription that was deliberately expired
(`tier_membership_users` id 97, expired 3 Sep 2026) whose entitlement row
(`membership_bound`, free) points at a **paid** course (Rp100.000).

- `GET /api/v1/tier-membership-users/products/{uuid}/course` → **200 with the full course**,
  a week after the parent subscription lapsed.
- `/product/{uuid}/course` renders the chapters and lesson content in the browser.
- The **product page is the only surface that gets it right**: it asks `benefit-check`,
  is told `hasBenefit:false`, and shows `Purchase`.

Filed as `H-11`. The entitlement row has no expiry column of its own, so the read path is
where the parent's `expired_at` has to be enforced — and on the `/course` endpoint it is
not.

**A paid course never shows `Locked`.** For a guest and for the lapsed member alike the CTA
reads `Purchase` with the price; there is no locked state on the product page, and the
thumbnail is never blurred (blur is a member-only-*post* behaviour, not a product one).

## The tenure gate: working on the creator side, invisible on the buyer side (16 Sep 2026)

A third perk axis, **`Who can access`**, gates a perk by how many months the member has
paid for. It shipped in three stages — UI first (15 Sep), schema next (15 Sep), write path
and validation last (16 Sep) — so anything written about it before 16 Sep describes a
half-deployed feature.

### What the creator configures

`Who can access` is the **first** combobox in the tier-side perk dialog
(`Add Tier Benefit` → `Select Products` → `Add`), above `Access Mode` and `Access Type`,
with exactly five options:

| Option | Helper text | Stored |
|---|---|---|
| `Everyone active` | All active members get this benefit instantly, including existing members. | `NULL` |
| `1+ month subscribed` | Members with at least 1 month of paid tenure (1x monthly or longer plan). | `1` |
| `3+ months subscribed` | Members with at least 3 months paid tenure, or a 3/6/12-month plan. | `3` |
| `6+ months subscribed` | Members with 6 months paid tenure, or a 6/12-month plan upfront. | `6` |
| `12 months subscribed` | Members with 12 months paid tenure, or an annual plan upfront. | `12` |

Shape facts that matter for locators:

- **No default.** Unlike `Access Mode`, which opens on `Permanent via purchase`, this one
  opens on the placeholder `Select who can access` and is required.
- **Offered for every product type.** A `digital_download` dialog holds **two** comboboxes
  (`Who can access`, `Access Type`); an `online_course` dialog holds **three**
  (`Who can access`, `Access Mode`, `Access Type`). So `Access Type` is index 2 on a course
  and index 1 elsewhere — never reuse a positional combobox locator across product types.
- **The benefit row names the gate**: `Free access • 1mo+`, `• 3mo+`, `• 6mo+`, `• 12mo+`.
  `Everyone active` gets **no suffix** — the row is a plain `Free access`, identical to a
  perk that was never gated.
- **A free (`Rp0`) non-course product can never be gated from the browser.** Pressing `Add`
  on it skips the config dialog entirely (see the Perk Hybrid section), so the perk goes out
  with no `minDurationMonth` and stores `NULL`. The API is the only way to gate one.

### What is stored, and how the field travels

`min_duration_month` is a nullable `integer` on **both**
`tier_membership_product_and_benefit` and `tier_membership_user_benefits`. The browser sends
`minDurationMonth` inside the perk entry, and for `Everyone active` it **omits the key**
rather than sending `null` — both land as `NULL`, so do not assert on the payload key being
present. `GET /api/v1/tier-memberships/{uuid}` returns the value, and so does the buyer-side
`GET /api/v1/account/{accountUUID}/tier-memberships`.

Verified end to end 16 Sep 2026: a tier built through the UI with one perk per gate stored
`1, 3, 6, 12` and `NULL` on the two ungated perks, read straight from the database.

### Validation answers 400, which is the exception here

`2`, `5`, `7`, `0`, `-1` and `13` are all rejected with

```
400  {"error":["MinDurationMonth must be one of: 1 3 6 12"],"message":"validation failed"}
```

on **POST and PUT**, and on **post perks as well as product perks**. A wrong *type* (the
string `"6"`) is caught earlier, as `400 Invalid request` with a Go unmarshal message — type
and value are guarded separately.

**This is worth noticing because it breaks the endpoint's habit.** Every other perk
validation here answers `500` (`discount is not allowed when accessMode=membership_bound`
and friends, listed above). The tenure gate is the one that answers `400`. And a rejected
`PUT` changes **nothing** — the whole perk list is left at its previous state, not partially
applied.

### Editing a gate

The edit page **hydrates correctly**: `/membership/{uuid}/update` re-renders each stored
gate in the benefit row. Pressing `Save Changes` without touching anything re-sends the same
gates and leaves the database untouched — so this does **not** repeat the H-09 defect that
silently reset `access_mode`.

Both directions work through `PUT` (raise `1` → `12`, lower `3` → `Everyone active` by
omitting the key). But **there is no in-place edit control on a benefit row** — only an
unlabelled `X`. Changing a gate from the browser means removing the perk and adding it back.

All three legal `accessMode` × `accessType` combinations accept a gate
(`membership_bound`; `permanent` + `free`; `permanent` + `discount`), and the illegal
`membership_bound` + `discount` is still rejected with its usual `500`. The tenure axis is
genuinely independent of the other two.

### The buyer cannot see the gate (open defect)

**The public profile renders no tenure condition at all.** On a tier carrying gates
`NULL, 1, 3, 6, 12`, every perk on the guest-facing card reads the same
`Free access for "<product>"` — no suffix, no lock marker, nothing distinguishing a perk
usable today from one that needs a year of tenure. Expanding with `See More` changes
nothing.

This is a **rendering gap, not a data gap**: the response feeding that card
(`GET /api/v1/account/{accountUUID}/tier-memberships`) already carries `minDurationMonth`.
So a buyer cannot learn the condition before paying. Filed as `TC-MEM-C-066` and
`TC-MEM-B-073`.

Note the two surfaces want **opposite** things, and it is easy to collapse them into one
rule by mistake: on the **sales** page a locked perk must be *shown* with its condition; in
the **member's own** benefit list a locked perk must be *filtered out* (`TC-MEM-B-062`).

### How the gate behaves at runtime (verified with a real subscription, 16 Sep 2026)

Fixture: **`QA Tenure Fixture`** (`83510a02-6d4f-4e5e-ad22-ad4a47d7e182`) on hendrarg —
priced 1 month Rp20.000 and 6 months Rp100.000, six perks: ungated, gate 1, gate 3
(30 % discount), gate 6 (`membership_bound`), gate 6 (post), gate 12. **token2
(`sundanese`) holds a real 6-month subscription to it** (`tier_membership_users` id 107,
tenure 6, expires 16 Mar 2027), bought through the buyer UI with QRIS for Rp103.020.

**Tenure is `SUM(duration_month)` over `completed` purchases, and nothing happens before
that.** While the purchase sat at `pending`, `paid_at` and `tier_membership_user_id` were
`NULL` and **no `tier_membership_users` row existed at all** — no subscription, no
snapshot, no tenure. One 6-month purchase then produced tenure 6 and unlocked the gates
1, 3 and 6 **at once**: the gate is a `>=` threshold, so a bigger plan never skips a
smaller one.

**The snapshot only copies perks the buyer has already earned.** `tier_membership_user_benefits`
for that subscription was created with **five** rows — the gate-12 perk was never copied.
So the snapshot is built against tenure at purchase time, not as a full copy of the tier.

**But the read path filters by tenure too, and that is what actually governs visibility.**
Two creator edits, each with the member touching nothing:

| Creator does | Snapshot row | What the member sees |
|---|---|---|
| lowers gate `12` → `6` | **written** (new row, `min_duration_month = 6`) | perk appears immediately; `benefit-check` flips to `hasBenefit: true` |
| raises gate `1` → `12` | **kept**, value updated to `12` | perk disappears from the API response |

So re-locking does **not** delete the row — it updates it, and the read path hides it.
**Never conclude a perk is still available because its row is still in the table**; compare
`min_duration_month` against tenure, or read through the API. And saving the tier
repeatedly does not duplicate rows: four consecutive `PUT`s left exactly six.

A locked perk is refused consistently on every path: absent from
`GET /api/v1/tier-membership-users` (its product name appears nowhere in the body),
`hasBenefit: false`, and `GET …/products/{uuid}/course` → **`403`** with
`{hasAccess:false, accessSource:"none", hasPurchased:false, hasMembershipAccess:false}`.
An unlocked `membership_bound` course returns `200` with the full course — while
`benefit-check` still answers `false` for it, which is the old `M-39` defect, not a gate
problem.

### Isolation and live propagation (verified 16 Sep 2026)

**Tenure is per (buyer, tier), with no leak across a creator's own tiers.** token2 holds
three different tenures on three of hendrarg's tiers at once — 6, 3 and 1. Adding a gate-6
perk to the tier where its tenure is 3 left that perk invisible there, while the gate-6
perks on the tier where its tenure is 6 stayed open. Same buyer, same creator, same gate,
two different answers.

**A new perk reaches an active member instantly, and the gate still applies.** Two perks
added in one creator save — one ungated, one gated at 12 — for a member at tenure 6: the
ungated perk was present on the **very first read after the PUT**, with no delay window at
all (re-checked at +3 s and +11 s, unchanged), and the gate-12 perk never appeared. So the
read path merges the tier's live state rather than serving the snapshot alone, and it does
not synthesize perks the member has not earned.

**An expired subscription is still returned** by `GET /api/v1/tier-membership-users`, with
its snapshot benefits attached — so an expired member's view can be read from the same
endpoint as an active one.

### A tier with duplicate perks can no longer be saved at all

Found 16 Sep 2026, and it raises the cost of the `C-062` defect considerably.

`PUT /api/v1/tier-memberships/{uuid}` on the tier `Live Time and Bound Online Course`
answers **`500 duplicate productUUID … (first at index 0)`** even when the payload is an
**exact copy of that tier's own current perk list**, unchanged. The tier already holds the
duplicate `New layout` rows that the product-page save wrote (see the section above), and
the tier endpoint's duplicate guard now rejects the state the product endpoint created.

The tier is therefore **frozen**: its creator cannot change its name, price, perks or
anything else until the duplicates are cleared by some other route.

**And payments on that tier do not settle.** A subscription bought on it (`purchase` id 132)
was still `pending` after 11.5 minutes, while all thirteen other purchases made that session
settled in 26-192 s — including a **control** placed on a healthy tier *after* the stuck one,
which settled in 169 s while the stuck one sat through the same sweep unchanged. The sweep is
clearly running; only that tier's purchase is not processed. The reading that fits the
evidence is that settlement rebuilds the entitlement snapshot, trips over the duplicate
perks, and fails — so **a buyer can pay and never receive the membership**. Not fully
confirmed, because the background job's error is not visible from outside.

So the product-page defect is not merely "writes perks nobody asked for": it can leave a tier
permanently uneditable *and* unsellable. It also blocks `TC-MEM-B-058` and `TC-MEM-B-065`,
which both need that tier's expired subscription.

### Where the buyer can and cannot see the gate

Three buyer surfaces, and they do not agree:

| Surface | Shows the gate? |
|---|---|
| Profile card (`/<creator>`, Rewards list) | **no** — every perk reads `Free access for "<product>"` |
| Tier chooser (header `Subscribe` → list, "What you'll get") | **no** — same summary wording |
| **Tier detail** (`/<creator>/membership/{tierUUID}`) | **yes**, fully |

The detail page is the one that matters, because it is where `Subscribe` actually happens.
It renders a per-perk badge (`1+ mo`, `3+ mo`, `6+ mo`, `12 mo`), a `Locked` button for
perks above the viewer's tenure, `See Product` / `Open Course` / `See Post` for the rest,
the discount as `Special Price` with a struck-through price and a `30% off` badge, and a
progress line above the list: *"Some perks unlock the longer you stay subscribed — next at
1+ month subscribed."* (a guest gets `Log in to see your progress`). An ungated perk shows
no badge at all. Verified as guest, as a non-member, and as the tenure-6 member.

Note the wording differs by role: the creator dashboard writes `6mo+`, the buyer detail
page writes `6+ mo`.

**Getting there is the awkward part.** `Subscribe` is a **profile-header** button, not a
tier-card button — the card only has `See More`. And a buyer who already holds *any*
membership from that creator sees `Member` there instead, which leads nowhere: there is no
route from the profile to subscribe to a *second* tier of the same creator. The direct URL
`/<creator>/membership/{tierUUID}` does work and opens the checkout normally, so that is
the way to drive it in a test. (Related to `H-10`.)

### Buying one through the API

`POST /api/v1/tier-memberships/{uuid}/purchase/fiat` takes `durationMonth`,
`paymentMethod`, `phoneNumber` and `email` — all four required, and **`paymentMethod` is
lower-case (`"qris"`)**; `"QRIS"` is rejected with `payment method not valid`. A
`…/purchase/fiat/estimation` call with the same body returns the fee breakdown
(`tierPrice`, `transactionFee`, `paymentGatewayFee`, `amount`) without committing.

**Dev QRIS settles by a periodic sweep, roughly every 3-4 minutes** — not per purchase, and
not instantly (an earlier reading in this file said "instantly"; that was a purchase polled
several minutes after the fact). Measured over six purchases placed a minute apart: they
settled in two clusters, members of each cluster a few seconds apart, with individual
latencies of 26 s to 192 s depending on how close the purchase landed to the next sweep. So
budget up to ~4 minutes, poll rather than assume, and expect batched settlement.

### Tenure really is a SUM, proven by renewals (16 Sep 2026)

Fixture: **`QA Tenure Ladder`** (`7988fb9f-bac9-4b3e-83e1-a8cd7cd56ecb`, db id 146), priced
**1 month only**, on which token2 made **six consecutive 1-month purchases** (subscription
id 108). Every one completed; the subscription's expiry landed on 16 Mar 2027, exactly six
months out, so renewals stack from the previous end date.

While the ladder was climbed the tier carried a single perk gated at **3**, and the
entitlement history settles the question:

| After purchase | Tenure | Entitlement rows |
|---|---|---|
| 1 | 1 | none |
| 2 | 2 | none |
| 3 | 3 | **the gate-3 perk appears** |
| 4-6 | 4, 5, 6 | same one row, rewritten each time |

**This is what separates `SUM` from `MAX`.** Under `MAX(duration_month)` the value would be
1 forever and a gate-3 perk could never open through one-month renewals. It opened on the
third purchase, with the member doing nothing but renewing — so the figure accumulates. It
also pins the comparison as `>=`: withheld at 2, granted at exactly 3.

**Every settlement rewrites the snapshot rather than amending it.** The row is soft-deleted
and an identical one inserted (ids 329 → 330 → 331 → 332 across the renewals), so an
entitlement row's `id` is not a stable handle — match on product, not on id.

### Unsupported product types are dropped from a perk payload in silence

`POST /api/v1/tier-memberships` accepted a payload of five perks and stored **one**. The
four that vanished were an `appointment`, a `ticket_event` and a `telegram_membership` —
types the tier-perk system does not support (consistent with the surface table above, where
those types are not offered in the `Select Products` dialog). There was **no error, no
warning, and a `200`**: the response simply came back with fewer perks than were sent.

Two consequences. For a creator, perks can silently fail to be created. For a test author,
**always read back the perk count after seeding a tier** — a fixture that looks configured
may hold a fraction of what you sent, and every assertion built on it will be measuring the
wrong thing. This cost a full ladder run before it was spotted.

### Post perks: the gate is enforced in the page, not in the API

Two `membership_only` posts were attached to a tier, gated at 6 and 12, and read at tenure 6.

On `/post/{uuid}` the gate works: a **guest** gets both posts locked (`Member Only`,
`Unlock post to read & comment`, `Unlock Now`), and the **tenure-6 member** gets the gate-6
post open with a live comment box while the gate-12 post stays locked — with its own copy,
`Unlock post to add comments`. The member's benefit list agrees: the gate-6 post is returned,
the gate-12 one is not.

**`GET /api/v1/posts/{uuid}` does not enforce it.** A guest receives the full `content` of
both posts, unmasked, with no lock flag — and the response even carries
`tierMemberships[].minDurationMonth`, so the locking is evidently expected of the client.
The test posts were text-only, and dev holds no `membership_only` post with media, so whether
*assets* would be masked is unknown. Worth pursuing under `TC-MEM-B-GAP-009`.

**Two traps around post perks:**

- **Attaching a post to a tier does not make it private.** Visibility is the post's own
  field. A `public` post attached as a gated perk stays readable by everyone; only the perk
  row on the tier detail page reacts to the gate.
- **`PUT /api/v1/posts/{uuid}` with `tierMembershipUuids` creates the tier perk itself**,
  ungated. Trying to add the same post again from the tier side is then rejected as a
  duplicate — so to gate a post, edit the perk entry that already exists rather than adding
  one.

**Removing a post perk prunes the member's snapshot row** (soft-deleted), unlike a locked
perk, whose row stays and is merely filtered. Two different mechanisms, one identical
appearance — do not infer the cause from the member's view alone.

### Crypto checkout needs a USD price on the tier

`POST /api/v1/tier-memberships/{uuid}/purchase/crypto` and its `/estimation` sibling exist
and require `inputCurrency`. With `USDT`, `usdt` or `USDC` they all answer
`400 tier membership price is not available in USD for crypto checkout` — because the tier
was priced in IDR only. So a crypto test needs a tier carrying `priceUSD` on its price rows;
whether the payment can then actually complete on dev is still unknown.

### Fixtures left in place

- **`QA Tenure Fixture`** `83510a02-6d4f-4e5e-ad22-ad4a47d7e182` — six perks across gates
  `none/1/3/6/12` plus gated posts; token2 holds tenure **6** from one 6-month purchase.
- **`QA Tenure Ladder`** `7988fb9f-bac9-4b3e-83e1-a8cd7cd56ecb` — priced 1 month only;
  token2 holds tenure **6+** built from consecutive 1-month renewals.

Both are expensive to rebuild, so they are worth keeping. `tier_membership_purchases` id 132
is a stuck `pending` row on the frozen tier that cannot be cleaned up from outside.

### What is still unverified

An `Rp0` purchase counting (`B-060`); a crypto purchase counting (`B-061`, now blocked only
on a USD-priced tier); tenure accumulating across a lapse and what a permanent perk does
afterwards (`B-058`, `B-069`, both blocked on the unsettleable tier above); and claiming a
gated product then keeping it once the creator removes the perk (`B-066`, `B-070`).
Isolation **between buyers** is also still open — only one buyer has ever held tenure on
these tiers.

**One trap before writing the post test (`TC-MEM-B-071`):** attaching a post to a tier as a
gated perk does **not** make that post private. The fixture's post is
`visibility = public`, and `GET /api/v1/posts/{uuid}` returns its full content identically
to a guest and to the member. The gate only drives the perk row on the tier detail page
(`See Post` vs `Locked`). Testing post gating needs a `membership_only` post linked to the
tier — otherwise a green result means nothing.

Also unopened: whether `Add Exclusive Post` on the tier form offers the gate control (a post
perk gated through the API stores the value fine).

**Aside:** `POST /api/v1/tier-memberships` with `isActive: false` comes back
`isActive: true`, and a `thumbnailURL` the API accepts is echoed as `""` unless it came from
the upload flow. Seed an inactive tier by creating then updating it.
