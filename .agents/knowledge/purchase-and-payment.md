---
title: Purchase, promo, and payment
type: note
category: project
tags: [yapp, product, automation, purchase-and-payment]
project: yapp
created: 2026-09-04
updated: 2026-09-04
sources: 0
status: active
---

> [[projects/yapp/knowledge/index|Knowledge index]]

# Purchase, promo, and payment

Checkout, guest verification, promo redemption, and how payments settle on dev.

## Guests must verify email before buying

Confirmed 2026-08-27.

**A guest buyer can no longer purchase anonymously.** Checkout inserts an OTP step:
the guest enters an email, receives a code, and the purchase only completes once the
code is accepted. This is a behaviour change — older test cases and defect notes
assuming anonymous guest purchase describe the previous behaviour, not a regression.

**The verified email becomes the ownership key.** Access to the purchased product is
afterwards granted only to the purchaser address. An outsider supplying a *valid* OTP
for their own email is still denied: the dialog stays open, the URL does not change,
no session is created. **Passing the OTP screen is not passing the ownership check** —
a test that stops at "the code was accepted" has not proven the negative path.

**Two OTP purposes exist and are not interchangeable.** The dev database
distinguishes `verify-purchase-otp` from `verify-login-otp`. A delivered login code
proves nothing about the purchase flow.

When the testmail inbox is unavailable — the `x7nv1` namespace has a 100-email/month
quota, exhausted in Aug 2026, resetting monthly — read the code straight from the
`otp_codes` table with `npm run db:shell`. Absence from an inbox is never evidence
that a code was not generated.

## Promo redemption needs no payment

Established 2026-08-19. This is what lets promo tests run under the standing
"no transactions or payments" constraint.

At `/product/{uuid}/checkout`, Choose Voucher then the code then Use Now fires
`POST /orders/quote/estimation` with `{productUUID, quantity, paymentMethod,
promoCode}`. **The response is the verdict**, and the order summary re-renders from
it. Never press `Pay IDR ...` — nothing is charged and no order row is created
(verify with `shop/orders` `totalResults`).

- **Valid code** gives `200` carrying `promoCodeDiscount`, `subtotal`, `amount`; the
  UI adds a code chip and a Discount line.
- **Rejected code** gives **`500`**, with the reason in `message` (`Promo code not
  active`, `Cannot use the promo code, already expired`). The UI shows only a generic
  `Invalid promo code`. The 500-for-validation is filed as a Low finding — do not
  read it as a broken server.

**A valid code recomputes every line, including the fees.** Verified 2026-09-02 on two
product types with one 10% `all_product` promo, as a guest, without paying:

| Product | Before | After 10% |
|---|---|---|
| Discord Membership Rp25.000 | 25.000 + fee 1.000 + PG 263 = **26.263** | Discount −2.500, subtotal 22.500, fee 900, PG 237 = **23.637** |
| Online Course Rp100.000 | 100.000 + fee 4.000 + PG 1.051 = **105.051** | Discount −10.000, subtotal 90.000, fee 3.600, PG 946 = **94.546** |

The transaction fee is 4% of the **discounted** subtotal, not of the list price, and
`POST /orders/quote/estimation` returns matching `promoCodeDiscount`, `subtotal` and
`amount`. A `Discount` line appears above `Subtotal`.

**Seeding a valid-voucher fixture:** create a promo with `promoProductType: "all_product"`
(`POST /api/v1/promos` with `name`, `code`, `discountType`, `discount`, `periodStartAt`,
`periodEndAt`) — no per-product scoping is needed, so one promo covers every product type
under test. Delete it afterwards with `DELETE /api/v1/promos/{uuid}`.

**API access note:** these endpoints reject a bare Node `fetch` with
`not allowed to access this API`. Issue them from inside a page context
(`page.evaluate`) so the browser's origin applies.

