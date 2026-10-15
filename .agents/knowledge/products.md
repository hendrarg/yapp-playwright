---
title: Products
type: note
category: project
tags: [yapp, product, automation, products]
project: yapp
created: 2026-09-04
updated: 2026-10-08
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

**A product used as a membership benefit cannot be deactivated** (2026-10-02): the same
`PUT .../status` answers **500** `cannot deactivate this product because it is set as a
membership benefit on tier <name>. Remove it from the membership benefits first` (seen on
`Sikancil`). Pick a product outside every tier's perks when a test needs one inactive.

The same control exists in the Products-list actions menu and works identically:
toast `Product set to inactive` / `Product set to active` after ~0.5–0.75 s, the row
changes tab, and tab counts update live. **Promotion uses the same component**:
`PATCH /promos/{uuid}/status` with `{"isActive":false|true}` → 200.

The menu label always reads `Set Inactive` for Active, Inactive, and Draft alike —
the state lives in the switch, not the label, so reactivation is available from the
list too.

**Checked again 2026-10-13.** The Online Course editor and the Discord Membership editor
do not render a Set Inactive switch on step 1 or step 2. The products-list actions menu
still does (`#set-inactive` inside the menu item; `aria-checked="true"` means inactive). The switch itself has no accessible name `Set Inactive` — that string is the menu item around it.
That click sends the status PUT, shows `Product set to inactive` / `Product set to active`,
and closes the menu. Draft rows use the same six items, with the switch off.

**`Save and Publish` re-activates the product, and that is intended.** Publishing
means putting it on sale. Confirmed by the product owner 2026-08-19. Practical
consequence: change status with the switch and navigate away — do not save
afterwards.

**Hide from Profile and Hide cover different surfaces.** Hide from Profile takes the product off the public creator profile and leaves it on Explore. Hide takes it off Explore and leaves it on the profile. The direct URL stays open either way. The list switch sends `PUT /api/v1/shop/products/{uuid}/hide-from-profile` with `{"isHideFromProfile":true|false}` and a settled product answers **200** `Update Product Hide From Profile Successfully`. Hide sends `PUT …/hide-from-explore` with `{"isHideFromExplore":true|false}`. One Hide-from-Profile click in the same second the product was created answered 500 `product not exist.` for a uuid `DELETE` then accepted. An empty hide-from-profile body used to return 400 `IsHideFromProfile is required`. The My Page card menu is still only Edit / Set as Featured / Share / Delete. Toggling the flag also **resets the product to the front of the My Page arrangement**; restore position by dragging the card grip (`PATCH /shop/products/reorder`).

**Inactive and Draft products are closed to buyers** (re-checked 2026-10-11, Events and
Consultation). Their share link (`/s/<shortUrl>`, `/<creator>/product/<shortUrl>`) renders
`That page doesn't exist`. Setting the product active again brings the page back. This
replaces the August 2026 observation that status only hid products from the profile and left
the direct URL purchasable. Deletion is real: `DELETE /shop/products/{uuid}` and the URL
becomes 404.

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
- **A link's `Customize Label Text` is capped at 40 characters** (`maxLength`), across
  **every** product type — not just Consultation. The input simply stops at 40 and the
  counter reads `40/40 characters`; there is **no inline error**, and that is the
  **intended** FE boundary (ruled 2026-09-23, closed `L-07`). Do not write a test expecting
  an over-length error here — assert the 40-char cap and the `40/40` counter instead.
- **There is no file-attachment control anywhere in After Sales**, on any product type.
  A recording or follow-up file can only be delivered as a link. Do not write a test
  hunting for an upload button here.

The `Customize Message` toggle default is the one thing that is *not* shared — see the
Online Course section above.

**An empty message is not rejected, it is discarded.** Verified 2026-09-10 on a
Consultation: turning `Customize Message` on and saving a message persists it (the switch
still reads ON after a reload). Emptying that message with the switch still ON and saving
again returns `PUT /api/v1/shop/products` **200** with no validation message and no toast
— and after a reload the switch is back OFF with the message gone (`L-67`). Discord
Membership does the same (2026-10-13): `Next: Publish` with the switch on and an empty
editor completes, and reopening the product shows the switch off. So "After Sales ON"
is not a state the product can hold on its own; it is derived from a non-empty saved
message.

On Discord Membership, turning the switch off hides the editor and the
`0/1000 characters` counter. The purpose sentence stays on the page. There is no
separate sentence about a default email.

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

**A ticket tier has no disable toggle — only Remove — but its sale-window can close it.**
Confirmed 2026-09-23 against the schema. `ticket_price_configurations` carries no
`isActive`/`status`/`isEnabled`; the per-tier controls are edit/expand and a destructive
Remove (delete without confirmation — expected, see `L-12`). Unlike Telegram membership
plans, though, a ticket tier has `period_start`/`period_end` (a sale window) plus
`max_quantity`, so a creator can stop selling **one** tier non-destructively by setting its
period or cap. So "no per-tier disable" is the same absence as Telegram, but only Telegram
lacks a safe non-destructive close.

**Event tiers have no stock/slot cap, so `Max N tix/user` is a real per-user limit.**
Ruled 2026-09-23. A tier's creator-side `Ticket Quantity` (e.g. Full packages 100, Tektok
10) renders buyer-side as `Max N tix/user`, and that number **equals** the tier's
`ticket_price_configurations.max_quantity`. This is **not** a mislabelled total stock:
Event & Tickets has no per-tier stock/slot concept (unlike Online Course, which has slots),
so one buyer genuinely may purchase up to N tickets — buying for friends is expected. Do
not re-flag the `/user` wording as a bug (this closed `L-15`).

