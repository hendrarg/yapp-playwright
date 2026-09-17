---
title: Products
type: note
category: project
tags: [yapp, product, automation, products]
project: yapp
created: 2026-09-04
updated: 2026-09-04
sources: 0
status: active
---

> [[projects/yapp/knowledge/index|Knowledge index]]

# Products

How product creation, pricing, media, and status behave across all six Yapp product
types — Event & Tickets, Consultation, Discord Membership, Telegram Membership,
Digital Download, Online Course.

Discord and Telegram membership specifics — renewal reminders, the bot surface,
subscriber row actions — live in [[membership-products]]. A creator's own subscription
tiers are **not** a product type at all and are covered by [[membership-tiers]].

## Pricing: every product starts free

On Add Product for **any** product type the `Add Pricing` toggle defaults to **ON**
with the price value at **0**. Switching the toggle **OFF** also yields a free
product — both states mean free. A new offering is free until the creator types a
real price. Confirmed by the product owner 2026-08-08.

The buyer side renders price 0 as `Free`: a `FREE` checkout badge, zero total, and a
`Get Product` CTA instead of payment.

**The amount rule is "either 0 or at least Rp10.000", on every product type.**
Zero is legitimate and means Free; the rejected range is **1 to 9,999**, with the
message `Price must be either 0 or at least Rp10.000`. Confirmed 2026-08-13 and
verified on Digital Download and Online Course.

On some forms that message only surfaces after the next-step button is pressed — do
not conclude there is no validation because typing and blurring produced nothing. A
A test case expecting "zero price is rejected" is asserting the wrong rule.

## Thumbnails

Confirmed 2026-08-13 as applying to **every** product type.

**Capacity is 11 images: 1 hero slot plus a 10-slot gallery.** In the DOM the
gallery reads as 1 chooser tile plus 9 `No Image` placeholders, which is where
miscounts come from — the hero is a separate control and is easy to omit from the
total. Several sheets carried wrong figures (Digital Download said max 8, Event &
Tickets said 9 additional / 10 total); both were corrected to 11.

**The gallery accepts multiple files on all six product types**, every one carrying
the identical accept list
`image/jpeg,.jpeg,.jpg,image/png,.png,image/gif,.gif,image/webp,.webp` — the same
list the hero uses. The hero is single-file, which is correct for one primary image.
**There is no deviation between product types.** Two "deviation" findings reached the
sheets and had to be retracted; both came from probing a third, unrelated image input
on the page (see the locator trap in `.agents/rules/mcp-playwright.md`).

**Hero constraints:** minimum **500 × 500 px**, smaller than **500 MB**, and
required — publishing is blocked with `Thumbnail is required` / `Hero image is
required` until it is set.

**An undersized image is always rejected with a toast naming the file**, in this
exact shape, on every product type:

```text
Screenshot 2026-06-14 163733.png is too small. Image must be at least 500 x 500 pixels.
```

The file does not enter the slot. Rejection is never silent — two "silent rejection"
reports for Consultation, Digital Download, and Online Course were wrong and have
been corrected in the sheets.

## Status lifecycle

Established by live testing 2026-08-13 (Products sheet).

**Status changes commit immediately, with no Save.** The `Set Inactive` switch at the
top of the product edit page (`/products/update/{type}/{uuid}`, on both step 1 and
step 2) fires `PUT /api/v1/shop/products/{uuid}/status` with
`{"status":"inactive"|"active"}` → 200 `Update Product Successfully`. The switch
prefills from the stored status, so `aria-checked="true"` means the product is
currently Inactive.

The same control exists in the Products-list actions menu and works identically:
toast `Product set to inactive` / `Product set to active` after ~0.5–0.75 s, the row
changes tab, and tab counts update live. **Promotion uses the same component**:
`PATCH /promos/{uuid}/status` with `{"isActive":false|true}` → 200.

The menu label always reads `Set Inactive` for Active, Inactive, and Draft alike —
the state lives in the switch, not the label, so reactivation is available from the
list too.

**`Save and Publish` re-activates the product, and that is intended.** Publishing
means putting it on sale. Confirmed by the product owner 2026-08-19. Practical
consequence: change status with the switch and navigate away — do not save
afterwards.

