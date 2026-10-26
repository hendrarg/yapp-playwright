---
title: Membership auto-renew (GoPay)
type: note
category: project
tags: [yapp, product, automation, membership-auto-renew]
project: yapp
created: 2026-10-23
updated: 2026-10-23
sources: 0
status: active
---

> **Obsidian:** [[projects/yapp/knowledge/index|Knowledge index]]

# Membership auto-renew (GoPay)

Draft product rules for automatic renewal of a **Yapp tier** (`tier_memberships`)
through a linked GoPay account. Source: PRD *Membership - GoPay Recurring &
Auto-Renew* (Angeline, 2026-10-13). The checkout option is on yapp-dev as of
2026-10-23; the link itself does not finish, and the rest of this note (grace,
price migration, Manage membership) was not exercised. The creator tier form
still has no renewal control — see [[membership-tiers]].

## What checkout does on dev (2026-10-23)

Signed in, on `/{creator}/membership/{tierUuid}`, `Subscribe` opens the dialog.
A priced tier lists `GOPAY · AUTO-RENEW` first (`value=gopay_recurring`), ahead
of QRIS, and not behind `Show More`. The dialog opens with **QRIS** selected,
never GoPay. The button is `Pay Rp…`.

Selecting GoPay renames the phone field to `GoPay Phone Number`, with the hint
`We'll link this GoPay account for auto-renew.` The country code stays `62`.
A note reads `Your GoPay will be charged automatically`, then `Today` and the
total, then the next date (`23 Nov 2026` when checked on 23 Oct) and
`Then every month until you cancel` with the same total, then
`Cancel anytime in Manage membership before the next charge.` The button
becomes `Pay & turn on auto-renew`. On the Rp20.000 tier the GoPay gateway fee
was Rp2.551 (total Rp22.951); QRIS on the same tier was Rp204 (total Rp20.604).
Switching back to QRIS removes the note and restores `Pay Rp…`.

A Rp0 tier does not list GoPay. Its methods start at QRIS and the button is
`Pay Rp0`. A signed-out visitor never sees the method list: the tier page
offers `Sign in before subscribing`.

`Pay & turn on auto-renew` posts `{ phoneNumber }` to
`POST /api/v1/pay-accounts/gopay`, with the `62` prefix and no plus
(`628215023424` for the local field `8215023424`). The response is a Cloudflare
502 with no `Access-Control-Allow-Origin`, so the browser reports a CORS
failure, the dialog stays open, and no error is shown. The call still creates
a `pay-accounts` row: `provider=gopay`, `status=pending`, `linkedAt` null.
There is no redirect to the GoPay activation page. Sandbox PIN and OTP were
not reached. The pending row stores no activation URL.

Finishing that pending state is a later step, and it does not run from the
checkout dialog. The link response is supposed to carry `activationUrl` (or
`activationAppUrl` on mobile). That is the GoPay page. After the member
approves, GoPay returns to `/gopay/linked`, and that page posts
`POST /api/v1/pay-accounts/gopay/confirm`. Status `enabled` leaves for the
checkout that started the link (`?checkout=gopay`), or
`/profile/settings?tab=payment` when no return path was saved. Status
`pending` stays on `Waiting for GoPay to confirm…` with `Check again`. Any
other result shows `Linking didn't finish`. Confirm against the stuck row on
2026-10-23 answered 200 and left status `pending`, `linkedAt` null.
`DELETE /api/v1/pay-accounts/gopay` unlinks the row. It does not complete it.

The same option is not on other checkouts. A digital-product checkout
(`/product/{uuid}/checkout`) and `/hendrarg/tip` list only `QRIS`. Neither page
contains a GoPay control. Checked 2026-10-23 while signed in.

This is the creator's own subscription, not a Discord or Telegram membership
product ([[membership-products]]). Whether those products share this engine is
still open. Do not apply these rules to them.

## Who can turn it on

- Only a logged-in member. A guest cannot auto-renew in this version (no account
  to attach the agreement to, and no verified email for the notices).
- Auto-renew is optional. The same tier can still be paid for a single period
  without linking GoPay.
- Checkout on a tier that offers it must show the amount, the period, the first
  charge, the **next charge date**, and how to cancel **before** the member
  confirms.
- Linking is GoPay Tokenization: one PIN. Later renewals do not ask for a PIN,
  because recurring debit is enabled for the merchant.
- The amount and period shown at consent are stored on the subscription. That
  stored pair is the agreement.