**A purchased ticket cannot change hands.** The buyer ticket page (`/product/{uuid}`,
tabs Overview / Ticket / About Creator) exposes exactly `Share` and `Scan` in Ticket
Details, alongside Back and View Message. There is no transfer, reassign, or
change-holder action.

**Seeding an event via `POST /api/v1/shop/products` has three date/field traps** (hit
2026-09-23). `ticketConfiguration.eventDate` must be **`dd-mm-yyyy`** (e.g. `15-12-2026`)
— an ISO datetime is rejected. Each `ticketPriceConfigurations[].periodStart/periodEnd`
must instead be **RFC3339** (`2026-10-01T00:00:00Z`) — a bare date is rejected. And with
`ticketConfiguration.platform: "custom"` a non-empty `meetingLink` is **required** (500
otherwise). The two tier rows go in `ticketPriceConfigurations`; the helper
`createEventProduct` hardcodes `salesLinks: []`, so after-sales links must be added in the
UI or a hand-built payload.

**Streaming links and the hybrid tier location (verified 2026-10-11).**
- **Google Meet generates the link on save.** No URL is typed. The saved
  `ticketConfiguration.meetingLink` reads `https://meet.google.com/xxx-xxxx-xxx`, created through
  the creator's Google Calendar, and `googleCalendarEventId` is set (it is set for `custom` too).
- **The buyer product page never shows a meeting link,** for either platform. It shows only the
  date, `All Day` or the time range, the venue, and a Google Maps link
  (`google.com/maps/search/?api=1&query=<venue> <address>`). The link reaches the buyer only on
  the purchased ticket.
- **On a hybrid event every ticket tier needs its own `Location`.** It is a required
  `Choose Location` select with `Offline venue <address>`, `Online venue <platform>` and
  `Hybrid venue …`. Left empty, `Next: Publish` silently stays put with `Location is required`
  on the tier.
- **Step 1 messages.** A hybrid or online event with `Custom` and no link shows
  `Meeting link is required`; a malformed link shows `Invalid URL`. An untouched Step 1 lists
  Title, Description, Event date, Start time, Venue name and Venue address as required. End
  time is not required.
- **Event times never conflict.** The picker offers 96 slots (every 15 min), none disabled.
  Picking an end time before the start moves the **start** to one hour before it (14:00 + end
  12:00 → 11:00–12:00). A later start moves the end to one hour after it (start 20:00 → 21:00).
  No error is shown.
- **A percentage discount over 100 is flagged on blur.** Re-checked 2026-10-11; this used to
  surface only at publish. `Percentage discount cannot exceed 100%` appears under the field as
  soon as it loses focus, and `Next: Publish` stays blocked. Locator trap: the `%` amount box
  and `Ticket Quantity` share the placeholder `0`. A page-wide placeholder match types the
  discount into the quantity, which is how this behaviour stayed hidden.
- **The gallery holds 10 images beside the thumbnail, 11 in total.** Once the 10th is in, the
  chooser and its file input disappear. Picking more than 10 files at once uploads **none of
  them**, with no message.
- **A tier outside its sales window shows `Sold Out` to buyers.** This applies before the start
  and after the end alike, with the price still shown and `Select` disabled. A 0-price tier
  reads `Free /per pax`. Each tier keeps its own window. In the creator form the Start and End
  date buttons sit inside that tier's block, and past days are disabled.
- **A non-image thumbnail is refused by name.** For example `song.mp3: File type must be one of
  image/jpeg, .jpeg, .jpg, image/png, .png, image/gif, .gif, image/webp, .webp`.
- **An event row's action menu has 7 items** (2026-10-11): Set Inactive, Hide from Profile,
  Edit, **See Attendances**, Share, Hide, Delete. See Attendances is event-only.
- **Products tab counts follow the search box.** With a title typed in, `Active (n)` and
  `Inactive (n)` count only the matches, so compare counts under the same search.
- **Date formats differ by side.** The creator date button pads the day (`01 November 2026`);
  the buyer page does not (`Sunday 1 Nov`).
- **On the buyer page the event description arrives after the header.** Read the page text
  only once the description is in, or it looks missing. On the edit form, the saved
  description loads after the editor mounts and replaces anything typed before it.
- **The guest list page** is `/products/detail/events-ticket/{uuid}`, reached from See Attendances.
  It has **no `main` landmark**, so read text from `body`. It pages 10 guests at a time, with
  page numbers and `Next` and no rows-per-page control. `Search Name` filters as you type.
  The stats read `Attandee` (sic, L-10), `Registered` and `capacity`. Re-checked 2026-10-11 on
  the seeded event (1a18e717): Registered (14) equalled the rows across pages (10 + 4); the old
  13 vs 15 gap is gone.
- **A draft still needs the mandatory tier fields (expected, confirmed by the team
  2026-10-11).** `Save as Draft` on Step 2 with a tier that has no sales period is refused:
  `POST /api/v1/shop/products` → `400 parsing time ""` and the toast `Invalid request`. Nothing
  is saved and the form stays on the create route. With the sales period filled the draft saves
  (`Product saved as draft`) and the URL moves to `/products/update/events-ticket/{uuid}`. This
  is not a bug, although TC-EVT-C-028's "save at any step" reads as if it were.
- **Editing a published event saves without changing its status.** `Next: Publish` on Step 2
  sends `PUT /api/v1/shop/products/{uuid}` → 200 and shows `Product updated successfully`. The
  product stays active. Step 1 of the edit form has no Save button.
- **The description toolbar marks formats as classes, not tags.** It is Lexical: bold, italic
  and underline end up as classes on a single `strong`, not as `em` or `u`. The toolbar shows
  an applied format by renaming its button to `Remove bold`, `Remove italic` or
  `Remove underline`.

