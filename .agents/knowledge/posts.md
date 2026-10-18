---
title: Posts and feeds
type: note
category: project
tags: [yapp, product, automation, posts]
project: yapp
created: 2026-09-04
updated: 2026-10-15
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

**Re-checked 2026-10-08 (F&E-14): the two composers now disagree.** The dev lowered the PPV
floor on purpose. The **landing composer** (`yapp-dev/feeds` → `Your Post`, a `Write something
here...` textarea with a `Public` visibility button) says `Min. price: Rp1`: 0 keeps `Confirm`
disabled, while 1 and 5.000 enable it and publish (`200 Post created`, toast `Post created
successfully`). There, a typed minus sign is stripped (`-5000` → `5.000`). The **creator
dashboard composer** (`creators-dev/feeds`) still says `Min. price: Rp10.000` and disables 1,
5.000 and 9.999. On the server, price ≥ 0 is accepted, and a negative price is rejected with
**500** `price is required and must be >= 0 when isFlexiblePrice is false` (a 500, not a 4xx).
Wrong-path calls (`{API}/posts` without `/api/v1`) answer `403 not allowed to access this API`,
which looks like an auth failure but is not one.

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

**The `Lifetime Access` checkout names the creator** (F&E-12 / L-78 fixed, verified 2026-10-15): a
header with avatar initials, display name (`Asep pisan`), `@<username> · Unlock all posts` and the
price on the right (filled after `POST /posts/lifetime-prices/purchase/estimation/fiat`), white text
on the dialog's `rgb(15,23,42)`. AUT-FE-020 no longer runs under `test.fail()`.
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
- An `inactive` product is hidden as well. This was fixed 2026-10-09 (F&E-11, be#383): `FindByPostID`
  now also requires `status = 'active'`, and AUT-FE-019 asserts `View Products (1)` with no
  `test.fail`. The link row survives, so a reactivated product reappears. Side effect: the
  creator's edit-post form no longer prefills an inactive linked product, so re-saving the post
  drops that link.
- No API changes a product's status; seed an inactive one with `status: 'inactive'` on create.

## Creator composer: products, editing, lifetime dialog (verified 2026-10-06)

- **Linked products:** the composer toolbar's product button opens dialog `Select Product` — one
  `<label>` per product (thumbnail `img alt` = title) with a checkbox, plus `Select All` and
  `Add (n) Product(s)`. The chosen products appear in the composer and are sent as `productUuids`.
  Attach them **before** the image: an attached image adds its own `×` button and shifts the
  icon-only toolbar buttons.
- **Editing:** each post card's `…` menu offers `Insights`, `Edit`, `Delete`. `Edit` opens dialog
  `Edit Post` (textarea, `Pick from gallery`, `Add product`, the visibility pill, `Save`); the pill's
  menu has `Edit Price`, which reopens the Price dialog with the current value. Save sends `PUT
  /api/v1/posts/{uuid}` (keeps the assets) and toasts `Post published successfully`.
- **`Configure Lifetime`** opens dialog `Lifetime Configuration`: switch `Lifetime access` (off by
  default when the price is 0), `Set lifetime price` with an `Rp` field and `Min. price: Rp10.000`,
  `Save`, `Close`. The field behaves like the PPV one (letters stripped, Save enabled from 10.000).
  Save sends `PUT /api/v1/posts/lifetime-prices/me {priceIDR}`; switching off saves `0`.
- A guest viewing a locked post detail sees `Unlock Post` / `Unlock Now` but **not** `Unlock post to
  add comments` — that line is only for signed-in viewers.

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
  **Re-checked 2026-10-15:** removing the *only* image of a post (to replace it) fired no `…/assets`
  request within 20 s; the tile disappears at once and the change lands with `Save` (the post then
  holds just the new asset, with a new uuid). Do not wait on that request — assert the tile count and
  read `GET /posts/{uuid}` after saving. Each tile is an `img` with its own unnamed `×` button.
- **Linked products in Edit Post** are cards (`data-slot="card"`: thumbnail with `alt` = title, title,
  price) each with an unnamed `×` — that `×` is the only way to unlink one. Unticking every product in
  `Select Product` turns its button into a disabled `Add Products`, so the picker cannot remove.
- **Replacing media** is remove + upload in the same dialog; the asset uuid changes and
  the buyer surface serves the new file (checked by downloading it — the pixels changed
  from blue to green).
- **Products** can be added and removed after publication; the post uuid is unchanged, so
  no duplicate post is created, and the buyer sees the card appear/disappear.
- Editing a **scheduled** post's time works through the `Posting on …` chip at the top of
  the same dialog.

## Pinned Feeds — one pinned post per creator (verified 2026-10-11)

Shipped on dev per the PRD [[projects/yapp/pinned-feeds - prd|Pinned Feeds]]; TCs `TC-FE-C-081..091`,
`TC-FE-B-079..086`, all Passed on 11 Oct 2026.

- The post `…` menu on `/feeds` → Published reads `Insights / Edit / Pin to top / Delete`; once pinned the item
  is `Unpin`. Draft and Scheduled posts offer no pin item.
- `PUT /api/v1/posts/{uuid}/pin` with `{replace:false}` → 200 `Post pinned` (toast `Post pinned`). With another
  post already pinned it answers **409 `another post is pinned`** with `data.pinnedPost {uuid, contentPreview}`,
  and the UI turns that into dialog `Replace pinned post?` — "You can pin one post. This one will be unpinned:
  "<preview>"" with `Cancel` / `Replace`; Replace re-sends `{replace:true}`. Unpin is `DELETE …/pin`, instant, no
  dialog. The limit is server-side: a second pin without replace changes nothing.
- Posts carry `isPinned` in `GET /api/v1/posts/my/posts` and the public feed. The pinned card shows a pin icon +
  `Pinned` (creator list and public profile), sits first in both, keeps its original age, and is not repeated
  in the stream or on later pages of `GET /posts/user/{uuid}?visibility=public&page&limit=4`.
- Editing keeps the pin; deleting a pinned post frees the slot (the next pin needs no replace). The delete dialog
  does mention the pin. Exclusive posts can be pinned; access is unchanged (unpurchased PPV keeps `Unlock Post`,
  an active member sees member-only content open). Under `Exclusive Only` a pinned public post is hidden and a
  pinned exclusive one comes first. Guests see the same pin.
- A creator with no posts sees only the composer — no pin control; a single post can be pinned with no dialog.
- Pinning the **bottom** post of a fully scrolled Published list (31 posts, infinite scroll in pages of 10) closes the `⋯` menu cleanly on desktop and mobile; the stuck-menu report under F&E-16 is fixed (retested 2026-10-11). The card menu trigger is `button[aria-label="Post options"]` — `aria-haspopup="menu"` also matches the `Account menu` button. Desktop keeps the scroll position after a pin; mobile returns to the top.
- **The replace dialog quotes only the opening words** of the pinned post, cut with `…` when longer
  (e.g. `“Halo semuanya, materi baru baru saja diunggah ke platform! Y…”`) — assert a prefix, not the
  whole body.
- **Stale menu after Unpin (found 2026-10-15, candidate bug, not yet filed):** after unpinning, the
  post that moves into the top slot still offers `Unpin` (not `Pin to top`) in its `…` menu until the
  page is reloaded; the unpinned post's own menu is correct. Reproduced with a public post pinned then
  unpinned while a newer PPV post sat above it — the PPV menu read `Insights / Edit / Unpin / Delete`,
  and `Pin to top` after a reload. Reload before pinning another post right after an Unpin.

## Member-only post detail: member vs non-member (verified 2026-10-16)

On `/post/<uuid>` both see the body text and a `Member Only` label. **A member of the tier** gets the media
and an open comment box (`Write your comment`), with no prompt. **A signed-in non-member** gets
`Subscribe to Unlock` (twice on an image post), `Unlock post to add comments` (also twice on an image post)
and `Unlock Now`. A like by a member shows in the creator's `likeCount` within a second. Scheduling a member
post is the public flow plus `Member only` → `Select Membership Tier` → tier → `Confirm` before picking the
time; it auto-publishes on time like a public one. The visibility menu can drop a click made while it is
still animating in — retry until the tier dialog opens.

## Composer toolbar, drafts, and the creator post list (verified 2026-10-15)

- **The visibility pill opens a menu holding a radio group**, not menu items: `Public` "Visible to anyone
  on the platform." (checked by default), `Pay per view` "Unlock access with a one-time payment.",
  `Member only` "Visible to your subscribers." Read the option text with `innerText` — `textContent`
  glues label and description together. `Member only` opens dialog `Select Membership Tier` (tier names,
  `Confirm`); afterwards the menu stays open like after a PPV price, so close it before the next step.
- **A past schedule is refused in the client:** picking today 12:00 AM and pressing `Schedule Post` shows
  the toast `Cannot schedule post with past date/time`, sends no request and keeps the composer open.
- **Buyer-side pin checks without a card locator:** the profile Feeds tab shows exactly one visible
  `Pinned` badge, just above the pinned post's text; ordering and badge ownership can be checked from the
  on-screen positions of the post texts. Sundanese (token2) holds hendrarg's `QA Tenure Fixture` tier until
  2027-03-16 (`memberTierFixture`), so a member-only post for that tier opens for it with no purchase.

- **The composer has no category control** — not in the dialog, not in the `POST /api/v1/posts`
  payload. Its toolbar is media (`lucide-image`), linked products, `Draft Posts` (`lucide-file-text`),
  schedule (the clock), then the visibility pill and `Post`. TC-FE-C-004 ("optional category") has
  nothing to act on; raised as clarification CL-AUT-051.
- **Closing the composer with content asks `Save to Draft?`** ("Save to drafts to edit and post at a
  later time.") with `Discard` / `Save Draft`. `Save Draft` sends `POST /api/v1/posts` with
  `status: "draft"` (media and `productUuids` included) and toasts `Draft saved successfully`; the
  post lands in the `Draft` tab. `createPost({ status: 'draft' })` seeds one.
- **Resuming a draft:** composer → `Draft Posts` (a dialog listing drafts) → click one → it reopens as
  dialog **`Publish Post`** with the text, the media and the product chip restored (the chip brings
  its own thumbnail `img`, so count media images as total − products).
- **Per-post menu** (`button "Post options"`): Published `Insights / Edit / Pin to top / Delete`;
  Scheduled `Insights / Edit / Delete`; no pin item on Draft or Scheduled.
- **Insights** is a dialog: `Total views` (split `Explore` / `Profile` %), `Total Interactions` with
  `Likes` and `Comments`, and a Revenue block ("not available for public posts"). Views are
  `viewFromExplore + viewFromProfile` on `GET /posts/{uuid}`.
- **Delete** asks dialog `Delete Post` — "If you delete this post, you won't be able to restore it"
  (`Delete` / `Cancel`); afterwards `GET /posts/{uuid}` answers 404 for buyers too.
- `POST /api/v1/posts/{uuid}/like` likes as the token's account (no body).
- **`GET /posts/my/posts` returns at most 10 posts per page whatever `limit` says** — page through
  it for a full count. New and pinned posts are always on page 1.
- **The public profile feed is not a stable place to look for a seeded post** on `hendrarg`: other
  runs keep adding posts, and the Feeds tab shows a handful at a time. Prove buyer visibility with
  `GET /posts/user/{creatorUuid}?visibility=public` (`getPublicPostIds`) and the post's own URL.
- The QA buyer account (`anthony_mosciski`) is also a creator: it opens `creators-dev/feeds` with three
  fixture posts (member-only, PPV, public) other tests rely on. For an empty or one-post feed, hide
  them with `dbFixtures.hidePosts(uuid)` (soft delete, restored in teardown) — never delete them.

## Scheduling

**Typing the time (2026-10-15):** the hour/minute inputs are controlled — `fill()` is reset to
`12` / `00` on re-render; click, select all and type real keystrokes. A past time is refused in the
client with the toast `Cannot schedule post with past date/time`. Scheduling sends `POST
/api/v1/posts` with `status: "active"` and `scheduledAt: "2026-10-15T11:28:00+07:00"` and toasts
`Post scheduled successfully`; the API also takes `scheduledAt` on create (an ISO time), which is
how tests seed scheduled posts. One `Escape` may only close the AM/PM list — press again only while
the picker is still open, because one more closes the composer.

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

## Creator Feeds loads comments once per post (2026-10-14)

Opening creator `/feeds` fires `GET /posts/my/posts?type=published` and `?type=draft`, then one
`GET /posts/{uuid}/comments?page=1&limit=10` **per visible post** — 10 posts, 10 extra requests
(N+1). At 1 VU each one is ~80 ms; the k6 `creator/dashboard` scenario replays it on purpose so a
load run shows what it costs. The dashboard shell on every creator page also calls
`GET /accounts/domain`, which answers **404** for a creator without a custom domain — expected,
not an error.
