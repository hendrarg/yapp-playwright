---
title: Posts and feeds
type: note
category: project
tags: [yapp, product, automation, posts]
project: yapp
created: 2026-09-04
updated: 2026-09-09
sources: 0
status: active
---

> [[projects/yapp/knowledge/index|Knowledge index]]

# Posts and feeds

Creator post composition, visibility tiers, and pay-per-view pricing.

## Visibility tiers

`Create Post` carries a visibility pill with three values — **Public**, **Pay per
view**, **Member only** — mapping to the API's
`public | pay_per_view | membership_only`.

Post payload shape:

```json
{"content": "", "status": "active", "visibility": "public",
 "assets": [], "productUuids": [], "price": 0, "isFlexiblePrice": false}
```

`POST /api/v1/posts` creates, `PUT /api/v1/posts/{uuid}` edits, and
`DELETE /api/v1/posts/{uuid}` cleans up (a later GET returns 404).

## Pay-per-view pricing

Established 2026-08-19 while re-checking a defect claiming Rp0 PPV posts could be
published.

**The price control is one level down, not a field in the composer.** Picking
`Pay per view` flips the pill to read `Exclusive Rp0,00`. The price is set through an
**`Edit Price` menu item inside that same visibility dropdown**, which opens a second
modal.

**The client enforces the Rp20.000 minimum precisely.** The price modal shows
`Min. price: Rp20.000` and its `Confirm` button is disabled for empty / 0 / 1 / 5.000
/ 19.999 and enabled at 20.000 / 25.000 — identical on create and edit, so there is
no UI bypass.

**The server enforces nothing.** `POST /api/v1/posts` with
`{visibility:"pay_per_view", price:0}` or `price:5000` returns `200 Post created`,
and `PUT` happily lowers an existing PPV post to `price: 0`. That is where Rp0 PPV
fixtures come from — and why the rule cannot be called server-side.

**With price still Rp0 the `Post` button is enabled but inert:** zero requests, no
toast, no inline error, no `aria-invalid`, and the dialog stays open. Publishing
really is blocked; the creator simply is not told why. Do not read "button enabled"
as "action succeeded" — press it and read the resulting request.

## The feed composer is looser than the product forms

Verified 2026-08-31. Open it from the `Post something here...` area on `/feeds`; the
`Post` button in the header does not open it.

**Media accept is wider than anywhere else in the product**:
`image/jpeg,image/png,image/gif,image/webp,image/bmp,image/svg+xml,video/*`, multiple
allowed. Product thumbnails accept only jpeg/png/gif/webp, so **BMP and SVG are
composer-only** — worth flagging separately, since SVG can carry script.

**The post body has no `maxlength` and no counter**, and there is no separate title
field. The composer shows no copy about file size, media count, or video duration.
`Post` stays disabled until there is content.

## Lifetime unlock: the floor moved to Rp10.000, and "off" means price 0

**Corrected 2026-09-09.** `Configure Lifetime` on `/feeds` now states
`Min. price: Rp10.000,00` — the same floor as ordinary products, not double it as this
note previously recorded. The number is enforced, not decorative: `Save` stays disabled
at 5.000 and 9.999 and enables from 10.000 upward.

**Turning the `Lifetime access` switch off does not disable anything — it writes a price
of zero.** Saving with the switch off sends `PUT /api/v1/posts/lifetime-prices/me` with
`{"priceIDR":0}`; the `post_lifetime_prices` row is never deleted and there is no
active/inactive flag. The creator UI then shows the switch off with an empty price, which
looks right — but the buyer still sees the lifetime banner and `Unlock now`, and the
checkout opens at **Price Rp0, Total Rp0, with `Pay Rp0` enabled**. Filed as H-04;
whether paying Rp0 actually grants access is deliberately untested.

The buyer-facing price itself works correctly when lifetime is on: the `Lifetime Access`
checkout shows the saved price with its fee breakdown (Rp99.999 → fee Rp1.000 + PG
Rp1.010 → total Rp102.009), and editing the price propagates — **but only after a page
reload**; a read taken immediately after Save still returns the old figure.

## Exclusive is a filter, not a profile tab

There is no top-level Exclusive tab: exclusive posts are reached through the
`All Feeds` / `Exclusive Only` filter **inside** the Feeds tab. That holds at every
viewport width.

**The rest of the tab list is responsive, so pin a viewport before asserting it**
(measured 2026-09-09): at 1440, 1100 and 900 a buyer sees four tabs — `Shops`, `Links`,
`Feeds`, `Support` — with Membership rendered as a right-hand sidebar panel. At 700 and
480 the panel becomes a fifth tab and the list reads `Shops`, `Links`, `Feeds`,
`Membership`, `Support`. The earlier five-tab note was correct only for the narrow case.

**The creator side has no Exclusive view at all.** `/feeds` offers exactly three tabs —
`Published`, `Draft`, `Scheduled` — and exclusive posts sit among the public and
member-only ones, marked only by a pink lock icon (member-only posts carry a
`Member Only` pill instead). The post cards show no price and no sales count, and the
chart icon on a row navigates to `/statistics` rather than opening per-post insights.

## A locked post shows its price in a preview dialog

From the buyer side, `Unlock Post` on a locked post opens an `Exclusive Content Preview`
dialog carrying the post title, `Purchase to unlock the full content`, an `Unlock Now`
button and the PPV price (verified at Rp60.000). Member-only posts render
`Subscribe to Unlock` instead. The price is not printed on the feed card itself.

## Every control on the feed is an unlabelled icon

Verified 2026-09-09 while trying to script this area: the post row action buttons and all
four composer attachment buttons expose **no accessible name** — no text, no `aria-label`,
only a lucide `svg` class. Locating them needs either real `data-testid` hooks or a
browser-verified role scope from `generate-locators-mcp`; blind DOM heuristics do not
reach the post action menu at all.

## Comments: Delete is the only action, and only on your own

Verified 2026-09-09 with two buyer accounts on one public post.

- The comment thread lives on the **post detail page, `/post/{uuid}`** — reachable by
  clicking the post card. The comment-count button on the feed row opens nothing, so
  navigate to `/post/{uuid}` directly in a script.
- The composer is `Add a comment...` with a `Post` button; a comment appears immediately.
- **Your own comment** carries one control, `aria-label="Open comment actions"`, and its
  popover offers **`Delete` only — there is no Edit**.
- **Another buyer's comment carries no control at all**: no kebab, no menu, nothing to
  click. Authorization is enforced by not rendering, so a test should assert the absence
  of the button rather than an error message.