**The after-sales link editor's edit dialog is mistitled.** In Step 2 → a tier's
`Customize after-sales` → `Add Link`, the dialog fields are **URL first, then
`Customize Label Text`**, and the confirm button is **`Done`**. A saved link row shows an
`edit` control (text `edit`, no aria-label) and a separate delete icon; clicking `edit`
opens a dialog that is prefilled (so it is edit mode) yet still headed **`Add Link`** with
no delete inside it (`L-14`, still open 2026-09-23).

## Leaving the create flow discards silently

Verified 2026-09-01 on Digital Download, and again 2026-10-13 on Consultation. Pressing `Back` on Step 1 with a filled Title
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

**Name cells are links, and the target depends on status** (re-checked 2026-10-13).
An Active row's name is an `<a href="/products/stats/{uuid}">`, including Digital Download.
A Draft row's name links straight to the editor, `/products/update/<type>/{uuid}`.
The Edit item in the actions menu opens that same editor. The October 6 note that two
Active Digital Downloads still linked to `/products/detail/digital-downloads/{uuid}` no
longer matches the rows on the list.

Edit slugs seen so far: `appointment` (Consultation), `discord-membership`,
`events-ticket`, `digital-downloads`, `telegram-membership`, `online-course`, and
`exclusive-content` — the Digital Product / **Exclusive Content** type, whose slug matches
neither its label nor its `product_type` value (`digital_product`), so it is the one route
that cannot be guessed. Only Consultation's differs from its create slug.

**The list shows one status at a time.** Tabs are `Active (n)`, `Inactive (n)`,
`Draft (n)` and the table only holds the selected status — a product missing from the
default view is usually Draft or Inactive, not deleted.

**A past event date blocks Step 2.** On an Events & Tickets product whose Event Date has
already passed, Step 1 shows `Event date cannot be in the past` and `Next: Set Details`
does nothing. Move the date forward in the picker first (open it, advance the month,
pick a day) or Step 2 is unreachable — this is what makes old seeded events look like a
broken Next button.

## Meta Pixel per product (18 Sep 2026)

Mapped on dev while testing YAP-2166 ([FE][BE] Per-Product Pixel Integration). This is the
product-level companion to the account-level Facebook Pixel in [[settings]], and the two are
additive, not alternatives.

**Where it is.** A `Meta Pixel` section on the product editor's **Details** step — which is
step 1 on Consultation and Events & Tickets, step 2 on Digital Download, Discord Membership,
Telegram Membership and Online Course. Heading `Meta Pixel`, subtitle *"Send this product's
events to its own Meta pixel, on top of your account pixel."*

**Exclusive Content (`digital_product`) does not have the section**, on either editor step,
although it is still offered in the `Add New Product` dialog under `Memberships`. Every other
type has it. Verified 18 Sep 2026 — ticket's stated scope is "all product types", so treat a
future appearance there as the fix, not as a regression.

**The toggle has no stored state of its own.** `aria-label="Enable Meta Pixel for this
product"`. Off shows one card line, *"Off — this product's events go to your account pixel
only."*; on reveals `Pixel ID` (input, placeholder `e.g. 123456789012345`) and `Pixel Access
Token` (**a `textarea`**, placeholder `Paste your access token here`) — the same input/textarea
split as the account-level dialog. On reload the toggle is derived from the saved values, so
**switching it on and saving with both fields empty is silently discarded**: no error, and the
section comes back Off.

**Validation is client-side only and does not block the step.** A non-numeric Pixel ID shows
the red message `Pixel ID is the numeric ID from Events Manager`, but `Next` still advances and
the input gets **no `aria-invalid`**. What it does block is the save: pressing `Save and
Publish` from step 2 with an invalid Pixel ID left behind on step 1 does nothing at all — no
toast, no scroll back to the error, `updated_at` unchanged. The Access Token is not validated
(one character saves).

**Storage has three states, and two of them mean "no pixel".** `products.meta_pixel_id` and
`products.meta_pixel_token` (both `text`, added at the end of the table) hold the values in
plaintext. Never configured leaves them `NULL`; turning the toggle **off** and saving writes
**empty strings**, not `NULL`. Any query or fixture check must treat `''` and `NULL` alike.

**What the buyer page does with it.** The product detail page (`/{creator}/product/{shortUrl}`)
calls a public, unauthenticated `GET {API}/v1/products/meta-pixels?uuids={uuid}` — plural, so
it is built for several products at once — which answers with **`metaPixelID` only, never the
access token**:

```json
{"status":200,"message":"Get Product Meta Pixels Successfully",
 "data":[{"uuid":"…","metaPixelID":"123456789012345"}]}
