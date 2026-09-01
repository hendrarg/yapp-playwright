# Membership: Discord, Telegram, and tiers

Tier-based membership products and the two chat integrations. Established in the
Aug 2026 Telegram Membership session.

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

## Dev has no Lifetime tier

All **five** tiers across the three Telegram products carry `isLifetime: false`, and
the `Lifetime` status filter on the `/telegram` Subscribers table returns
`No subscribers found`. Any assertion about Lifetime behaviour needs such a tier to be
created first.

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

## No fixture account holds an active membership subscription

Checked 2026-08-31: token1 (`hendrarg` / QA Tester) is the creator of the membership
tiers, so it cannot subscribe to itself, and token2 (Sundanese) still shows
`Subscribe` on that profile. The buyer Library lists Discord and Telegram *membership
products*, which are a different thing from a creator membership subscription.

The practical consequence: **anything that needs a live subscription cannot be tested
today** — auto-renewal preference, renewal failure, tier upgrade or downgrade,
post-expiry access. There is also no auto-renewal control visible anywhere on the
buyer surfaces that do exist, but that is an absence observed without a subscription
in hand, not a confirmed product decision.

Seed a real subscription first, or expect these to stay blocked.
