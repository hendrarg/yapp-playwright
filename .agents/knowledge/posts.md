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

**The client enforces the minimum precisely — and that minimum is now Rp10.000.**
Re-read 2026-09-10: the price modal says `Min. price: Rp10.000` (it said Rp20.000 when
this note was first written). Its `Confirm` button is disabled below the floor and
enabled above it — identical on create and edit, so there is no UI bypass.

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

## The composer cannot publish anything that is not Public

Established 2026-09-10 across six separate attempts; filed as H-05.

Choosing **`Pay per view`** (price set and `Confirm`ed, pill reading `Exclusive Rp25.000`)
or **`Member only`** (tier chosen and `Confirm`ed) leaves `Post` enabled but completely
inert: **no `POST /api/v1/posts`, no toast, no dialog, no `aria-invalid`, no console or
page error**, and the dialog stays open with the content intact. Nothing is saved —
not to Published, not to Draft, not to Scheduled.

The control that proves it is not a scripting artefact: the identical flow with
visibility left **Public** publishes every time (text, text + 3 images, text + video,
text + image + linked product all returned `200 Post created`), and the failing runs
included one driven entirely by real mouse clicks and real keystrokes.

Two things still work, so scope the bug narrowly:

- `POST /api/v1/posts` with `visibility: "pay_per_view"` succeeds from the API — that is
  how exclusive fixtures have to be seeded now.
- **Editing** an existing exclusive post works: kebab → `Edit` → change the body →
  `Save` sends `PUT /api/v1/posts/{uuid}` → `200 Post updated`.

## The exclusive "teaser" is just the post body

There is **no dedicated teaser field**. On a locked pay-per-view post a non-buyer sees
the full body text and the linked-product card, with only the **media blurred** plus
`Unlock Post` / `Unlock Now`. The feed card for the same post shows `View Products (1)`.
So the teaser is whatever the creator typed into the body — anything confidential put
there is exposed.

## Editing a published post: what the dialog offers

Kebab on a feed card → `Insights`, `Edit`, `Delete`. `Edit` opens an **`Edit Post`**
dialog carrying the body, one `x` per media thumbnail, the media and product toolbar
icons, the visibility pill and `Save`. Verified 2026-09-10:

- **Removing a media item** fires `DELETE …/assets` (`Asset deleted`) immediately, then
  `Save` sends `PUT` — 3 images → 2, and the survivors stay on the post detail.
- **Replacing media** is remove + upload in the same dialog; the asset uuid changes and
  the buyer surface serves the new file (checked by downloading it — the pixels changed
  from blue to green).
- **Products** can be added and removed after publication; the post uuid is unchanged, so
  no duplicate post is created, and the buyer sees the card appear/disappear.
- Editing a **scheduled** post's time works through the `Posting on …` chip at the top of
  the same dialog.

## Scheduling

The composer's fourth toolbar icon (a clock, `size-5.5`) opens a calendar plus two
`type="tel"` inputs (`name="12hours"`, `name="minutes"`) and an **AM/PM Radix Select**
(`button[role="combobox"]`, not a toggle — click it and pick from the `[role=option]`
list). Once a time is chosen the submit button becomes **`Schedule Post`** and the
composer shows `Posting on 10 Sep 2026, 4:22 PM`.

**Auto-publish works.** A post scheduled for 09:22Z was in the `Scheduled` tab at 09:29Z
and had moved to `Published` by then, visible on the buyer's post detail and in the
public feed. `GET /api/v1/posts/my/posts?type=scheduled|published|draft` is the quick way
to watch the transition.

The `Scheduled` tab card labels a future schedule `Posted on …` (past tense) while the
composer and the edit chip both say `Posting on …` — filed as L-20.

## Buyer video playback

A video post autoplays **muted and inline** on the post detail. Tapping it opens a
full-screen modal (`document.fullscreenElement` becomes `<html>`, not the `<video>`), and
`Escape` exits back to the originating post. Inside that modal the only buttons are
`Unmute video`, `Close modal` and `Like post` — **no play/pause, no seek bar, no exit
button**, `video.controls` stays `false`, `Space` and `ArrowRight` do nothing, and even a
programmatic `currentTime` write is reverted. Filed as M-21. The creator-side card, by
contrast, does render `Play 00:00 00:30 Mute Enter fullscreen`.