**`Hide from Profile` has an unwired UI, which is expected.** The menu item sends
nothing, and the product owner classified that as expected on 2026-08-19 — it is not
a defect. The feature itself works via
`PUT /api/v1/shop/products/{uuid}/hide-from-profile` with `{"isHideFromProfile":true}`
(body required; empty body gives 400 `IsHideFromProfile is required`). It removes the
product from `yapp-dev.yapp.ink/{username}` for anonymous visitors while the direct
URL stays 200 with purchase CTAs live. No other UI control sets the flag — the My
Page card menu is only Edit / Set as Featured / Share / Delete. Toggling it also
**resets the product to the front of the My Page arrangement**; restore position by
dragging the card grip (`PATCH /shop/products/reorder`).

**Status only binds profile visibility.** Inactive products disappear from the
creator profile but their direct product URL stays 200 with purchase CTAs enabled;
Draft products are likewise fully purchasable via direct URL. Deletion is real —
`DELETE /shop/products/{uuid}` and the URL becomes 404.

## Online Course: After Sales default

The After Sales "Customize Message" switch has two different defaults, because
`aria-checked` derives from the product's saved config rather than a static default:

- **Create form** — the switch starts ON.
- **Edit mode of a product with no saved config** (`thankYouNote=""`,
  `salesLinks=[]`) — the switch reads OFF. The create-form ON state is not persisted
  until a message is actually saved.

For an API-seeded course expect OFF unless the seed includes `thankYouNote` and/or
`salesLinks`. Use the `{ title, url }` shape for `salesLinks` — a plain `label`
causes a 500 `sales link title is required`.

## After Sales is one shared contract on every product type

Verified 2026-08-31 on Discord Membership and Event & Tickets, and consistent with
what the sheets already record for Digital Download and Online Course. Treat this as
shared behaviour and reuse the same step and locator intent rather than re-deriving
it per product type:

- **Message is capped at 1000 characters**, and the counter reads `n/1000 characters`
  — it counts **characters correctly**. This is the counter to trust; the *description*
  counter on the same forms counts words (see below).
- **Links are capped at 3**, stated in the UI as `max. 3 links`, described as links the
  buyer can open straight from the after-sales email.
- **There is no file-attachment control anywhere in After Sales**, on any product type.
  A recording or follow-up file can only be delivered as a link. Do not write a test
  hunting for an upload button here.

The `Customize Message` toggle default is the one thing that is *not* shared — see the
Online Course section above.

**An empty message is not rejected, it is discarded.** Verified 2026-09-10 on a
Consultation: turning `Customize Message` on and saving a message persists it (the switch
still reads ON after a reload). Emptying that message with the switch still ON and saving
again returns `PUT /api/v1/shop/products` **200** with no validation message and no toast
— and after a reload the switch is back OFF with the message gone (`L-67`). So "After
Sales ON" is not a state the product can hold on its own; it is derived from a non-empty
saved message.

## Route and label asymmetries

The create and edit routes do not use the same product-type slug:

- Consultation is created at `/products/create/consultation` but edited at
  `/products/update/**appointment**/{uuid}` — using `consultation` on the edit route
  returns 404.
- Online Course uses the CTA `Next: Edit Details`, where every other product type uses
  `Next: Set Details`.
- Telegram Membership is edited at `/products/update/**telegram-membership**/{uuid}` —
  hyphenated. Both `telegram` and `telegram_membership` return 404.

## The description counter counts words, not characters

Confirmed on **all six product types** in Aug 2026: the
`n / 500` counter under a product description increments per **word** while the
displayed unit implies characters, so the limit a creator actually hits is
unpredictable. Measured: 31 characters / 5 words renders `5 / 500`; 150 characters /
30 words renders `30 / 500`.

It is a unit bug rather than a design decision — on the same product the after-sales
counter counts characters correctly (`31/1000 characters`) and the Online Course body
editor labels its unit honestly (`11 words`). Three counter components exist and only
the description one misleads.

Do not write a test case that treats `n / 500` as a character limit until this is
fixed.

## Event & Tickets: capabilities the form does not have

Verified in the browser on dev, 2026-08-31, while converting the Event PRD-gap rows
into test cases. Each of these reads like a missing feature and has already been
mistaken for one — they are absences, not defects, and a test case should assert the
absence rather than hunt for a hidden control.