```

A product with no pixel of its own returns `"data":[]`; the endpoint does **not** fall back to
the creator's account pixel, so it is strictly per-product. Any uuid can be queried by anyone.

**Browser vs server (updated 19 Sep 2026).** On **yapp-dev**, buyer Meta events other than
Purchase are **not** observed as server CAPI: the live buyer bundle gates `fbq` behind
`canSendMetaPixelEvents()` which is false when `environment` is `dev`/`development`/`local`
unless `NEXT_PUBLIC_META_PIXEL_FORCE` is `1`/`true`/`yes`. With the gate off, `window.fbq`
stays undefined and no `fbevents.js` loads — matching earlier observations. **Purchase** still
reaches Meta on yapp-dev via **backend Conversions API** after payment settle. On
**production**, browser `fbq` is expected for funnel events; product-open tracks
**`ViewContent`** (Settings carousel still says Page View). Checkout may not fetch
`meta-pixels`. GA4 (`G-BFW6EM6XDN`) remains on the page either way. **A test cannot assert
pixel delivery from the browser on yapp-dev without force-enable.** The one client-side
artefact still worth asserting is the `meta-pixels` request and its payload.

## Promotion: Find Product and product status

**Changed 2026-10-12: Find Product now offers Active products only.** Searching the exact
title of a seeded Draft or Inactive course returns `No products found.`; an Active course
appears as `<name> Rp<price>`. Everything below this paragraph is the earlier behaviour,
kept for history — TC-PRM-C-044 still expects it and is marked Need Review.

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

**Deleting a block now survives Save.** This was fixed 2026-09-25 (OC-9) and re-checked
2026-10-11. The bug was filed as `M-54` and later renumbered `M-38`. A file deleted through
the block menu stays gone after Save and reload. In `page_files` the deleted file has no
live row, while the kept file gets a new live row on each save, so the rewrite pattern
below still holds. AUT-OC-002 now runs without `test.fail`. On a slow dev it can still time
out in other ways: the block menu's `Delete`, uploads that stay at `Uploading...`, or the
autosave wait. Those are timing failures, not this bug. The history below explains how the
defect worked.

**Where page content is actually saved.** The `Save` button on the content step sends
`PUT /api/v1/shop/products/{uuid}` **with no `pages` key at all** — chapters and pages
persist through a per-page autosave that fires on edit:
`PUT /api/v1/shop/products/{productUUID}/pages/{pageUUID}` with
`{chapterUUID, pageName, content, position, segments}`. That body carries **no `files`
field**, so a removed attachment is genuinely absent from the request; the server answers
`200` and re-inserts the file anyway. Removal is therefore a server-side reconciliation
gap, not an editor bug — and `page_files` rows are **rewritten on every page save**
(old row soft-deleted, an identical row inserted with a new id), so never treat a
`page_files` id as stable.

### Course editor re-checked 2026-10-08

- **`Insert` is now a menu** (`menu "Insert"` → `menuitem` Video / Attachment / Image / Carousel /
  Product); the inline Video/Attachment buttons on an empty page are gone.
- **Attachments only upload into a course that exists.** On the create flow (before the first
  `Save`) every attachment sits at `Uploading...` forever and no upload request fires; on a
  saved course (edit route) pdf/docx/xlsx/csv/mp3/zip settle in seconds. Test file uploads on a
  seeded course. **`.wav` now hangs at `Uploading...`** instead of `Upload failed` (L-37).
- A filled attachment shows `<name> <size> Replace` and the pdf adds `View only (no download)`;
  the empty-placeholder text `Upload attachment` disappears, so "which content type" checks keyed
  on that text read a filled block as plain text.
- Page content autosaves per page (`PUT …/products/{uuid}/pages/{pageUuid}`); wait for that
  response before `Save` + reload, or the reload can outrun it.
- The page toolbar is Bold / Italic / Strikethrough / Text style / Quote / lists / Add link /
  Insert — **no Underline** (the product description editor has one).
- The Video block has Play / Seek / Mute / Volume / Fullscreen / `Delete Video` and **no thumbnail
  picker** (CL-AUT-043).
- Create step 2 `Save` → `POST /shop/products` with `status: draft`, then redirects to
  `/products/update/online-course/{uuid}`. **Edit step 2 now has `Publish`** (disabled until
  something changes) next to `Save`, `Preview` and the icon-only `Version history`; `Save` on an
  active course keeps it active. Neither shows a toast (L-52, seen 2026-10-08 on the editor's own Save).
  Rechecked 2026-10-13 from the products list: Edit → change the title → `Save` did raise a sonner toast.
  Confirming delete from the list still raises none. That dialog reads `Delete Product` and
  `Are you sure you want to delete this product?` and does not name the product. The row's actions
  control and the share dialog's copy control still have no accessible name.
- `Version history` dialog: "A version is saved on every edit. The last 10 are kept." and entries
  like `a few seconds ago Current 08 Oct 2026 · 10:39 · Nothing to restore from this version`.
- The live preview shows a free course as **`Rp0`** (was `IDR 0`).
- Membership Benefits on a creator with no tiers: the switch is disabled with "You do not have any
  membership tiers yet, so this option is disabled." With tiers, switching it on lists every tier
  with its own `Add Benefit`. (Fixture: `inboxAccounts.emptyCreator`.)
- **Candidate bug (2026-10-08, not filed): a buyer question added while editing an existing course
  is not saved** — the `PUT /shop/products/{uuid}` body carries it in `additionalQuestions`, the
  response and a later GET return `additionalQuestions: []`, and the next checkout has no question.
  A price change in the same save does apply (orders at 15.000 then 20.000).
- **After Sales message is live, not per order**: an earlier buyer's `View Message` shows the
  creator's *current* message after it is edited (CL-AUT-046). The create form starts Customize
  Message ON while the edit page of an unconfigured course reads OFF (TC-OC-C-040, not filed).

## Publishing a course: what is and is not validated

Verified 2026-09-10.

- On the **create** flow step 2 the buttons are `Next: Publish` and `Save`. **`Save` is the
  draft save** — it creates the product with `status: "draft"`, which is invisible on the
  creator's public profile, absent from `/explore/products`, and 404 on its direct link.
- *(2026-10-08: edit step 2 now has `Publish` — see above.)* On an **already active** product there was **no Publish or Republish button at all** —
  only `Save`, and pressing it produces **no toast and no dialog**; the only feedback is the
  header stamp `This product is active and was last updated <date>` (`L-66`). Edits go live
  immediately and `shortUrl` never changes.
- Publish validates the **thumbnail** (`Thumbnail is required`) and nothing about content:
  a course whose chapters have all been deleted publishes happily and goes live with zero
  pages. **This is intended** — ruled by the product owner on 2026-09-22, so an empty
  course going live is not a defect to report; do not write a test that expects an
  episode-count validation.

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

**Correction, 17 Sep 2026 — the detail page does have a direct URL, just a different one:**
`/{creator}/product/{shortUrl}`, e.g. `/hendrarg/product/OSa-cJqCl2`. `shortUrl` is a column
on `products`. That route renders the real detail page (Overview / About Creator tabs,
`Purchase`, `Add To Cart`). What does *not* work is the uuid form, `/product/{uuid}`.

So a test that needs the product detail page should use the creator-handle + shortUrl route,
or navigate to it (Explore, the creator's shop, a tier's perk row) — not `/product/{uuid}`. This cost a full run of `TC-MEM-B-046` before it
was spotted: three different viewer states all landed somewhere else, which reads at first
like the page is broken rather than like the route having moved.

## Consultation availability (verified 2026-10-11)

**Schedule**
- **A day holds at most two time ranges.** `Add time slot for <Day>` adds a second range, which
  starts suggested one hour after the first. With two ranges the Add button is disabled.
  `Remove time slot for <Day>` removes either range.
- **Times have no conflict check.** Start and end selects (`Start time for Mon`,
  `End time for Mon`) each list 96 options, 00:00–23:45. None is disabled, even before the start.

**Setting controls**
- The Availability tab gives its switches hand-written ids: `#buffer-time`,
  `#allow-reschedule` and `#booking-frequency`. The `Status` switch reuses `#booking-frequency`,
  so anchor on the label text instead.