**A rejected code drops the fee rows, and that is expected.** On rejection the summary
re-renders without `Transaction Fee` and `Payment Gateway Fee`, so the displayed total
falls to the bare subtotal and the CTA follows it — Rp153.000 to Rp150.000 on Digital
Product, Rp105.051 to Rp100.000 on Discord Membership, Rp102.021 to Rp100.000 on
Consultation, Rp104.000 to Rp99.000 on the promo fixtures. **This is the product's
invalid-voucher signal, not a pricing defect** (ruled by the product owner
2026-09-02), and the payable amount is re-derived server-side at payment.

So never assert "total unchanged" after a rejected code — assert the rejection message,
that no `Discount` line appears, and that `subtotal` is unchanged. Ruling out the fee
rows this way retired one bug outright and cleared six test cases; the same expectation
is still written into the cart-level voucher tests (`TC-CART-B-062/079/080/081/082`),
which pass as-is because the cart summary is a different surface.

**Promo status** is `PATCH /api/v1/promos/{uuid}/status` with
`{"isActive": true|false}` giving 200. Manual status **overrides** the period-derived
status: a promo whose period has not started shows `Not Started`, and turning the
toggle on makes the column read `Inactive` instead. Only the promo **detail**
endpoint returns `isActive` — the list endpoint omits it, so read `promos/{uuid}`
when asserting state.

**Finding a prior order that used a promo:** the order list carries no promo field.
Scan `orders/{orderUUID}` (buyer-side detail, works with the creator token) for
`promoCodeDiscount > 0` — 15 of the 134 orders since 1 Jul qualify. `orders/{uuid}`
gives the full money breakdown (`productPrice`, `discount`, `promoCodeDiscount`,
`subtotal`, `transactionFee`, `paymentGatewayFee`, `amount`), the right baseline for
before/after comparisons.

## Dev QRIS payments settle themselves

Live-verified 2026-08-27 on `yapp-dev`. A tip submitted from `/<handle>/tip` creates
a pending QRIS order (`/transaction/<orderId>`, Pay Before ~59 min) and **settles on
its own within a few minutes** — no scan, no payment. The page then shows Payment
Success. Check Status does not force it; wait and reload.

So a real paid transaction is reachable on dev at the cost of a few minutes of
waiting. Confirmed downstream effects of one dev tip: Spin Wheel progress advanced by
the subtotal, the leaderboard reordered, a VIP Queue entry was created, the Tips list
incremented, and the tip ticker updated. **Those effects appear only after
settlement**, so a check made too early looks like nothing happened.

**A genuinely failed payment is not reachable.** Nothing on dev produces one.

**Existing orders often remove the need for a payment entirely.** The QA account
(token1) already holds 17 completed orders, so anything phrased as "as a buyer who
already owns X" — thank-you page, library, re-download, order history, after-sales —
needs only the right existing order.

The appointment gap is closed as of 2026-09-10: the second buyer account
(`anthony_mosciski`, user 459) holds two real consultation bookings on hendrarg's
disposable free consultations — `QA I-019 after sales` (order
`657f62e4-bb07-42da-83c6-96439dc016e7`, after-sales message + 2 links) and
`QA I-021 default state` (empty after-sales). Free consultations book without any payment
step, so more can be made the same way in minutes.

## Checkout shape differs by product type

Digital Product, Discord Membership, and Online Course navigate to a **page** —
`/product/{uuid}/checkout?quantity=1`. Event & Tickets uses a **modal**. Locators
written for one path do not apply to the other.

The fee rows also differ between creators, so never hardcode a total.

## More on promos

**The edit route is `/promotions/{uuid}/update`.** Plain `/promotions/{uuid}` renders
an empty page with no controls at all.

**A usage limit can be reached without paying.** For a promo with `redeemCounter` of
n, set `maxUsed: n` via `PUT /promos/{uuid}` to put it exactly at its ceiling, then
restore it to `null` afterwards. The rejection verdict is read from
`POST /orders/quote/estimation`, which returns a specific message per cause:

| Response | Meaning |
|----------|---------|
| 404 `record not found` | code does not exist |
| 500 `Cannot use the promo code, already expired` | outside the promo period |
| 500 `Promo code has reached the maximum usage` | at the usage ceiling |

