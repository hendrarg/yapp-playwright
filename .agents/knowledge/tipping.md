---
title: Tipping
type: note
category: project
tags: [yapp, product, automation, tipping]
project: yapp
created: 2026-09-04
updated: 2026-09-28
sources: 0
status: active
---

> [[projects/yapp/knowledge/index|Knowledge index]]

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

## The profile inline panel's amount is a gateway, not a real entry — the tip page is where the minimum bites

Established 2026-09-28 (ruled expected, closed `M-50`). Do **not** read the profile inline
tip panel as the enforcing surface. On the profile panel a `0` / below-minimum amount is
accepted **only so the visitor can proceed to `/<handle>/tip`**; the value is **not carried
over** — the tip page opens with an empty amount field and its own validation (`Minimum
amount is Rp10.000` on IDR, held at `Rp0`). So "the panel accepted 0.01" is not a bypass: the
panel is a doorway, the page is the gate. A report that the panel took a sub-minimum value is
**expected**, because entering the page is not the same as submitting a tip. Verify the
minimum on `/<handle>/tip`, never on the profile panel preview.

## Switching currency and back retains the previous amount — this is intended

Established 2026-09-28 (ruled expected, closed `M-52`). On `/<handle>/tip`, entering an IDR
amount (e.g. `50000`), switching the currency tab to USDT, then switching **back** to IDR
**keeps the previously entered value and its Detail Transactions summary** (Subtotal
`Rp50.000`, Total with fee). The round-trip does not clear the field — value preservation is
the desired behaviour, so a "stale summary after currency change" report is **expected**, not
a bug. (Headless reads sometimes show the field momentarily empty while the summary still
holds the value — that is a timing artefact of the read, not a defect.)

## Quick-amount validation (TIP-8 / M-50, fixed — retested 1 Oct 2026)

Before the fix, `abc-12.5` saved as `-12` and rendered to buyers as a `-Rp12` chip. Now:

- **UI:** the minus is stripped while typing (`abc-12.5` → `1,250`), and Save with any IDR slot
  below Rp10.000 is refused with the toast `Each IDR quick amount must be at least Rp10.000` —
  no request is sent.
- **API:** `POST /api/v1/quick-amounts` rejects any amount ≤ 0 (IDR or USDT) with `400 invalid
  quick amount: amount must be greater than 0`. It still **accepts a positive below-minimum**
  value (`5000` → 200); only the UI enforces Rp10.000.
- **Buyer:** `/<handle>/tip` hides presets below the minimum — with a `5000` slot stored via API
  only the other two chips render.
- Payload shape: `{"isEnabled":true,"rules":[{assetID:1,amount}×3 (IDR), {assetID:2,amount}×3
  (USDT)]}` — all six slots in one POST, alongside `PUT /accounts/tip-button`.
- QA account quick amounts as of 1 Oct 2026: IDR 15.000 / 75.000 / 300.000, USDT 15 / 75 / 300.

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

## The Tip Button panel saves through two endpoints at once

Verified 2026-09-09 on `/customize` → `Tip Button`. The panel header carries `Undo`,
`Redo` and `Save`, all disabled on load — there is **no auto-save**. One press of `Save`
fires **both** `PUT /api/v1/accounts/tip-button` and `POST /api/v1/quick-amounts` (both
200), so a test that waits on a single request will miss half the write. No success toast
appears (consistent with L-70).

`Button Text` is `#tip-button-label` with `maxlength=40` and an `n/40` counter, and the cap
is hard — a 41st typed character does not enter.

**There is no colour picker.** The three hex fields — `#tip-button-text-color`,
`#tip-button-left-color`, `#tip-button-right-color` — are plain `type=text` inputs standing
alone: the page contains **zero** `input[type=color]` and the string "Choose color" appears
nowhere.

**Unsaved edits survive the section toggle.** Turning `Show Tip Button` off unmounts the
fields (`#tip-button-label` leaves the DOM) and turning it back on restores them with the
unsaved value intact, so the draft is held above the section.