- Its selects and number boxes are unnamed, except `Minimum notice value`. The page also renders
  a hidden second copy of the form.
- **Presets**
  - Availability Range: 2 weeks / 1 month / **3 months** / 6 months / 1 year.
  - Duration: 15, 30 and 45 minutes, **1 hour**, 1.5 hours, 2 hours.
  - Notice unit: Minutes / Hours / Days.
  - Buffer Before Event and After Event: **5 minutes** / 10 / 15 / 30 minutes / 1 hour.
  - Reschedule takes a number of days (min 1). Frequency is a count plus `Per Day / Per Week /
    Per Month`.

**Buyer side**
- **Slots are spaced by duration plus both buffers, and a slot never crosses a range end.** With
  1 hour and 5+5 minutes over 09:00–17:00 plus 18:00–19:00, the slots are 09:00, 10:10, 11:20,
  12:30, 13:40, 14:50, 16:00 and 18:00.
- **The page shows only the next three open dates** (e.g. `Mon Oct 12 3 slots left`), plus a
  `View all` link.
- `View all` opens a month calendar dialog. Its day buttons are named with the full date
  (`Monday, October 19th, 2026`; the picked one adds `, selected`), and closed days are disabled.
  The chosen day's time slots appear inside that dialog.

**Booking rules seen from the buyer (2026-10-11)**
- **A new consultation starts with every day Unavailable.** `Create Consultation` then shows
  `At least one day must have availability`, which clears as soon as one day has a range.
  Minimum Notice defaults to `12` `Hours` (number box min 0).
- **Minimum notice closes whole dates** in the buyer calendar: with 3 Days, tomorrow is
  disabled.
- **Limit Booking Frequency counts per creator per day, not per client.** With `1 Per Day`,
  after one booking that date turns disabled for every new visitor, not just the one who booked.
- **The Availability Range is not applied to buyers.** The API stores it
  (`consultationConfig.availabilityRangeValue/Unit`, e.g. 2 weeks), and the edit form shows it,
  yet the buyer calendar still opens dates a month or more out, with slots. Reported 2026-10-11.
- **A free consultation books with no payment.** Pick the date and time, press `Confirm`, and you
  land on `/product/{uuid}/checkout?quantity=1&consultationStartTime=…&consultationEndTime=…`.
  Name, email, confirm email and phone are needed, then `Pay Rp0` calls `POST
  /api/v1/orders/quote`. The order is `completed` at once and the page moves to
  `/product/transaction/{id}`. Pressing `Pay Rp0` before the form echoes `Receipt & download
  link will be sent to <email>` does nothing.

**Status, save controls and edit flow (2026-10-11)**
- **The Availability `Status` switch pauses new bookings; it is not the product status.**
  - It reads `Turn on to accept new bookings. Turn off to pause bookings without deleting the
    consultation.`
  - Turning it off asks `Make Consultation Inactive?` (`You won't receive new bookings while
    inactive. Scheduled sessions will still run as planned.`, buttons `Yes, Inactivate` /
    `Keep Active`). The switch then reads `Inactive · Not accepting bookings`.
  - Nothing is sent on toggle. The next Save and Publish stores
    `consultationConfig.isAcceptNewBooking: false`, the product stays `active`, and the modal
    still says `Your consultation is live!`.
  - **Buyers can still book while it is off.** Slots and `Save my spot` stay, and a new guest
    booking completes. Reported 2026-10-11.
  - An existing booking's `/product/transaction/{id}` keeps showing `Purchase Successful!`.
- **Save controls differ by flow** (L-07).
  - Create Step 2 header: `Create Consultation`, `Save`. `Save` keeps a draft (POST, status
    `draft`).
  - Edit Step 2 header: `Save as Draft`, `Save and Publish`.
  - Step 1 has neither. The header is a `<header>` inside `main`, not a `banner` landmark.
- **`Save as Draft` on a live consultation takes it down at once**, with no confirmation (PUT,
  status `draft`). Its share link then shows `That page doesn't exist`.
- **Publish modal copy differs.**
  - First publish: `Product Complete` / `Your product has been successfully created.`
  - Republish: `Your consultation is live!` / `Your consultation is ready for bookings. Share it
    or manage it from your dashboard.`
  - Both show the same `/s/<shortUrl>` link with `View Product Page` and `Copy Link To Share`.