**That table no longer holds for the expired case (re-measured 17 Sep 2026).** Every
rejection now answers **`404 record not found`** — a nonexistent code, two genuinely expired
promos, and an empty string all produced the identical body. The specific "already expired"
message did not appear. The likely cause is that the lookup began filtering by period, so an
out-of-period promo is simply not found and its reason is lost.

**And the checkout renders that string to the buyer verbatim**, inline under the code field:
the shopper literally reads `record not found`. Filed as `YAP-2186`. So do not assert on a
per-cause message today, and do not use the message to tell a mistyped code from an expired
one — the API cannot currently distinguish them.

**No affiliate promo exists on dev.** A census of all 9 promos found every one with
`isSetAffiliate: false`, `affiliatorCommissionPercentage: 0`, and `affiliator: null`.
The order side is already prepared to receive one — `affiliatorCommissionAmount`,
`productAffiliator`, and `productAffiliatorCommission` are present on the order detail.

## The Library card date is the purchase date

On the buyer Library, the date printed on a card is when the item was **bought**, not
when the event happens. Two tickets dated June 2026 were for a 1 September 2026 event.
For any post-event test case, read the date from the ticket page instead.

## The cart has no quantity, and no fee breakdown

Verified 2026-09-01 at `/cart`.

**Quantity is not a concept.** There is no number input, no stepper, no plus/minus
control anywhere in the cart — every product is one line item. Any test case about
minimum, maximum, or per-buyer quantity has nothing to act on at the cart level.

**Items are grouped by creator**, and a cart may hold products from several creators
at once. Selection is three-tiered: `Select All`, one checkbox per creator group, one
per item. The per-item action button (remove) renders with **no text and no
`aria-label`**, so it has no accessible name.

**`Cart Summary` is only `Total Amount`** plus the selected-item count and the
`Check out` button — no subtotal, service fee, platform fee, gateway fee, tax, or
discount line. The total tracks the checked items (selecting a Rp20.000 item moves it
from IDR 0 to IDR 20.000). The fee breakdown appears only at checkout, so do not look
for it on the cart page.

**`Check out` is disabled until something is selected** and enables as soon as one item
is checked; checking an item auto-checks its creator group.

**Locator trap (2026-09-09):** the page renders a **second, hidden `Select All`
checkbox** for the mobile layout, so a raw `[role="checkbox"]` count is one higher than
what is on screen (8 items across 5 creators gave 15 nodes, 14 visible). Filter by
visibility, or index from the top rather than the end of the list — clicking the last
node toggles everything.

## Booking a free consultation needs no payment step at all

Verified 2026-09-10 end to end with a second buyer account on a Rp0 consultation.

The flow is: product page → a date chip (only weekdays the creator opened) → a time slot →
the sticky CTA, which reads **`Save my spot · <date>, <time>`** (next to `Add To Cart`).
That opens a **`Checkout` dialog** carrying the session summary — date and time, session
length, `In your local timezone, Asia/Jakarta (GMT +7:00)`, a `Conduct in 0 days : 4h : 3m`
countdown, the meeting platform — and a **prefilled** name / phone / email form.

For a free product the dialog's confirm button is labelled **`Join`**, not Book or Pay,
and pressing it completes the purchase immediately: `POST /api/v1/orders/quote` →
`GET …/payment/status` → `GET …/after-sales`, ending on
`Purchase Successful — Payment Successful — Your spot is secured. We've sent the session
details to your email.` No QRIS, no waiting for settlement.

**The thank-you dialog is where after-sales renders.** With a configured message it shows
the creator's text read-only plus a `LINK` section whose entries are anchors with
`target="_blank"`; with after-sales empty it shows just the confirmation plus
`View Booking` and `Explore other products`, and no empty link section.

## The buyer's booking lives under the order UUID

`/dashboard/library` lists purchases by type (`All`, `Events & Tickets`, `Digital
Download`, `Consultations`, …). Opening a consultation row navigates to
**`/product/{orderUuid}`** — the order's uuid, not the product's.