**Step 1 Schedule takes one date only.** The section is exactly Event Date (single
date picker, past dates disabled), Event Time (start and end), an `All Day` switch,
and a **Timezone picker** defaulting to `Jakarta (GMT+07:00)` — 112 entries with a
search box, the same control Consultation uses (`TC-CON-C-050`). It reads like static
text in an accessibility snapshot; it is not. There is no repeat, recurrence, or
multi-session control, so a recurring event can only be modelled as separate events.

**On-site venue is Venue Name plus Address, nothing else.** There is no map link or
map URL field, so the buyer-side Google Maps link is derived from the address and
cannot be customised.

**Online venue forces a platform choice.** `Platform / Streaming Link` is required
and offers exactly two options, `Google Meet` and `Custom`, with Google Meet
preselected. There is **no `None` option**, so a creator distributing the access link
outside Yapp still has to pick one.

**Step 2 has no file upload beyond the Thumbnail.** The sections are Thumbnail, Buyer
Form, Ticket Configuration, and After Sales. After Sales offers a rich-text message
with Insert image and Insert YouTube video plus a **maximum of 3 links**, and no
attachment control — so a post-event recording or follow-up file can only be
delivered as a link.

**A purchased ticket cannot change hands.** The buyer ticket page (`/product/{uuid}`,
tabs Overview / Ticket / About Creator) exposes exactly `Share` and `Scan` in Ticket
Details, alongside Back and View Message. There is no transfer, reassign, or
change-holder action.

## Leaving the create flow discards silently

Verified 2026-09-01 on Digital Download. Pressing `Back` on Step 1 with a filled Title
navigates straight to `/products` — **no confirmation dialog, no browser
`beforeunload` prompt** — and **no draft is auto-created**: the typed title does not
appear on the Draft tab. Explicit `Save as Draft` is the only thing that persists work.

**Method trap:** navigating directly to `/products/create/<slug>` leaves the browser
with no history, so `Back` lands on `about:blank` and the result is meaningless. Always
reach the form the way a user does — Products → Add Product → pick a type — before
testing this.

The create slug for Digital Download is **`digital-downloads`** (plural);
`digital-product` and `digital-download` both 404. See the route asymmetry section.

## Digital Download content types

Step 1 offers three checkboxes, **all unchecked by default**: `Media` (MP4, MOV, MP3,
JPG, PNG, etc), `Links` (GDrive, Notion, Youtube, etc), `Digital Files` (PDF, ZIP,
DOCX, XLS, etc.). Ticking one reveals its section; **unticking removes that section
immediately with no confirmation and no data-loss warning.**

## Discord scheduled publish is date-only

`Advanced Settings` on Step 2 holds three switches, all off by default: `Schedule
Publish`, `Availability`, `Hide from Explore`. Enabling `Schedule Publish` reveals a
single `Pick a date` control — **no timezone indicator and no time-of-day field**, so
scheduling is date-granular and the zone it resolves against is not stated. This is a
real inconsistency with Event & Tickets, which exposes a full 112-entry timezone
picker.

## Reaching the edit form, and the Step 2 gate

Verified 2026-09-09 on dev while testing the Step 2 rows.

**Product rows are not links.** `/products` renders a table with no `a[href]` per row —
clicking the name cell navigates to `/products/stats/{uuid}`, and that page carries the
`Edit` button that opens `/products/update/{slug}/{uuid}`. Scraping hrefs off the list
returns nothing; go through the stats page (or hold the uuid) instead.

Edit slugs seen so far: `appointment` (Consultation), `discord-membership`,
`events-ticket`, `digital-downloads`. Only Consultation's differs from its create slug.

**The list shows one status at a time.** Tabs are `Active (n)`, `Inactive (n)`,
`Draft (n)` and the table only holds the selected status — a product missing from the
default view is usually Draft or Inactive, not deleted.

**A past event date blocks Step 2.** On an Events & Tickets product whose Event Date has
already passed, Step 1 shows `Event date cannot be in the past` and `Next: Set Details`
does nothing. Move the date forward in the picker first (open it, advance the month,
pick a day) or Step 2 is unreachable — this is what makes old seeded events look like a
broken Next button.

## Promotion: Find Product ignores product status

Verified 2026-09-09 at `/promotions/create` with `Product Type = Selected Product`.