- **Moving availability leaves existing bookings alone.** Changing Monday 09:00–12:00 to
  13:00–15:00 after a 09:00 booking offers 13:00 and 14:00 for that date, and the 09:00
  booking's transaction still opens.
- **After Sales on create versus edit.**
  - On create, Customize Message is on (editor plus `0/1000 characters`, purpose copy `Turn this
    on to create personalized messages…`).
  - A consultation published without touching it reopens on edit with the switch **off**: the
    on-but-empty state is saved as off (same mechanism as L-49).
  - On edit, the editor sits in the Details tab. On create there are no tabs.
- **The `View all` calendar does not close on Escape.** Picking a date already selected again
  hangs a click, so check the day button's `selected` name first.
- **Reschedule copy:** helper `Buyers can reschedule up to N days in the future` versus field
  label `day(s) before session` (L-06).
- **Timezone:** the picker lists 112 zones, filtered by `Search timezone...`. Checkout states
  `In your local timezone, Asia/Jakarta (GMT +7:00)` and the URL carries `+07:00`.

## Bug-sheet retest, 6 Oct 2026

- **Changed 2026-10-12 — the picker now hides Draft and Inactive products** (searching a seeded draft or inactive title gives `No products found.`), so L-58 looks fixed; retest before closing. Earlier note: **Promotion `Find Product` picker has no status filter**: it calls `/shop/products?page=1&limit=10[&title=…]` and returns Draft and Inactive products (searched `PERSIB`, `Montir`, `Zoom Meeting`) with no status marker (L-58 still open). The first page happens to be all Active, so check by searching a draft title.
- `/shop/products?type=<unknown>` ignores the value and returns every product (M-43); `digital_product` is now a real type (1 product), distinct from `digital_download`.
- Products list (re-checked 2026-10-13): the type combobox is named `Filter by product type` and defaults to `All types`. Its options are Consultation, Digital Download, Digital Product, Discord Membership, Online Course, Telegram Membership, and Event Ticket — not Exclusive Content. Choosing Digital Product sets `?type=digital_product,digital_download,online_course` (an umbrella). Event Ticket sets `?type=ticket_event`. The filter changes the rows and stays selected when the status tab changes. Choosing a type updates the combobox and the table even when no `GET /api/v1/shop/products` arrives within 15s. Tab counts follow a search miss and ignore the type filter (Digital Download selected: Active tab still 39, while `totalResults` for that type was 9). Clearing a search returns page 1 of the status, so a hit such as Sikancil — active, but not on that first page — is absent again. A search miss, including a 3-space query, is a table row `No results.` and the tabs read 0/0/0. A hit filters the rows; the tab badge can stay on the unfiltered total until it refreshes. The query is not written to the URL. Search matches the title only, so a share URL or slug returns that empty row. Emptying the box restores the list already loaded in the browser and does not send another `GET /shop/products`. Repeating a query uses that cached result the same way. An unlimited SLOTS cell is an em dash; a capped product shows `sold/total`. The thumbnail and the title are both links and share one href. Active name links go to `/products/stats/{uuid}`; Draft name links go to `/products/update/<type>/{uuid}`. The Add New Product sheet shows seven cards; the group names `Digital Products`, `Memberships`, and `Appointment` are the colored lines on those cards. The same names also exist as accordion triggers that stay hidden on this layout, so a text lookup has to use the visible card line.
- Digital Download edit opened from the list is Content first. `Next: Set Details` stays on Content until a content-type card is checked, and the inline text is `At least one content type is required`. The visible checkbox is `#content-type-links` (a duplicate copy of the card is also in the DOM). Details (`2/2`) holds Title, Description, Thumbnail, and `Limit available slots`. The header buttons are `Save as Draft` and `Save and Publish`, and `Set Inactive` is still on this editor. The slot label is rendered twice; scope it to the Details tabpanel.
- `/products/update/consultation/{id}` is still 404; the editor lives at `/products/update/appointment/{id}` (create stays `/products/create/consultation`).
- Flexible-price consultation (`Start from Rp…`): `Save my spot` first opens a `Name a Fair Price` dialog; its confirm button is literally named `Input Amount`. Only after that does it go to `/product/{uuid}/checkout?…&givenPrice=…`, where a logged-in buyer's email is prefilled **and disabled**.

## Form traps re-checked 6 Oct 2026 (bug-sheet batch 2)

- **Digital Download create is Content first, Details second**: step 1/2 holds the content-type cards (`#content-type-media`, `#content-type-links`, `#content-type-digital` — checkboxes with no accessible name, click their `label[for=…]`) and the buyer-only Content Description; **Title lives on step 2** (`Next: Set Details`). Next with nothing ticked gives the toast `Please fill in all required fields before proceeding` and the inline `At least one of Upload Files or Embed Links is required` (it never names Media).
- File inputs on step 1: Media takes `image/*,.jpg…,video…` with `multiple`; Digital Files takes pdf/doc/xls/csv/zip with `multiple`. A video lists as `<name> <size>`; an image only as a blob tile (no name, no size, empty alt). Unticking a card drops its uploads at once, no confirmation, and re-ticking shows an empty section.
- Still true: the Description counter counts **words** (60 chars / 10 words → `10 / 500`); Title accepts 556+ chars with no `maxlength`; leaving a dirty form through the sidebar navigates away with no prompt; the consultation reschedule helper reads `up to 1 days in the future` next to the field label `day(s) before session`; the empty membership tier submit (button `Add Membership`) lists `Thumbnail URL is required` under the field labelled Hero Image.
- Consultation (and other) editors render the Availability section **twice** (mobile + desktop copies) — scope locators with `.filter({ visible: true })` or strict mode trips.

## Digital Download create form, re-checked 2026-10-08