## The buyer tip page limits only the public note

`/<handle>/tip` renders two note fields, and only one is capped: `Give Notes`
(placeholder `Notes can be seen by public`) has `maxlength=200` with an `n / 200` counter,
while `Add Private Note` (placeholder `Notes can only be seen by creator`) has **no
maxlength and no counter**. The audience of each is stated only in the placeholder.

## `isSupportPrivate` hides the supporter list — it is not a separate surface

Established 2026-09-22 while looking for the "PrivateSupport block" the inline-tip test
list assumes (A-04/A-05). **There is no Private Support page, panel, or block in the
product.** The flag controls whether the profile's **Support tab** (the supporter list)
is shown at all, and the tab's presence is what the flag governs:

| Creator | `is_support_private` | tips received | Support tab for a visitor |
|---|---|---|---|
| `yoms07`, `hendrarg` | false | yes | **shown** — supporter list renders |
| `iyansr2222` | true | **65** | **hidden** — no Support tab at all |
| `abc12`, `anggaecs2` | true | 0 / 1 | hidden |

So spotting this by counting tips is misleading: `iyansr2222` has 65 tips and still shows
no Support tab, because the flag suppresses it.

**There is no creator toggle for it.** `/settings` carries only Wallet, Payment & Fee,
Integrations and Bank Account, and `/customize` only Theme, Profile, Tip Button and
Domain — neither mentions privacy of support. The field therefore looks API/legacy-only,
which is why it cannot be found in the UI. Whether the creator themselves (owner view)
still sees their own supporters while the flag is on was **not** verified — no token for a
private creator was available; only the visitor view was checked.

## The Support tab exists only while the Tip Button is on — turning it off removes the supporter list too

Established 2026-09-22. The profile's **Support tab** is the whole support surface
(supporter list + inline tip panel); its presence is gated by **two** flags, and the
visitor sees nothing when either one is off:

| Creator | layout | `is_tip_button` | `is_support_private` | Support tab / Send Tip CTA |
|---|---|---|---|---|
| `yoms07` | default | true | false | **shown** |
| `iyansr2222` | default | true | **true** | hidden |
| `hendrarg` (after the 22 Sep toggle) | default | **false** | false | hidden |
| `miltonayler` | **simple** | false | false | n/a — the simple layout renders no support surface at all |

**A `simple`-layout creator is not evidence for this gating.** `miltonayler`
(`profile_layout_preference = 'simple'`) renders a landing-style page — banner, logo,
social links, a `Products` tab — and exposes **no tip/support surface regardless of the
flag**, so its missing Support tab says nothing about `is_tip_button`.

**On a default-layout creator, turning the Tip Button off hides the whole support surface**
— not only the tip form. Verified 2026-09-22 by toggling `hendrarg` (default layout, 73
received tips) to `is_tip_button=false`: tabs become `Shops/Links/Feeds/Membership` with
**no Support tab, no `Send Tip` CTA, no tip panel and no supporter rows** on desktop or
mobile, and everything returns when the flag is set back to true. **This is the intended
behaviour, not a defect** — the inline-tip test list's A-02, which expected the supporter
list to remain "exactly as before the refactor", is the thing that was wrong and has been
corrected. The creator dashboard `/customize → Tip Button → Show Tip Button` switch is what
flips `is_tip_button`.

**The list is also missing on mobile even with the Tip Button ON** (same date, measured on
`hendrarg`, tip on): desktop shows the Support tab as a 3/5 + 2/5 split — left column the
supporter list (10 rows), right column the inline tip panel — while at 390×844 the Support
tab carries **only the tip form**. The supporter rows are not merely hidden by CSS: no
`sent Rp…` node exists in the mobile DOM at all, so the list is never rendered at that
breakpoint. Tracked as `TIP-5` (`TC-TIP-B-086` / A-03).
