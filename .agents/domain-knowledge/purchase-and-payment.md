# Purchase, promo, and payment

Checkout, guest verification, promo redemption, and how payments settle on dev.

## Guests must verify email before buying

Confirmed 2026-08-27, covered by `TC-PD-B-030`.

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

Established 2026-08-19 closing TC-PRM-C-023 to C-026. This is what lets promo tests
run under the standing "no transactions or payments" constraint.

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

**This converts a whole class of parked test cases into ordinary live tests**, at the
cost of a few minutes of waiting. Confirmed downstream effects of a real dev tip:
Spin Wheel progress advanced by the subtotal, the leaderboard reordered, a VIP Queue
entry was created, the Tips list incremented, and the tip ticker updated.

**Still not reachable this way:** a genuinely *failed* payment. Nothing on dev
produces one, so "do not record on failed payment" test cases stay Not Run.

### The premise reaches past Livestream

**31 test cases across 10 sheets** were parked `Blocked` on the same dead assumption
that a real payment was required, each annotated
`PEMBARUAN 27 Agu 2026 - premis "butuh pembayaran" sudah gugur`. Read that annotation
precisely: it records that the case *became testable*, **not** that it was retested.
Those 31 are still outstanding work.

**A second fixture makes many of them free.** The QA account (token1) already holds
**17 completed orders**, so anything phrased as "as a buyer who already owns X" —
thank-you page, library, re-download, order history, after-sales — needs no
transaction at all, only the right existing order.

Closed this way on 2026-08-27: Tipping `C-015` and `B-029`, Add to Cart `B-051`,
Product Digital `B-005` and `B-012`, all `Blocked` to `Passed`.

Still blocked for reasons auto-settle cannot fix: `CART-B-071` / `B-072` (need the
testmail quota back *and* a multi-product-type order fixture that does not exist);
`PD-C-020` / `C-029` / `C-030` (pending; `C-030` now has a fresh old-buyer fixture);
and any failed-payment case.

**Before marking anything `Blocked` for payment, check three things in order** — is
there an existing completed order that satisfies it, will a dev QRIS tip settle into
it, and only then is it truly blocked.

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

**No affiliate promo exists on dev.** A census of all 9 promos found every one with
`isSetAffiliate: false`, `affiliatorCommissionPercentage: 0`, and `affiliator: null`.
The order side is already prepared to receive one — `affiliatorCommissionAmount`,
`productAffiliator`, and `productAffiliatorCommission` are present on the order detail.

## The Library card date is the purchase date

On the buyer Library, the date printed on a card is when the item was **bought**, not
when the event happens. Two tickets dated June 2026 were for a 1 September 2026 event.
For any post-event test case, read the date from the ticket page instead.