The `Find Product` popover lists **Draft and Inactive products mixed in with Active
ones and shows no status badge at all** — each row is just name plus price. A promo can
therefore target a product that is not on sale, with no warning.

The price in that popover is also **`Rp0` for every tiered product** (Consultation with
tiers, Telegram/Discord membership, Events) because it reads the product-level price
that tiered products leave at 0; single-price products show correctly. Logged as `M-69`
on the Bugs sheet.

## The Online Course editor is a block editor, not a form

Mapped 2026-09-10 while authoring on a disposable course. Step 1 (`Next: Edit Details`)
is the content canvas; step 2 is the ordinary product form.

**Structure lives in the right-hand tree**: each chapter lists its pages, every chapter has
`Add Page`, and the bottom of the panel has `Chapter` and `Page` buttons that append a new
one (`POST …/products/{uuid}/page`). A tree row's icon opens a menu whose only item is
**`Delete`** — there is no rename, duplicate, or move item; renaming is done by typing in
the `Add title` field of the selected page.

**Content blocks** come from two places: the `Insert` button offers `Video`, `Attachment`,
`Image`, `Carousel`, `Product`; typing `/` opens the usual BlockNote text menu (headings,
lists, quote, code, table, divider…). Hovering a block reveals a left-side button with
`aria-label="Open block menu"`, again offering **`Delete` only**. Reordering exists solely
as HTML5 drag-and-drop on that handle, which Playwright's mouse events cannot drive — do
not write a test that asserts reorder through the UI.

- **Video block**: `accept="video/mp4,.mp4,video/quicktime,.mov"`. A filled block shows
  Play / Mute / fullscreen / `Delete Video`; pressing `Delete Video` turns it back into an
  `Upload Video · Please use .mp4 or .MOV` placeholder that accepts the replacement in
  place.
- **Attachment block**: `accept=".pdf,.docx,.xlsx,.csv,.mp3,.wav,.zip"` and
  **`multiple=false`**, so files go in one block at a time. A filled block shows name, size
  and `Replace` — and **that `Replace` input is the trap**: a script that grabs "the last
  file input" keeps overwriting the same block. Target the input inside the empty
  placeholder instead.
- **`.wav` is advertised but rejected** — the upload answers `Upload failed` every time
  (`L-54`). The other six types in that accept list work.

**Deleting a block does not survive Save** (`M-56`): the file disappears from the editor,
`Save` reports nothing, and a reload brings it back. Text edits, new uploads, chapter adds,
page renames and chapter deletes all persist through the same button — the defect is
specific to deleting a block inside a page.

## Publishing a course: what is and is not validated

Verified 2026-09-10.

- On the **create** flow step 2 the buttons are `Next: Publish` and `Save`. **`Save` is the
  draft save** — it creates the product with `status: "draft"`, which is invisible on the
  creator's public profile, absent from `/explore/products`, and 404 on its direct link.
- On an **already active** product there is **no Publish or Republish button at all** —
  only `Save`, and pressing it produces **no toast and no dialog**; the only feedback is the
  header stamp `This product is active and was last updated <date>` (`L-66`). Edits go live
  immediately and `shortUrl` never changes.
- Publish validates the **thumbnail** (`Thumbnail is required`) and nothing about content:
  a course whose chapters have all been deleted publishes happily and goes live with zero
  pages (`M-55`).

## The product detail page is no longer reachable by direct URL (17 Sep 2026)

`/product/{uuid}` does **not** open a product detail page any more:

| Viewer | Result |
|---|---|
| guest | redirected to `/auth?redirect_url=/product/{uuid}/view` |
| logged in, not a member | redirected to `/explore`, with a `404` in the console |
| logged in, active member | redirected to `/explore`, same `404` |

`/product/{uuid}/view` behaves the same way, and neither `/{creator}/{shortUrl}` nor
`/{shortUrl}` renders it. What still works by direct URL is
**`/product/{uuid}/checkout?quantity=1`** — which opens for a guest too, with the
`Send Verification Code` guest flow — and **`/product/{uuid}/course`** for course content.

So a test that needs the product detail page has to navigate to it (Explore, the creator's
shop, a tier's perk row), not type the URL. This cost a full run of `TC-MEM-B-046` before it
was spotted: three different viewer states all landed somewhere else, which reads at first
like the page is broken rather than like the route having moved.
