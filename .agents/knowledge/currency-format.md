---
title: Currency format
category: project
tags: [yapp, product, automation, currency, formatting]
project: yapp
type: note
created: 2026-09-08
updated: 2026-09-09
sources: 0
status: active
---

> [[projects/yapp/knowledge/index|Knowledge index]]

# Currency format

How Yapp renders money, and why the same amount reads differently on the creator app
than on the buyer app. Established 2026-09-08 by sweeping every creator route and the
buyer feeds for `/\d,\d{2}(?!\d)/` in a live dev browser.

## Resolved on the creator app, 2026-09-09

**The `,00` is gone.** Re-swept all eight creator surfaces this note lists below and every
one now renders the buyer format — `/products` `Rp10.000` and `Rp587.146`, `/wallet`
`Rp16.963.243` / `Rp24.035` / `Rp16.867.243` / `Rp16.891.278`, `/membership` `Rp309.060`,
`/affiliate`, `/feeds`, `/profile`, `/analytics?tab=transactions`. Zero matches for
`(?:Rp|IDR)\s?[\d.]+,\d{2}` on any of them, and the `$960,73`-style USD figures on the
wallet cards are gone too.

So the standard agreed on 2026-09-08 — `Rp` + `.` thousands + no decimals — is what the
creator app now ships. Filed and verified on YAP-2130.

Still unconfirmed, keep as open questions:

- **USDT surfaces.** `Balance: 0,00USDT` and the placeholder `Minimum withdrawal 10,00USDT`
  could not be re-read, because the withdrawal dialog now stops earlier (see H-14).
- **The buyer event detail page**, which renders `IDR100,000 /per pax` rather than
  `Rp100.000`. Buyer-side, not covered by the creator sweep.

Everything below this section describes the state **before** the fix and is kept because
it names every surface that had to change.

## Creator renders 2 decimals, buyer renders 0 — same symbol, same separators

`Rp10.000` on the buyer app is `Rp10.000,00` on the creator app. Both use `Rp`, both use
Indonesian separators (`.` thousands, `,` decimal); the **only** difference is the
fraction digits. So this is a `minimumFractionDigits` / `maximumFractionDigits` split in
the formatter, not two different locales or two different currency helpers.

Verified 2026-09-08 on dev: buyer `/explore` renders `Rp1.000.000`, `Rp200.000`,
`Rp10.000`, `Rp0`; creator `/products` renders `Rp2.800.000,00`, `Rp180.000,00`,
`Rp10.000,00`, `Rp0,00`.

USD and USDT on the creator side carry the same comma decimal: `$960,73`, `$1,36`,
`Balance: 0,00USDT`, and the withdrawal placeholder `Minimum withdrawal 10,00USDT`
(see [[wallet]]).

## Target standard: the buyer format `Rp10.000`

Decided 2026-09-08 by the QA owner: **one format everywhere — `Rp` + `.` thousands +
no decimals** (`Rp10.000`, zero is `Rp0`). That means two changes on the creator side,
not one: drop the `,00`, **and** retire the `IDR 10,000` preview dialect. The USD/USDT
surfaces (`$960,73`, `0,00USDT`) carry the same comma decimal and need the same pass.

The buyer app is not fully uniform either — `tests/buyer/events-and-tickets.spec.ts`
asserts `IDR100,000 /per pax` on the event detail page, so that page speaks the preview
dialect too and has to be aligned with the rest of the buyer app.

Repo assertions were made **format-tolerant** the same day (`/(?:Rp|IDR)\s*12[.,]000/`
and friends) so they pass before and after the app change; tighten them to `Rp` only
once the app has shipped the standard.

## A third format exists inside the creator app: the live preview uses `IDR 10,000`

The creator app is not internally consistent either. The buyer-facing **live preview**
panes inside the product / tier editors render the *buyer* style with an English locale —
`IDR 150,000`, `IDR 12,000`, `IDR 10,000` (comma thousands, no decimals) — while the
list rows, cards and stats around them render `Rp150.000,00`. The tier form's own
validation message also speaks the preview dialect: `Price must be at least IDR 20,000`
(see [[membership-tiers]]).