- A failed or abandoned link stays `pending_link` and can be retried. No access
  until the first payment succeeds.
- A member with no verified email still gets in-app notices. If neither in-app
  nor email can be delivered, auto-renew is not offered.

Out of this version: any method other than GoPay, pause or skip, free trials,
a discounted first period, and guest auto-renew. The state model must still
allow another payment method later. Existing refund rules are unchanged; what
a refund does to an auto-debit, to already-claimed benefits, and to Group Chat
is not decided.

## States

Yapp owns the state. Midtrans only reports `active` and `inactive`, so a
Midtrans notification is an input, not the source of truth.

| State | Meaning | Access |
|---|---|---|
| `pending_link` | Checkout started, GoPay link not finished | None |
| `active` | Paid, auto-renew on | Full |
| `cancel_at_period_end` | Member turned auto-renew off | Full until the paid period ends; no further charge |
| `past_due` | A debit failed and retries are still running | Full |
| `grace` | Retries are exhausted; the member can still fix payment | Full until grace ends |
| `awaiting_approval` | A price migration applies to the next eligible renewal and the member has not approved | Full until the paid period ends |
| `expired` | Not renewed | Frozen view with a renewal CTA, same shape as an ended Group Chat membership |

## What a renewal charges

- The debit amount is the **price snapshotted on that subscription**. It is never
  read from the tier's live price at debit time.
- Each duration (1, 3, 6, 12 months) has its own snapshot, amount, and renewal
  date.
- One successful debit creates one order, extends the period, and keeps benefits
  on. A failed attempt creates no order and is not revenue.
- Wallet and Statistics label a successful renewal as an order with source
  `Membership renewal`.
- Each charge uses one idempotency key per subscription and cycle. On a timeout
  or a pending status, Yapp checks that transaction before charging again.
- A daily reconcile flags a successful payment with no access, and access with
  no payment, then repairs it.
- Month-end dates (the 29th through the 31st) and the WIB zone are defined once
  and used for access, reminders, and the debit. Fee treatment on a renewal,
  and on an Rp0 or benefit-discounted order, is not decided.

## Changing the price

Decided 2026-10-13.

A tier with **no members** can be repriced freely. The only confirm is the
normal save.

A tier **with members** keeps two prices. Existing members stay on the price
snapshotted when they subscribed. People who subscribe after the save pay the
new price immediately, including someone who subscribes the same day. A renewal
due tomorrow for an existing member is still the old snapshot.

The disclaimer, shown when auto-renew is enabled and on every price edit of a
tier that has members, is: "Avoid changing this price once you have members.
Existing members keep their current price. Changes apply to new members only."
The save confirm names how many active members there are and that they keep
the old price.

A price **decrease** follows the same default: new members only. The creator
can offer the lower price to existing members without asking them to approve.
That offer is a separate creator action. It is not automatic.

### Moving existing members onto the new price

After the edit, the creator is asked "Move existing members to the new price?"
The default is **No**. Nothing is sent if they leave it there.

If they choose Yes, every active member is notified at that moment, in two
places, both with **Approve** and **Decline**:

- In the member's membership of that creator: a banner on the membership card
  in Manage membership and on the creator's membership page. It stays until the
  member answers or the target renewal passes.
- Email. The buttons open a confirmation screen in Yapp. The decision is stored
  only after the member confirms there, so a tap in the mail client is not the
  decision and the account has to be the logged-in one.

One answer updates the other channel at once. The member can change it until
the target renewal. Each answer stores a timestamp and the channel. The creator
sees the notice as sent, viewed, approved, declined, or expired, in aggregate:
asked, approved, declined, no response, and the expected revenue at the new
price. Each tier also shows how many members are on an old price versus the
current price.

**30-day rule.** A higher price can be charged only on a renewal that falls
**30 days or more after the notice**. Any earlier renewal stays on the old
price and does not need approval. The first renewal that clears 30 days is the
target.

- **Approve:** the snapshot becomes the new price from that target renewal, and
  the membership continues.
- **Decline, or no answer by the target renewal:** that renewal is not
  attempted. There is no charge at either price. Access lasts until the end of
  the period already paid. State stays `awaiting_approval` until then, then
  `expired`.
- After that, the member can still join again through the normal subscribe flow
  at the new price.
- Unanswered members are reminded by email and by a refreshed in-app banner at
  14, 7, and 2 days before the target renewal.