That page carries `View Message`, an `Overview` / `About Creator` switch, the session
details, `Reschedule` (with the copy *"Once booked, consultations can't be canceled. You
may reschedule if needed."*), the Google Meet URL as plain text, and a **`Join Meeting`
button**. It is a `<button>`, not an anchor — clicking it opens the Meet URL in a **new
tab**, so assert the popup, not `href`/`target`.

The meeting link is generated by Yapp at booking time (`https://meet.google.com/…`), even
though the product page says only *"Meeting link will be sent to your email after booking
completed"*.

## What can actually go in the cart, and what happens when it disappears

Established 2026-09-10 by seeding one product of each type and watching the cart.

**`online_course` products have no `Add To Cart` button at all** — their page offers only
`Purchase`. Verified on two freshly created courses (different creators) and on the
existing `New layout`. The cart rows that *look* like courses are mislabelled by category:
`Crypto Product` and `beli dong`, both sitting in a cart, are `digital_product` in the
database. Cart-eligible types seen so far: `digital_product`, `digital_download`,
`ticket_event`, `appointment`.

**An event ticket takes two steps.** `Select` a ticket tier → `Add To Cart` on the page →
a **`Checkout` dialog** (`Fill in your ticket info`) with contact and per-attendee fields,
already prefilled from the account → `Add to Cart` **inside the dialog** → `Product Added`.
Only that second press fires `POST /api/v1/cart/items`; stopping at the dialog adds
nothing.

**A deleted product is dropped from the cart silently.** With an event ticket in the cart
(Select All showed `Rp50.000 / 2 items`), the creator deleting that product makes the row
vanish on the next cart load — `GET /api/v1/cart/items` returns only the survivors, there
is no "no longer available" placeholder, no error, and the total recalculates
(`Rp25.000 / 1 item`). The same silent drop was observed for a course and two
consultations that were deleted while in the cart. Confirmed again on 2026-09-10 with a
`digital_download` (`Rp0`, count 4 → 3, total unchanged because the item was free) and a
`appointment` (`Rp65.000 / 3` → `Rp45.000 / 2`), each deleted through
`DELETE /api/v1/shop/products/{uuid}` while the buyer held it. Deletion is the one
cart-invalidation case the app gets right.

**The buyer never picks an event date.** The date belongs to the event product; the buyer
page only offers ticket tiers, and the checkout dialog prints the date as fixed text. Any
test phrased around "buyer has not chosen a date yet" has no control to act on.

**Consultation slots render only while bookable.** With availability 00:00–23:45 and a
one-hour minimum notice, the earliest slot offered is already past that window, so an
expired slot can never be selected from the list.

**Changing a consultation's weekly availability strands the slot already in the cart.**
`PUT /api/v1/shop/products/{uuid}` with a narrowed `consultationWeeklyRules` (the PUT
rejects a partial body — it demands `isSetPrice`, `isSetDiscount`,
`isAllowCustomerChooseQuantity`, `isLimitProductSales`, `isSchedulePublish` and
`isAvailability`, so resend the whole product; `thumbnailImage` and `productImages[].url`
can be echoed back as the signed URLs the GET returned, and there is no `PATCH`). The
buyer's product page updates immediately, but the cart keeps rendering the dead slot with
no marker, `Check out` stays enabled, `/cart/checkout` renders in full, and
`POST /api/v1/cart/checkout/estimate` then `POST /api/v1/cart/checkout` both answer
**HTTP 500** `slot time does not match any available slot based on weekly rules`. The
order is correctly never created, but the `Pay` button produces no toast, dialog or
message — a silent dead end. Recorded on H-01.

**Cart checkboxes are Radix buttons — `element.click()` does nothing, use a mouse click.**
And there are three per creator group: one page-level `Select All`, one per-creator group
box (its row text spans every product that creator sells), and one per product row. Pick
the row box by taking the *smallest* ancestor whose text is longer than ~12 chars and does
not contain `Select All`; clicking the group box selects the whole creator's items.

**A required additional question blocks `Pay` for the whole checkout.** With a product
that carries one (e.g. the `Discord Membership Germa 66` fixture), `Pay` renders
`This field is required` and never submits — select only the product under test when
checking someone else's payment behaviour.
