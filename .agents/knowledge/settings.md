---
title: Settings
category: project
tags: [yapp, product, automation, settings]
project: yapp
---

> [[projects/yapp/knowledge/index|Domain knowledge index]]

The creator Settings page at `/settings`. Live-verified 2026-09-02, after the sheet's
earlier test cases were retired as no longer matching the product.

## Two tabs, and only one of them touches the URL

`Payment & Fee` (default) and `Integrations`. Selecting Integrations rewrites the URL
to `/settings?tab=integrations` and that deep link works; the Payment tab carries **no**
query parameter at all.

**An unknown `?tab=` value leaves no tab selected.** `/settings?tab=bogus` renders the
tablist with nothing `aria-selected`, rather than falling back to the default tab.

## Fee Settings covers five monetisation types

`Digital Product Sales`, `Feeds`, `Tips`, `Donations`, `Lifetime Access` — five blocks
with an identical control set. Defaults on every one: platform fee **4%** split
`Creator 0% / Fans 4%`, gateway fee **paid by Fans**, so a `Received` of IDR 100.000
yields `Fans Pay 104.000` and `Creator Receive 100.000`.

**`Received` is a local calculator, not a setting.** Typing into it reformats with
thousand separators and recalculates the whole summary live (250.000 → fee 10.000,
Fans Pay 260.000), and fires **zero** non-GET requests. Nothing there is persisted.

**The split is display-only.** The `Set Platform Fee` button opens nothing on click and
nothing on hover, and the `Creator 0%` / `Fans 4%` badges are plain `div`s with no role
and `cursor: auto`. The creator cannot change the split here, despite the label and the
section copy ("Decide how the Transaction fee is split between you and your fans").

The `IDR` button beside each `Received` field looks like a currency dropdown — chevron
and all — but clicking it offers nothing.

## The gateway-fee choice auto-saves

There is **no Save button anywhere on the Payment & Fee tab**. Picking Fans or Creator
fires `POST /api/v1/accounts/fees/products` immediately, with no confirmation and no
unsaved-changes indicator. This is the opposite of the Tip Button config, which uses an
explicit Save (`TC-TIP-C-022`) — do not assume one pattern from the other.

**Testing trap:** because it writes instantly, any test that flips this control changes
the account's real fee configuration. Flip it back in the same run.

## Two more traps on this page

**The page hydrates in two passes.** A snapshot taken immediately after load can show
`Creator 0% / Fans 0%`, `Paid by Creator` and `IDR 0` before the saved values settle in.
Assert after hydration, not on first paint.

**`Payment Gateaway Fee` is misspelled** on the selector label, while the summary row
below spells it correctly as `Payment Gateway Fee`. Both appear five times on the page.

**The gateway radios have no usable accessible name** and render doubled — two
`role=radio` elements per option. The first block names them by repeating the label five
times (`Fans Fans Fans Fans Fans`); later blocks name them only `Selected` /
`Not selected`. Do not locate these by accessible name.

## Bank account

With none linked the section is an empty state: `Add Bank Account` plus "Payment access
requires a linked bank account. Connect yours to receive funds".

The dialog has three required fields — `Bank` (a native `select` listing **21**
Indonesian banks, from `BANK DIGITAL BCA` to `BANK JATIM`), `Account Name`, and
`Account Number` — and **no PIN field**. There is **no client-side validation at all**:
Account Number keeps letters, a single digit, 40 digits or mixed input, Account Name
keeps angle brackets, no message appears, and the submit button stays enabled even with
no bank chosen. Server behaviour is unverified — submitting creates a real payout
destination.

## Integrations: five, in two groups

**Apps** — Discord (role-based memberships), Google Calendar (appointments), **Telegram**
(paid group/channel access), **Instagram** (automate DMs from post comments).
**Growth & Tracking** — Facebook Pixel.

Telegram and Instagram had no test coverage before 2026-09-02.

Telegram shows the connected handle, a `Your chats` list with each group's type
(`supergroup`) and readiness (`Ready`), `Add group / channel`, `Remove group`, and a
four-step how-to. The bot needs **both** `Ban Users` and `Add Users / Invite via Link`
or the group reads "not ready".

Facebook Pixel's `Set Up` dialog takes `Pixel ID` (input) and `Pixel Access Token`
(**a `textarea`, not an input** — a query for `input` elements misses it). `Save` stays
disabled until both are filled.

`See what we track` is a three-step carousel: **Page View**, **Initiate Checkout**,
**Purchase**, the last step's button reading `Got it`.