- **The Add Product type is now "Digital Download"** (button `Digital Products Digital Download
  Downloadable files like templates, PDFs, CSVs, photos, and videos.`); heading `New Digital
  Download`. The old "Digital Product" label no longer matches.
- Step 1 = content cards + buyer-only Content Description; Title/Description/Thumbnail/pricing are
  step 2. Card checkboxes `#content-type-media|links|digital` (no accessible name).
- Media accepts `.jpg .jpeg .png .gif .webp .svg .mp4 .mov .avi .webm .ogv .mp3 .wav .ogg .m4a
  .aac .flac`; Digital Files `.pdf .docx .doc .xlsx .xls .csv .zip`. Files only upload **at
  publish**. **`.ogv` and `.avi` are rejected there** (`POST /file/upload/create` → 500
  `unsupported content type: video/ogg|video/avi`) and `Next: Publish` then stalls silently — no
  toast, no product (candidate bug, CL-AUT-047). Re-checked 2026-10-13: publishing `.ogv` and `.avi`
  still never opens Product Complete. A `.txt` dropped into Media is no longer listed, and there is
  still no rejection message. Text bytes renamed to `.pdf`/`.docx`/`.zip` are listed on step 1, then
  `Next: Publish` stalls the same way — clear those stubs before a real publish. The Media drop
  zone is the dashed `Attach File(s)` box (`Select Files`). Eleven files (every image extension
  plus five videos) all stay listed; the zone shows no count or size cap and no limit message.
  A listed video row can be removed from its own button.
- Step 2 with Digital Files shows `Downloadable File` (default ON). OFF → the buyer's order page
  lists the file with `View` but no `Download`.
- **Limited Slot**: `Limit available slots` reveals `Available slots` (default 100, +/−) and `Show
  remaining count to buyers` (ON); payload `isLimitProductSales / limitProductSales /
  showRemainingSlots`. Buyers see `Selling fast · 0 / 5 · Limited slots, grab yours before it's
  gone.` (sold/total), not the helper's "X of Y slots left".
- **Membership benefit** needs `Add Benefit` → access (`Everyone active`, tenure options) → type
  (`Free Access` / `Discount`) → **`Confirm`**; without Confirm the payload carries
  `tierMembershipBenefit: []`. Members of that tier see a `Free Access` badge on the product page,
  others only the price.
- A replayed deposit webhook answers 400 `order status not pending` — no duplicate order.
- The After Sales section's only file input is the message editor's `Insert image` (`image/*`).

## Bug-sheet batch 3, 7 Oct 2026

- **Promotion create/edit show no success toast; delete does** (`Promo deleted successfully`). The delete dialog still names no object (`Are you sure you want to delete this promotion?`). Row actions are `Set Inactive / Edit / Delete` behind an unnamed `dropdown-menu-trigger`.
- **Self-affiliate still saves**: `Find Creator` offers the promo owner (`@hendrarg`) and `POST` carries `affiliatorUUID` = the owner's uuid → 200.
- Generated promo codes vary 8–12 characters; the regenerate button next to `Discount code` has no accessible name; the code field stays editable.
- **After-sales Customize Message over 1000 chars now blocks Save — silently**: the editor accepts 1005 chars (`1005/1000 characters`), then `Save as Draft` sends no request and shows nothing; at 900 chars it saves (PUT 200, then redirects to /profile). Switch ON with an empty message still saves (PUT 200, no message) and reloads as OFF.
- **Discord Membership edit**: `Next: Publish` stays disabled until something changes; saving a real change still shows `Your product has been successfully created.` Advanced Settings on that editor are `Schedule Publish`, `Availability`, and `Hide from Explore` (2026-10-13). There is no `Set benefits for membership` switch. A custom buyer question added on that form is absent after publish and reopen; price, Hide from Explore, the after-sales note, and after-sales links from the same save are still there. Duration `0` stays on step 1 and the field reports `Duration is required`. The title input keeps 556 characters and has no `maxlength`.
- **Membership tier Hero Image**: a 686×447 image is accepted with a preview and no error (min 500×500 is only text). The first file input on `/membership/create` belongs to the description editor (`image/*`); the Hero Image input is the one accepting `image/jpeg,…`.
- **Campaign create** (`/profile/campaigns/create`): a 1×1 banner is accepted with a preview, no error.
- **2026-10-09 (OC-10): `.wav` is no longer offered.** The panel reads `.pdf, .docx, .xlsx, .csv,
  .mp3 or .zip` and `accept` has no `.wav`; the backend was not changed. The notes below on
  `.wav` are history. In a **new, unsaved** course, an attachment block (even `.mp3`) sits at
  `Uploading...` and fires no `file/upload` request. Seed the course first and `openEdit` it, as
  AUT-OC-002 does.
- **Online Course attachment**: `Insert > Attachment` opens an `Upload attachment` panel (`.pdf, .docx, .xlsx, .csv, .mp3, .wav or .zip`); a .wav fails at `POST /api/v1/file/upload/create` → 500, `Upload failed`. The editor autosaves pages (`PUT …/pages/{id}`), but the failed block did not persist after reload.
- PPV post price has no server floor: `POST /api/v1/posts` with `pay_per_view` and price 0 or 19 999 → 200. `DELETE /api/v1/posts/{uuid}` cleans up (200, then GET 404).
- `POST /api/v1/tier-memberships` requires only name, description, isActive, prices, tierMembershipProductAndBenefits (an empty array passes); it accepted priceIDR 10 000 and no thumbnail, and **ignored `isActive: false`** (stored true). `DELETE /tier-memberships/{uuid}` soft-deletes (GET afterwards answers 500, not 404).

## Product Review on the PDP (live on dev, checked 2026-10-11)

