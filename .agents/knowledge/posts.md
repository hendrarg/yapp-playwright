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

**Re-checked 2026-10-06 (composer flow changed):** choosing `Pay per view` in the visibility menu
now opens the `Price` dialog **straight away** ("Pay per view price", `Min. price: Rp10.000`); `Edit
Price` remains as a menu item for later edits. The input is `type=text inputmode=numeric`: letters
are stripped (`12a34` → `1,234`), a minus sign is kept (`-5,000`), and `Confirm Rp <n>` is enabled
only from 10.000 up (empty, 0, negative, 9.999 all disabled). **After Confirm the visibility menu
stays open**, which keeps the `Create Post` dialog `aria-hidden` — role queries for the composer
fail until the menu is closed (Escape, sent only once the Price dialog has finished closing).
The pill then reads `Exclusive Rp10.000`. Publishing is `POST /api/v1/posts` with
`visibility: pay_per_view` and the price. Creator page object: `FeedsPage.publishPost()`.

**The server enforces nothing.** `POST /api/v1/posts` with
`{visibility:"pay_per_view", price:0}` or `price:5000` returns `200 Post created`,
and `PUT` happily lowers an existing PPV post to `price: 0`. That is where Rp0 PPV
fixtures come from — and why the rule cannot be called server-side.

**With price still Rp0 the `Post` button is enabled, and pressing it now explains why it does
nothing** (re-checked 2026-10-06): a toast `Price must be greater than 0 for exclusive posts`
appears at the top of the page — outside the dialog, so a check that only reads the dialog
text misses it — no request is sent, and the composer stays open. (Until September it was
silent: zero requests, no toast, no inline error.) Publishing really is blocked.

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

**Turning the `Lifetime access` switch off writes a price of zero** — `PUT
/api/v1/posts/lifetime-prices/me` with `{"priceIDR":0}`; the `post_lifetime_prices` row is
never deleted and there is no active/inactive flag. **H-04 is fixed (re-checked 2026-10-05):**
at price 0 the buyer profile no longer shows the lifetime banner or `Unlock now`, while
single-post `Unlock Post` stays. `GET /api/v1/posts/lifetime-prices/{creatorUuid}` (or `/me`)
reads the current price.

