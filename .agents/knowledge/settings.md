---
title: Settings
category: project
tags: [yapp, product, automation, settings]
project: yapp
type: note
created: 2026-09-04
updated: 2026-09-09
sources: 0
status: active
---

> [[projects/yapp/knowledge/index|Knowledge index]]

# Settings

The creator Settings page at `/settings`. Live-verified 2026-09-02, after the sheet's
earlier test cases were retired as no longer matching the product.

## Two tabs, and only one of them touches the URL

`Payment & Fee` (default) and `Integrations`. Selecting Integrations rewrites the URL
to `/settings?tab=integrations` and that deep link works; the Payment tab carries **no**
query parameter at all.

**An unknown `?tab=` value leaves no tab selected.** `/settings?tab=bogus` renders the
tablist with nothing `aria-selected`, rather than falling back to the default tab.

## Fee Settings covers five monetisation types

`Digital Product Sales`, `Feeds`, `Tips`, `Donations`, `Lifetime Access` â€” five blocks
with an identical control set. Defaults on every one: platform fee **4%** split
`Creator 0% / Fans 4%`, gateway fee **paid by Fans**, so a `Received` of IDR 100.000
yields `Fans Pay 104.000` and `Creator Receive 100.000`.

**`Received` is a local calculator, not a setting.** Typing into it reformats with
thousand separators and recalculates the whole summary live (250.000 â†’ fee 10.000,
Fans Pay 260.000), and fires **zero** non-GET requests. Nothing there is persisted.

**The split is display-only.** The `Set Platform Fee` button opens nothing on click and
nothing on hover, and the `Creator 0%` / `Fans 4%` badges are plain `div`s with no role
and `cursor: auto`. The creator cannot change the split here, despite the label and the
section copy ("Decide how the Transaction fee is split between you and your fans").

The `IDR` button beside each `Received` field looks like a currency dropdown â€” chevron
and all â€” but clicking it offers nothing.

## The gateway-fee choice auto-saves

There is **no Save button anywhere on the Payment & Fee tab**. Picking Fans or Creator
fires `POST /api/v1/accounts/fees/products` immediately, with no confirmation and no
unsaved-changes indicator. This is the opposite of the Tip Button config, which uses an
explicit Save (`TC-TIP-C-022`) â€” do not assume one pattern from the other.

**Testing trap:** because it writes instantly, any test that flips this control changes
the account's real fee configuration. Flip it back in the same run.

## Two more traps on this page

**The page hydrates in two passes.** A snapshot taken immediately after load can show
`Creator 0% / Fans 0%`, `Paid by Creator` and `IDR 0` before the saved values settle in.
Assert after hydration, not on first paint.

**`Payment Gateaway Fee` is misspelled** on the selector label, while the summary row
below spells it correctly as `Payment Gateway Fee`. Both appear five times on the page.

**The gateway radios have no usable accessible name** and render doubled â€” two
`role=radio` elements per option. The first block names them by repeating the label five
times (`Fans Fans Fans Fans Fans`); later blocks name them only `Selected` /
`Not selected`. Do not locate these by accessible name.

## Bank account

With none linked the section is an empty state: `Add Bank Account` plus "Payment access
requires a linked bank account. Connect yours to receive funds".

The dialog has three required fields â€” `Bank` (a native `select` listing **21**
Indonesian banks, from `BANK DIGITAL BCA` to `BANK JATIM`), `Account Name`, and
`Account Number` â€” and **no PIN field**. There is **no client-side validation at all**:
Account Number keeps letters, a single digit, 40 digits or mixed input, Account Name
keeps angle brackets, no message appears, and the submit button stays enabled even with
no bank chosen. Server behaviour is unverified â€” submitting creates a real payout
destination.

## Integrations: five, in two groups

**Apps** â€” Discord (role-based memberships), Google Calendar (appointments), **Telegram**
(paid group/channel access), **Instagram** (automate DMs from post comments).
**Growth & Tracking** â€” Facebook Pixel.

Telegram and Instagram had no test coverage before 2026-09-02.

Telegram shows the connected handle, a `Your chats` list with each group's type
(`supergroup`) and readiness (`Ready`), `Add group / channel`, `Remove group`, and a
four-step how-to. The bot needs **both** `Ban Users` and `Add Users / Invite via Link`
or the group reads "not ready".

Facebook Pixel's `Set Up` dialog takes `Pixel ID` (input) and `Pixel Access Token`
(**a `textarea`, not an input** â€” a query for `input` elements misses it). `Save` stays
disabled until both are filled.

`See what we track` is a three-step carousel: **Page View**, **Initiate Checkout**,
**Purchase**, the last step's button reading `Got it`. Those three events are sent
**server-side** â€” no Facebook script ever loads in the buyer's browser (see
[[products#Meta Pixel per product (18 Sep 2026)]]).

Once saved (verified 18 Sep 2026) the block reads `Connected` / `Your Facebook Pixel is
active and tracking events.` and **prints the Pixel Access Token back in full, unmasked**,
next to the Pixel ID. Values land in `user_third_party_settings.meta_pixel_id` /
`meta_pixel_token` in plaintext.

`Disconnect` opens a confirm dialog whose body is **the wrong copy**: *"This will
permanently disconnect Hendra's server from your account"* â€” the Discord/Telegram server
wording reused for the pixel, with the creator's first name interpolated. Confirming does
clear both columns to `NULL`. A product that kept its own pixel is unaffected; the two
levels are stored and cleared independently.

## QA Meta Pixel credentials (18 Sep 2026)

For server-side Conversions API testing on creators-dev / yapp-dev:

- **Pixel / Dataset ID:** `1543489844474078`
- **Name in Events Manager:** Yapp QA test
- **Business:** Don Studio (user is Admin there — required to generate CAPI token)
- **Do not store the access token in this vault.** Generate or copy from Events Manager / the Connected block in Yapp Settings when needed. Yapp currently displays the saved token unmasked in Settings.

Older pixel `1606260884379085` (Yapp testing) could not generate a Conversions API token for this account — Meta requires **business portfolio Admin** for manual CAPI setup (`Mulai` disabled).

