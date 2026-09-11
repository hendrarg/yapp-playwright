---
title: Discord and Telegram membership products
type: note
category: project
tags: [yapp, product, automation, membership-products]
project: yapp
created: 2026-09-04
updated: 2026-09-04
sources: 0
status: active
---

> **Obsidian:** [[projects/yapp/knowledge/index|Knowledge index]]

# Discord and Telegram membership products

Two **product types** sold from the shop like any other product —
`products.product_type` of `discord_membership` and `telegram_membership` — together
with the chat integrations behind them. Established in the Aug 2026 Telegram Membership
session.

These are **not** the creator's own subscription tiers; that is a different feature with
its own tables and routes, described in [[membership-tiers]]. General product mechanics
(pricing floor, thumbnails, status lifecycle) live in [[products]].

## Renewal reminders are expiry-anchored

Telegram renewal reminders are configured as three touchpoints pinned to the plan's
expiry date — **H-7 `Renewal is Coming Up`**, **H-3 `Last-Chance Nudge`**, and
**H+1 `Win-Back`** — each with a configurable button label, gated by
`telegramSendRenewalReminders`.

Because the anchor is the expiry date, **a Lifetime plan has no anchor at all**. Treat
that as a design question to confirm rather than an assumed exclusion.


## The bot permission surface is aggregate only

The Yapp form shows one combined status, `Bot is Ready to Manage Access` — there is
**no per-permission detail**, so individual bot permissions have no UI surface to read
from, even with a group whose permissions can be manipulated.

Everything on the Telegram side — pressing Start, token consumption, identity binding,
invite delivery, join-by-request, in-group mention fallback, bot confirmation — is
only observable from inside Telegram, so that surface needs either a real Telegram
account or API/webhook-level testing — the Yapp web app cannot show it.


## Lifetime tiers: how to make one, and why you still cannot finish the test

These are `product_telegram_tiers` — tiers **of a Telegram product**, not tier
memberships. Dev shipped none with `isLifetime: true`; **create one** instead of
treating Lifetime as untestable. `Duration` on a plan offers
`1 month / 3 months / 6 months / 12 months / **Lifetime**`, and a tier can be added
through `PUT /api/v1/shop/products/{uuid}` by appending to `telegramTiers`
(`isLifetime: true`, `durationMonth` omitted — it comes back `null`). Price it at
**Rp0** and the buyer checkout is a single `Pay Rp0` with no payment step, so a
subscriber row exists in a minute.

What that still does **not** give you is an *active* member: the new row sits at
`Pending join` (`joinedAt: null`), because going active needs a real Telegram account
to press Start on the bot and join the group. Everything phrased around an active
member — the `Lifetime` badge, manual removal, access loss — needs a QA Telegram
account the project does not currently have.

A `Pending join` **lifetime** row renders `START = Not joined yet`, `EXPIRY = —`,
`STATUS = Pending join`, with **no Lifetime marker in any column**; the only hint is the
plan name. The `Lifetime` status filter still returns `No subscribers found` — consistent
with the filter meaning *active* lifetime, so do not call it a defect until an active
lifetime member exists.


## Subscriber row actions

Per-row controls on `/telegram` are `Resync with Telegram`,
`Re-invite (fresh join link — also lifts a ban)`, and
`Ban (blocks rejoin even with time remaining)`. Useful behaviour: when an action is
unavailable the control's tooltip becomes the **reason**, e.g.
`Can't ban — subscriber hasn't joined the group yet`.


## Discord connection is sticky

The QA account is already connected (`Hendra's server`, role `Boss`). Disconnecting it
to test the unconnected state risks breaking the published Discord products and their
buyers' access. The unconnected state is reachable instead through the **create form**,
where the server list legitimately starts empty.

## A tier with subscribers cannot be deleted — and the UI does not say so

Established 2026-09-11 (M-83). `PUT /api/v1/shop/products/{uuid}` with the tier omitted
returns **HTTP 500** `cannot remove plan "<title>": it has existing purchases or
subscribers`, from the API directly and from the creator form alike. In the form the plan
block **disappears the moment you press remove**, and `Save Changes` then produces no
toast, no inline error and no navigation — the plan is silently still there on reload,
still on sale. There is also **no disable/archive control for a single plan**, so
"stop selling this plan" has no route at all short of deactivating the whole product.

## Telegram edit route and event vocabulary

The Telegram product is edited at **`/products/update/telegram-membership/{uuid}`** —
`telegram` and `telegram_membership` both 404 (compare the `appointment` slug trap in
[[products]]). Step `2/2` holds `Plan Configuration` with `Add Another Plan`.

The `/telegram` **Activity** tab filters on nine event types: `Joined`, `Left`,
`Kicked`, `Banned`, `Unbanned`, `Promoted`, `Demoted`, `Restricted`, `Unrestricted`.
`Kicked` and `Banned` are distinct, and the log names the actor (`By bot (expiry or
dashboard)` vs a creator's Telegram handle). Note the dashboard itself offers **no plain
remove**: the row actions are only `Resync with Telegram`, `Re-invite` and `Ban`, so a
dashboard-driven "manual removal" is really a ban.

## The buyer's bot deep link is per-order and readable without Telegram

After a Telegram-membership purchase the success page's `Open Telegram` button is backed
by **`GET /api/v1/orders/{orderId}/telegram/start-link`**, which returns
`{status, ready, startURL, botUsername}` — e.g.
`https://t.me/YappTestBot?start=b_<32 hex>`. The token is scoped to the order and is
**stable across repeated reads** (two calls three seconds apart returned the same
`b_…`), so it is a persistent per-purchase token rather than one minted per click.
Whether it is single-*use* is a Telegram-side fact and cannot be read from Yapp.

This endpoint is the cheap way to prove the purchase→deep-link half of the flow without
a Telegram account.