PRD: `projects/yapp/product-review - prd`. Digital Product only; an Online Course PDP has no section and
`/reviews/me` answers `reason: unsupported_product_type`.

- **Where it sits:** a `Reviews & Ratings` block inside the right-hand purchase card, under Purchase /
  Add To Cart. The header carries the aggregate (`★ 4.5 (2 Ratings)`), then a 5→1 distribution, then the
  review cards — newest first. The list is in that card, **not** under the description (Overview tab) as
  the PRD asks.
- **0 reviews:** no block at all for non-buyers and guests. An eligible buyer sees only the
  `Write a review...` button — no 0.0, no placeholder. One review is enough for the aggregate.
- **Form:** dialog `Write a review` → radiogroup `Your rating` (radios `Rate N star(s)`), one textbox with a
  `n/500` counter that hard-stops at 500, button `Post Review`. No stars → inline
  `Please select a star rating`, text kept. Rating-only posts fine. The button disables while the POST runs
  (one request only). A failed POST shows inline `Couldn't submit your review. Please try again.` and keeps
  stars + text. Success toast: `Thanks! Your review has been posted.`
- **Cards:** stars, `n.0 · 1m ago`, text, author chip (username; your own reads `You`). **No Verified
  Purchase badge** even though the API returns `isVerifiedPurchase: true`. No edit/delete affordance.
- **Non-buyers / guests** read everything and get no CTA, but the PRD's gate message
  `Only buyers who purchased this product can leave a review.` is never shown.
- **Creator on own PDP:** reads all, no write CTA, a `Hide` button per card. Hidden card shows
  `This review is hidden and won't affect the rating.` with **`Show Again`** (not "Restore"); toast
  `Review hidden. It no longer appears on your product page.` Hidden reviews leave the aggregate for
  everyone — but **the author still sees their own hidden review** (as `You`, no hidden marker).
- Editing the product (title/description via `PUT /api/v1/shop/products/{uuid}`) leaves reviews and the
  aggregate untouched.
- **API** (`/api/v1/products/{uuid}/reviews`): `GET /summary` (averageRating, totalReviews,
  distribution), `GET /me` (`isOwner`, `canReview`, `reason`: `not_purchased | already_reviewed |
  own_product | unsupported_product_type`), `GET ?page&limit&sort=newest`, `POST {rating, text}` → 201,
  `POST /{id}/hide`. Non-buyer → 403, rating 0/6 → 400 `invalid_rating`, text 501 → 400 `text_too_long`,
  second review → 409, PUT/PATCH/DELETE on a review → 4xx. Posting reviews quickly from scripts can hit
  **429** — retry after ~20 s.
- Eligibility = a completed (deposit-webhooked) purchase; a free digital product that was not claimed is
  `not_purchased`; after a claim it is untested.

- **By design (confirmed 2026-10-12, PM/dev):** four PRD deviations are intended, not bugs — no Verified
  Purchase badge on cards; no "Only buyers…" gate message for non-buyers/guests; the author still sees
  their own hidden review; aggregate + list live in the right-hand purchase card (desktop). Test against the app,
  not the PRD text, for these.

- **Mobile Viewport Behavior (checked 2026-10-12):**
  - **Tab placement:** On mobile viewports (< 768px), there is no right-hand purchase card. Instead, a dedicated
    **`Review`** tab is added to the tab strip (`Overview`, `About Creator`, `Review`). The Reviews & Ratings
    block renders inside this tab rather than on the overview description.
  - **Sticky bottom overlap defect:** On mobile, the sticky bottom bar (`Add to Cart` + `Purchase`, `z-index: 50`)
    overlaps the bottom of the `Write a review` dialog. The `Post Review` button (y: ~765px, bottom: ~813px) is
    ~90% covered by the sticky bar (top: 771px), making it difficult to tap without scrolling/dismissing.
  - **Close button on mobile modal:** The close icon container at the top right of the `Write a review` modal renders
    as an empty white circle without a visible "X" glyph.

- **Custom Theme Dynamic Colors Gaps (checked 2026-10-12):**
  - When a creator applies a `customTheme` (with custom `primaryColor`, `secondaryColor`, and `backgroundColor`),
    the Reviews & Ratings section fails to inherit the creator's theme colors:
    - **Distribution progress bars:** Hardcoded to default brand purple gradient (`bg-gradient-to-r from-primary/60 to-primary`
      resolving to `#582AF0`), ignoring the creator's `primaryColor`.
    - **`Write a review...` button:** Border and text are hardcoded to `#582AF0` (`rgb(88, 42, 240)`).
    - **`Post Review` button in modal:** Background is hardcoded to `#582AF0` (`rgb(88, 42, 240)`), ignoring `primaryColor`.
    - **Author chip icons:** Badge icon is hardcoded purple `#582AF0`.
    - **Stars:** Use neutral `fill-foreground` / black rather than theme primary or amber/gold.

- **Theme and mobile fixes verified 2026-10-15 (DP-24 → DONE):** the review section now follows the
  creator's theme — distribution bars (gradient), the `Write a review...` outline button, `Post
  Review` and the icons use `customTheme.primaryColor` (seen as `rgb(240, 41, 41)` on geri's
  `#F02929`), no longer the default `#582AF0`. On mobile (390×844) the PDP has a `Review` tab; the
  `Write a review` bottom sheet sits at z-index 901 above the sticky Add To Cart / Purchase bar
  (z 890), so `Post Review` is fully clickable, and its `Close` is a black circle with a white X.
- **Ready-made review fixture:** geri's `Test 123` (`/geri/product/dOeMNMiMzH`) has 2 visible reviews
  (4.5 · 2 Ratings), and **hendrarg bought it without reviewing** — token1 on the buyer app is an
  eligible buyer there, no purchase needed. Never post a review with it (one per buyer, final).
