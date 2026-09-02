# Tipping

Live-verified 2026-08-20 on `creators-dev` / `yapp-dev`, updated 2026-08-27 after the
Livestream refactor. The Tipping sheet's test cases assume a Quick Amount toggle and
a multi-step form that do not exist, so check this map before scoping a tipping TC.

## Creator configuration

The only configuration surface is **Customize → Tip Button**: one `Show Tip Button`
switch that mounts and unmounts the whole section, a tip-button label field (counter
40), three hex colour inputs, and **exactly 3 IDR + 3 USDT quick-amount slots**.

There is no Add or Remove control and **no Quick Amount toggle**, even though
`GET /api/v1/quick-amounts` carries `isEnabled` and the Save POST always sends
`isEnabled:true`.

## Fee split

Tip fees are a separate surface: **Settings → Payment & Fee** has a `Tips` block —
distinct from `Donations` — with a 4% platform fee split between Creator and Fans,
and a Fans/Creator radio for the payment-gateway fee. Buyer-visible fee measured
5.05% on QRIS and exactly 4% on USDT.

## Buyer tip form

`/<handle>/tip` is a **single page** with no Continue step. USDT swaps the payment
dropdown for `Connect Wallet`.

It embeds **Livestream-owned add-ons** — Minimum Alert, Text to Speech, VIP Queue,
Media (GIF / YouTube / TikTok / Voice Note), and a Vote block. Those belong to the
Livestream sheet, not Tipping; cross-reference rather than duplicating them. Media
types mirror the creator's Accepted media switches live, and both the media attach UI
and the VIP custom fields are **gated on the entered amount** — a "field is missing"
observation is usually an amount below the threshold.

See [livestream.md](livestream.md) for what those add-ons do.

## The platform minimum is Rp10.000, and it overrides everything below it

A tip under Rp10.000 is refused with `Minimum amount is Rp10.000` and the Subtotal is
held at `Rp0`. This floor sits above every creator-configured threshold, so **any
media floor or queue minimum a creator sets below Rp10.000 is dead on arrival** —
the number they typed can never be reached. The effective threshold is always
`max(configured floor, Rp10.000)`.

This is what makes "the promised threshold is not the enforced threshold" reports
recur: the buyer page prints the creator's figure while the platform floor is what
actually gates the control.

## USDT has no minimum

The Rp10.000 floor is enforced on the IDR path only. The USDT path accepts any amount,
so the platform minimum is bypassable by switching currency.

## Creator-side tip visibility

**Corrected 2026-09-02.** An earlier note here claimed the creator never sees who
tipped, based on looking only at Wallet and `/statistics`. That was wrong — it missed
`/analytics`.

- **Wallet history** shows tips as four columns only: `TYPE`, `AMOUNT`, `STATUS`,
  `DATE` — no sender, no notes, and the row does not open a detail.
- **`/analytics?tab=transactions`** has a dedicated **Tipping** tab under Performance
  Details, with the transaction table and `Export as CSV`. This is the real tip
  tracking surface.
- **`/statistics`** does not mention tipping at all — but that page is a separate,
  newer product, not a replacement for `/analytics`. See
  [[orders-and-reports]].

So any claim about what the creator can or cannot see about a tip has to be made
against `/analytics?tab=transactions`, not Wallet alone.

## The two note fields are not symmetric

On the buyer tip page both notes exist, and the placeholder is what states the
audience:

| Field | Placeholder | Limit |
|-------|-------------|-------|
| `Give Notes` | `Notes can be seen by public` | `maxlength=200`, counter `n / 200` |
| `Add Private Note` | `Notes can only be seen by creator` | **no maxlength, no counter** |

`Your Name or Nickname` also has no maxlength; `Your Email` renders disabled and
prefilled for a signed-in buyer.