**Where the buyer meets it:** the creator profile's Feeds tab shows the banner `Get all the
exclusive content lifetime with just one tap!` with `Unlock now`. That opens dialog
`Lifetime Access` — phone number only (prefilled from the buyer's account, and the field then
refuses typing), payment methods, voucher, fee breakdown (Rp15.000 → fee Rp150 + PG Rp152 →
`Pay Rp15.302`). Paying goes to `/transaction/<orderId>` and `depositWebhook` settles it like
a PPV order; afterwards every current **and future** PPV post of that creator reports
`isPurchased: true` and appears in the buyer's Exclusive tab.

**The banner is cached ~1 minute.** It is driven by `GET /api/v1/lifetime-prices/{username}/check`
(`isSet`) plus `GET /api/v1/posts/lifetime-prices/{creatorUuid}/has-bought`; after a price change
`isSet` lagged 36–62 s (measured 2026-10-05). Poll it (`waitForLifetimeOffer`) before asserting UI.

**The `Lifetime Access` checkout never names the creator** — only phone, payment method, voucher
and price (TC-FE-B-052 expects creator info; AUT-FE-020 runs under `test.fail()` until L-78 (F&E-12) is fixed).
The order page is `/lifetime/transaction/<orderId>`. A settled order shows dialog
`Payment Successful!` naming the creator with an `Exclusive` pill — it must be closed, or it
covers the next page. An order whose row is `status = 'expired'` shows dialog `Payment Failed`
("We couldn't complete your payment.", `Try Again` / `Back to Checkout`); only moving
`expired_at` into the past is not enough. `dbFixtures.failLifetimePayment(orderId)` does both.
Purchase statuses seen: `pending`, `completed`, `expired`.

**A lifetime purchase is permanent** (`post_lifetime_purchases`, no refund API) and would
unlock every PPV post that other tests expect locked. Tests that buy one revoke it with
`dbFixtures.retireLifetimePurchases(buyer, creator)` (sets `deleted_at`; access is gone
immediately), which needs `YAPP_DB_FIXTURES=1`.

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
At narrow widths only the **active** tab keeps its label — the inactive ones are bare icons
with no accessible name, so `getByRole('button', { name: 'Links' })` finds nothing there.
The selected tab is marked by `data-state="active"` (Radix); the old `primary-text-color`
class is gone (re-checked 2026-10-05).

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

**Text-only PPV posts never show `Unlock Post`** (verified 2026-10-05): with no media to
blur, the body stays readable and the post detail offers only `Unlock post to add comments`
and `Unlock Now`. Seed an image PPV post whenever a test needs the `Unlock Post` gate.

`Unlock Now` (on the preview or the post detail — both render one, so a bare
`getByRole('button', { name: 'Unlock Now' })` is a strict-mode violation) opens the payment
dialog `Unlock Exclusive Post` (accessible name via `aria-labelledby`): Contact Information
with `Name`, `Email` (prefilled) and `Enter phone number`, payment methods QRIS /
CREDIT CARD / VA BRI / EWALLET SHOPEEPAY, `Redeem Voucher`, Detail Transactions and a
`Pay Rp<price>` submit button. Paying navigates to `/transaction/<orderId>`; settle it with
`depositWebhook`.

## Buyer /feeds: the Exclusive tab appears only after a purchase

On the buyer `/feeds` page the `Exclusive` tab (next to `Following`) is **hidden until the
buyer owns at least one exclusive post** (verified 2026-10-05: the buyer account with zero
purchases had no tab; the creator account with seven did). It lists
`GET /api/v1/posts/explore?type=exclusive&isPurchasedOnly=true` — purchased pay-per-view
posts only. A test that needs the tab must buy a seeded PPV post first.

There is **no plus / Follow quick action on a creator's avatar** in the feed, on `/feeds` or
`/explore`, desktop or mobile (checked 2026-10-05, clarification CL-AUT-012). Follow and
Unfollow live on the creator profile page only.

## The buyer "Exclusive badge" is an unnamed pink lock pill

Verified 2026-10-05: a pay-per-view post carries a small pink-to-purple gradient pill with a
white lock icon right after the timestamp, on the feed card **and** the post detail. It has no
text and no accessible name — the only hook is the gradient class (`from-[#FF0090]`). There
is no word "Exclusive" anywhere on the buyer card.

## Screenshot protection is a dialog on the Exclusive tab

On the buyer `/feeds` Exclusive tab, pressing `PrintScreen` (also Ctrl/Meta+Shift+S,
Meta+Shift+3/4) opens dialog `Screenshot not allowed` — "This content is protected. Please
respect creator rights." — with `I Understand` and `Close`. The Following tab does not react.
The copy does **not** mention legal action (clarification CL-AUT-013).

## Updating a post via API replaces its assets

`PUT /api/v1/posts/{uuid}` takes the create payload and **replaces** the asset list: send the
original upload id as `assets[].url` to keep the media. The signed URLs a GET returns are
silently dropped, leaving the post with no media (helper `updatePost`).

## Every control on the feed is an unlabelled icon

Verified 2026-09-09 while trying to script this area: the post row action buttons and all
four composer attachment buttons expose **no accessible name** — no text, no `aria-label`,
only a lucide `svg` class. Locating them needs either real `data-testid` hooks or a
browser-verified role scope from `generate-locators-mcp`; blind DOM heuristics do not
reach the post action menu at all.

## Comments: Edit (for one minute) and Delete, only on your own

Verified 2026-09-09 with two buyer accounts on one public post; **Edit added and re-verified
2026-10-05** (the 09-09 "Delete only, no Edit" is superseded).

- The comment thread lives on the **post detail page, `/post/{uuid}`** — reachable by
  clicking the post card. The comment-count button on the feed row opens nothing, so
  navigate to `/post/{uuid}` directly in a script.
- The composer is a textbox named `Write your comment` (placeholder `Write your comment
  here...`) with a `Post` button that stays disabled while the box is empty; a comment
  appears immediately (`POST /api/v1/posts/{uuid}/comments` `{postUUID, content}`).
- **Your own comment** carries one control, `aria-label="Open comment actions"`. Its popover
  is a `dialog` (not a menu) with two **buttons**, `Edit` and `Delete`.
- **Edit loads the comment into the same `Write your comment` box** and swaps the composer
  buttons for `Cancel editing` + `Save` (`PUT /api/v1/posts/comments/{id}`). **It only works
  within one minute of posting** — later, Save shows the toast `Comments can only be edited
  within 1 minute of posting.` and the text does not change. A test must edit right after
  posting, or seed the comment and edit it inside the window.
- **Delete asks first**: a dialog `Delete this comment?` / `Once you delete it, there's no
  turning back!` with `Cancel` and `Delete` (`DELETE /api/v1/posts/comments/{id}`).
- **Another buyer's comment carries no control at all**: no kebab, no menu, nothing to
  click. Authorization is enforced by not rendering, so a test should assert the absence
  of the button rather than an error message.
- Like is `button "Like post"`, which becomes `"Unlike post"` once liked; the count is the
  `p` right after it. `GET /api/v1/posts/{uuid}` returns `likeCount`, `commentCount` and
  `likedByMe` — the source of truth for an engagement-count assertion.

## Linked products on a post

Verified 2026-10-05 with API-seeded products (`productUuids` on `POST /api/v1/posts`):

- The feed card shows only `View Products (n)`; the post detail lists each product as a chip
  — thumbnail (`img alt` = product title), title, price written `Rp15,000` (comma, unlike the
  product page's `Rp15.000`). Chips have no role and no link; clicking the title navigates to
  `/<creator>/product/<shortId>`, whose `Purchase` opens checkout.
- A post with no products shows neither the label nor any chip.
- A **deleted** product drops out (`View Products` count and chips both exclude it).
- **An `inactive` product is still shown** — counted in `View Products (n)`, rendered as a
  chip, and clicking it lands on `That page doesn't exist`. Contradicts TC-FE-B-050; AUT-FE-019
  runs under `test.fail()` until M-60 (F&E-11) is fixed.
- No API changes a product's status; seed an inactive one with `status: 'inactive'` on create.

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

## Buyer image preview and gallery

Tapping a feed image (`Open post media`, one per tile) opens dialog `Post image modal` at
**the tapped image**. Desktop has `Previous image` / `Next image` buttons (ArrowLeft/Right
work too); mobile instead shows a `1/3` counter and swipes. The image is `object-fit:
contain`. **There is no zoom on desktop** — wheel, Ctrl+wheel, click and double-click change
nothing, and no pinch/zoom wrapper exists (clarifications CL-AUT-014/015). Images are served
via `/_next/image?url=…`; compare the file name inside `url` to tell gallery images apart.
`createPost({ imagePaths: [...] })` seeds a gallery.

## Buyer video playback

A video post autoplays **muted and inline** on the post detail. Tapping it opens a
full-screen modal (`document.fullscreenElement` becomes `<html>`, not the `<video>`), and
`Escape` exits back to the originating post. **Re-checked 2026-10-05: the controls bug (M-12, earlier noted as
M-21) looks fixed.** The modal's `<video>` now has `controls = true`; a click pauses it,
`Space` resumes, and programmatic `currentTime` writes (forward and back) stick. The modal
buttons are `Close modal` and `Like post`. Feed scroll position survives open + `Escape`. The creator-side card, by
contrast, does render `Play 00:00 00:30 Mute Enter fullscreen`.