Consequence for automation: a creator test that asserts a price must know **which**
surface it is reading. Existing assertions already encode all three dialects —
`previewPaidPricePattern: /Rp12\.000,00/` for the consultation preview,
`previewPricePattern: /IDR\s*150,000/` with `rowPricePattern: /Rp150\.000,00/` for the
same events ticket, and `/IDR 12,000/` for the membership preview.

## Where `,00` appears on the creator app

Full sweep of `creators-dev.yapp.ink`, 2026-09-08. Every hit below is a *display*
surface — no price **input** ever shows decimals; the amount fields are plain
thousand-separated text with placeholder `10,000`.

| Surface | Examples seen |
|---|---|
| `/products` cards | `Rp2.800.000,00`, `Start from Rp10.000,00`, price ranges `Rp50.000,00 – Rp100.000,00`, `Rp0,00` |
| `/products` card `Revenue:` line | `Revenue: Rp587.146,00` |
| `/products/stats/<id>` | `Rp542.146,00` next to the `100.0%` share |
| `/orders` → redirects to `/analytics?tab=transactions` | `Rp11.541.570,00` total, per-row `Rp22.500,00`, `1xRp25.000,00` |
| `/orders/<id>` detail | `Product Price Rp12.000,00`, `Platform Fee (Buyer pays) -Rp480,00`, `Payment Gateway Fee (Buyer pays) -Rp127,00` |
| `/analytics` (all tabs: Products, Tipping, Campaigns Activations, PPV, Membership, Lifetime Access) | same figures as the transactions tab |
| `/wallet` balance cards | `Rp16.963.243,09` / `$960,73`, `Rp24.035,24` / `$1,36` |
| `/wallet` `Your Assets` table | `Active`, `Pending`, `Total` columns all `,09` / `,24` / `,33` |
| `/wallet` history rows | `+Rp12.000,00`, `+Rp10.146,00` |
| `/wallet` Withdraw dialog | `Balance: 0,00USDT` |
| `/membership` tier cards | `Rp100.000,00 / 1 month`, `Rp50.000,00 / 3 month`, earnings `Rp309.060,00`, `Rp0,00` |
| `/feeds` post pills | `Exclusive Rp0,00`, PPV price on the post, and the modal's `Min. price: Rp20.000,00` |
| `/referral` | `Rp0,00` |
| `/affiliate` product rows | `Rp12.000,00 0% Rate`, `Rp750.000,00 0% Rate` |
| `/profile` (creator's own storefront preview) | `Start from Rp10.000,00`, `Rp25.000,00 – Rp250.000,00`, and discount pairs `Rp11.400,00 Rp12.000,00 5%` |

Clean at the time of the sweep — no `,00` anywhere: `/promotions` (redirects to
`/products?tab=promotions`), `/campaigns`, `/sessions`, `/settings`, `/streaming`,
`/customize`, `/messages`, `/membership/create`. Treat these as *empty-state* clean, not
format-clean: several of them had no priced rows on the QA account, and
[[livestream]] records `Rp0,00` on the streaming tip/media-share settings.

## Test data that hard-codes the decimals

If the app drops `,00`, these break:

- `src/test-data/creator/consultation.pricing.data.ts` — preview paid / zero price
- `src/test-data/creator/events.tickets.data.ts` — preview and product-row price
- `src/test-data/creator/membership.data.ts` — Discord membership preview price
- `src/test-data/creator/products.creation.data.ts` — digital product preview price and zero price

All five were rewritten to `/(?:Rp|IDR)\s*<amount>[.,]000/` on 2026-09-08, so they match
`Rp12.000,00`, `IDR 12,000` and the target `Rp12.000` alike. `src/helpers/creator/product-editor.ts`
matches `/Rp[\d.,]+/` and already survived either format.

Still format-locked and needing a decision when the app changes:
`src/test-data/buyer/events.detail.data.ts` and `tests/buyer/events-and-tickets.spec.ts`
pin `IDR100,000 /per pax`, and `src/test-data/creator/profile.data.ts` /
`src/test-data/buyer/profile.data.ts` hold tip **input** amounts (`15,000`) — those are
input format, not display, and are unaffected.