- If the creator changes the price again before a member's target renewal, the
  older request is replaced and the 30 days start again from the new notice.
- Cutting a benefit of the tier uses this same notice and approval, not a
  silent edit.

Worked example. Notice goes out on 13 Oct to move 50k to 200k. The earliest
date the new price may be charged is 12 Nov.

| Member | Renewal | Days after the notice | Charge |
|---|---|---|---|
| A | 14 Oct | 1 | 50k, no approval |
| A | 14 Nov | 32 | 200k, only if approved; otherwise the membership ends |
| B | 10 Nov | 28 | 50k, no approval |
| B | 10 Dec | 58 | 200k, only if approved |
| C, new on 15 Oct | first payment | — | 200k at subscribe. The 30-day rule does not apply |

## When a debit fails

Soft and hard failures are different.

- **Soft** (insufficient funds, a temporary error, a timeout): state becomes
  `past_due`. Access stays. The proposed retry is day 1, day 3, and day 5
  after the due date. Those numbers are placeholders, not a decision.
- **Hard** (invalid or inactive GoPay, invalid token, suspected fraud): no
  retry. The member has to link GoPay again.
- When the retries are used up, state becomes `grace` (a proposed further 3
  days with a visible banner), then `expired`.
- A retry that succeeds extends the period from the **original due date**. It
  does not grant the failed days for free and it does not charge twice. State
  returns to `active`.
- An `expired` member sees the frozen view and a renewal CTA. Benefits already
  claimed stay valid. Unclaimed quota is lost.
- Retry spacing, grace length, and the number of attempts are configuration.
  Midtrans' own default (3 retries, one hour apart) is not this window.

Notices, each one logged:

- **H-3** before a debit: amount, date, and a cancel link, in-app and by email.
- A receipt after every successful debit.
- A failure notice on the first failed attempt, in plain language, with Fix
  payment. A final-attempt notice before access ends. An access-ended notice
  with a renewal CTA.
- Price-migration notices use both channels, as above. WhatsApp is a later
  channel for pre-debit and failure notices, not part of the first cut.

## What the member can do

Manage membership lists each active membership with price, next charge date,
payment method, status, and the actions below.

- **Cancel auto-renew** is one step. State becomes `cancel_at_period_end`.
  Access remains until the period ends, the end date is shown, and there is no
  refund by default.
- **Resume** before that end turns auto-renew back on. Nothing is charged
  until the due date.
- **Change the GoPay account.** The provider cannot swap the method on a live
  subscription, so Yapp replaces the subscription with a new one on the same
  due date. No gap and no second charge.
- **Downgrade** applies at the next renewal. The higher tier's benefits stay
  until then.
- **Upgrade** applies immediately. Whether the member pays the prorated
  difference now, or the full new price only at the next renewal, is not
  decided.
- Cancelling and subscribing again in the same period must not charge twice
  or grant the benefit quota twice.

## What the creator sees

The membership page counts active members, members at risk (`past_due`,
`grace`, `awaiting_approval`), expiring, and expired, plus recurring revenue
for the month.

## What ships in which cut

So a test does not expect the last cut on the first one:

- **V0:** linking, the snapshotted price, the renewal engine, receipts, the
  failure path with the default retry, and cancel. A small set of creators.
- **V1:** the H-3 reminder, the price disclaimer and grandfathering, Manage
  membership, and the creator counts.
- **V2:** price migration with approval, upgrade and downgrade, the unanswered
  reminders, and WhatsApp.
- Web and mobile web. No native-app-only path is specified.

## Still open

Do not fill these in from the one-off membership that is live today.

- Whether GoPay makes the member re-confirm a higher amount. If it does,
  approval and the GoPay confirm are one step.
- Upgrade pricing mid-period (prorate now, or full price next renewal).
- The real retry and grace numbers. Day 1/3/5 plus 3 days are placeholders.
- What happens when the member unbinds GoPay in the GoPay app, and how long a
  token lives.
- GoPay spending limits on a 3, 6, or 12 month amount.
- Whether the schedule runs in the Midtrans Subscription API or Yapp debits
  each cycle itself.
- Fees on a renewal, and on an Rp0 or discounted benefit order.
- A shared engine for Telegram and Discord memberships, or a separate one.
- The legal notice required for auto-renew.
- The refund window after an auto-debit, and the effect on claimed benefits
  and Group Chat.
- Product and engineering owners are not assigned.
