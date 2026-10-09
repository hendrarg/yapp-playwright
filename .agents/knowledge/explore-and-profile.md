---
title: Explore, profile, and landing
type: note
category: project
tags: [yapp, product, automation, explore-and-profile]
project: yapp
created: 2026-09-04
updated: 2026-09-29
sources: 0
status: active
---

> [[projects/yapp/knowledge/index|Knowledge index]]

# Explore, profile, and landing

Buyer discovery surfaces and the creator's public profile.

## Explore layout as of 2026-10-07

Sections, top to bottom: **Recommended** (header with See More → `/explore/products`, then a row of
category chips `All` / `Digital Product` / `Online Course` / `Discord Membership` / `Telegram
Membership` / `Events and Tickets` / `Consultation`, then a 12-card grid — the chip sets
`?productType=<type>` and the grid refreshes a moment later), **Part of your Membership** (new:
cards with `Claim Now` / `Open Course` for products the buyer's memberships include), **Popular
Products** (8 cards, See More → `/explore/products`), **Creators For You** (carousel, See More →
`/explore/creators`). **"Recommended For You!!" is gone** — AUT-EXP-005 waits on the TCs being
rewritten (CL-AUT-029).

- Popular follows `GET /products/featured` ordered by `featuredProductPosition`; Creators For You is
  `GET /creators/featured` (helpers `getFeaturedProductTitles`, `getFeaturedCreators`).
- **Popular cards carry no product-type badge** while Recommended cards do (bug L-12, still open).
  Creators without a photo get a gradient circle, not an `<img>` — count the creator name, not images.
- The search keyword lands in the URL as `?keyword=Asep+pisan` (spaces as `+`) — compare via
  `searchParams`, not a `%20` regex. Results refresh asynchronously, so poll until they match.
- **Past events are filtered inconsistently** (2026-10-07): an event dated three days ago is absent
  from global search and from Recommended → Events and Tickets, but the `/explore/products`
  catalogue search ("Find products") still finds it, and its page opens ("Event has started").

## Explore is fed by two different endpoints

- **Recommended** comes from `GET /products/explore`.
- **Popular Products** comes from `GET /products/featured` — and that is a **manual
  curation** ordered by `featuredProductPosition` (1…7, `null` sorting last), **not a
  popularity ranking**.

Never write a popularity assertion against the Popular Products section; assert the
curated order instead.

## What discovery actually excludes

Measured 2026-09-22 with a full census of `GET /products/explore` (3 pages, 179 entries)
against the database. Three independent gates decide whether a product is discoverable,
and they sit at different levels:

| Gate | Effect |
|------|--------|
| `users.is_hide_from_explore` | removes **every** product of that creator — `pier` has 11 active products across 6 types and not one appears in explore |
| `products.is_hide_from_explore` | removes that single product |
| past event date | a `ticket_event` whose `ticket_configurations.event_date` has passed is dropped; ~56 active past events are absent while their creators' other products stay listed |

`products.is_hide_from_profile` is **not** one of these gates — six products carrying it
(`Test`, `Test Discord Member`, `Test Flexible Crypto`, `Test Ganti Title`,
`Test Resched Consultation`, `Sikancil`) are listed in Recommended anyway, and their public
product pages load. So a product missing from explore is never explained by that flag
alone; check the creator flag first.

One product is absent for a reason none of these explain: `GoTC Youth Conference`
(geri, event 26 Sep 2026, still on sale) is missing from explore **and** its public page
`/geri/product/o2Slv6ZlQf` returns `That page doesn't exist`. Whatever makes it
unreachable also keeps it out of discovery, which is at least consistent — do not use it
as a fixture.

Popular Products applies its own status gate on top of the curation: nine products carry
`is_featured_product`, and the one in `draft` (`Quick`, position 0) is the one the
endpoint drops.

## A creator with no visible products has no Shops tab

Verified 2026-10-06 by hiding both of `sundanese`'s products from the profile (then restoring):
the **Shops tab disappears** — the profile shows `Links`, `Feeds`, `Support` and opens on Links —
rather than showing an empty-state message. TC-FE-C-067 expects "No products added yet"
(clarification CL-AUT-028). `PUT /api/v1/shop/products/{uuid}/hide-from-profile
{isHideFromProfile}` (helper `setProductHideFromProfile`) toggles it.

## Official badge and the missing NSFW flag

Verified 2026-10-05 by toggling the flags on `sundanese` (then restored):

- **Official = `users.is_verified_creator`.** The badge is an unnamed gradient SVG whose
  `<mask id>` contains `verified` (`VERIFIED_BADGE_SELECTOR`). It follows the name on the
  Explore search card, the profile header, every feed/profile post card and the post detail.
  Only three dev creators carry it (`iyansr2222`, `angeltest`, `miltonayler`); tests flip it
  on with `dbFixtures.set('users', uuid, { is_verified_creator: true })`.
- **There is no creator-level NSFW flag.** `content_settings.is_nsfw` is per product. The only
  creator switch, `users.is_hide_from_explore`, removes the creator from Explore **and** from
  exact username search (`No creators found for "sundanese"`), so it cannot be what the NSFW
  TCs describe (B-032 expects search to still find them). Clarifications CL-AUT-016..019.
- Explore's landing page never listed `sundanese` even unflagged — "Creators For You" is a
  short curated/random strip, so absence there proves nothing; assert through search.
- The search box's accessible name is its placeholder `Search creators, products and more`
  (the old `Search` name is gone); `?keyword=` drives the results page.

## Explore listing totals are not counts of what you get

`GET /products/explore?limit=200` reports `totalResults: 225` and delivers 179 rows over
its 3 pages; `?product_type=ticket_event` reports `totalResults: 35` and delivers 1 row.
The total is computed before the eligibility gates above run. **Never assert on
`totalResults`** — page through `data.data` and count the rows.

## Dead and misleading fields on the account payload

- `GET /accounts` carries **no `interests` key** (fixed 2026-10-09, CP-11; until then it was
  always `null`). The real data is at `GET /accounts/interests`.
- The correct profile asset fields are `photoProfileUrl` and `backgroundUrl`.

## Both test accounts are already creators

token1 (`hendrarg`) and token2 (`anthony_mosciski`) are both `isCreator: true`, so the
`Be A Creator` CTA always routes to the creator dashboard and the buyer-to-creator
onboarding flow never opens on either of them.

## Landing page CTAs are anchor + button pairs

Every landing CTA renders an `<a href>` wrapping a `<button>` that has no `href` of its
own — an environment assertion must target the **anchor**. The footer quick links are
the opposite: all four are `<button>` elements with **no** `href`, so their destination
can only be verified by clicking and observing the scroll position. Manual verification
2026-09-23 found the four links **do** land on their matching feature card and work as
intended — do not trust an automated scroll/snapshot check here, because the feature
section auto-rotates (below) and an earlier automated run misread all four as landing at
the same `scrollY` 935 when they were merely caught mid-rotation.

## The landing feature section is an auto-rotating carousel

Five tabs (`Digital Products`, `Exclusive Content`, `Tips & Donations`,
`Link Page Builder`, `Livestream Overlay`) sit above five cards (`Sell Digital Products`,
`Monetize Your Exclusive Content`, `Receive Support From Your Fans`,
`Your Online Hub Simplified`, `Engage Your Viewers In Real Time`), and the card on screen
**rotates on its own**. Whatever card a snapshot catches is therefore not the one the tab
selected: the same click yields a different card on every run. Read each card's copy
straight from the DOM by its title, and never conclude a tab or footer link is broken from
a timed snapshot — the rotation, not the control, is usually what a snapshot caught.

The feature-card copy itself is **intended** as of 2026-09-23 even where it looks wrong:
the `Monetize Your Exclusive Content` card carrying the Digital-Products description, and
the `Sell Digital Products` card listing campaign/tipping benefits, were both ruled
expected by the product owner — not a copy bug.

## Profile tab order is server state

The profile tab strip is reordered through `PUT /accounts/profile-tabs`; the default
body is `{"tabs":["product","link","feed","membership"]}`. Product cards on My Page are
reordered separately through `PATCH /shop/products/reorder`, and toggling a product's
Hide from Profile flag resets it to the front of that arrangement.

## Empty tabs are hidden, not explained — except Links

Measured 2026-09-09 across three creators. A public profile **drops a tab entirely when
its content is empty** rather than rendering an empty state: `mppp`, who owns no products,
has no `Shops` tab at all, so a "no products yet" message never appears. The one exception
is Links, which does render a proper empty state — `No links yet. This creator has not
added any links.`

**The Exclusive Only empty state is the wrong copy and it lies.** On `owii` — four active
public posts, zero exclusive ones — selecting `Exclusive Only` inside the Feeds tab shows
`This creator hasn't posted anything yet. Follow them to get their updates!`. The creator
has posted; only the exclusive filter is empty. The filter reuses the empty-feed message
instead of one about exclusive content.

## Only active links reach the Links tab

hendrarg holds 6 active and 4 inactive rows in `user_links`; My Page → `Links` renders
exactly the 6 active ones, each as title + URL preview + click count with an
`aria-checked=true` switch. Inactive links are not listed at all, so an "inactive status"
is never displayed anywhere. The same tab also mixes Campaign blocks above the plain link
rows.

## The Links section has a Text block (Add Block → Text)

Shipped to creator dev and verified live 2026-09-29 (PRD "My Page — Links — Text Item",
parent ticket `CP-10`). `My Page → Links → Add Block` offers **four** Suggested tiles now:
Folder, Link, Campaign, and **Text** (a fourth green tile), above the embeddable-app list
(Instagram/TikTok/YouTube/X). Selecting Text opens an **"Add Text"** editor dialog immediately.

**The editor is TipTap/ProseMirror** (`.tiptap.ProseMirror` contenteditable, placeholder
`Write something…`). Toolbar, left→right: a **paragraph-style** select (default `Normal`),
**Bold**, **Underline**, **Clear formatting**, **Bulleted list**, **Numbered list**, **Align
left/center/right**, **Justify**, and a **`</>` HTML code view** toggle (aria-label `HTML code
view`) at the far right. There is **no colour control, no font-size, and no Italic button** —
consistent with the PRD scoping colour to Epic 3 (theme tokens, fast-follow) and matching the
allow-list below.

**Data model — a Text block is a `link` row, not a new table.** It appears in
`GET /api/v1/accounts/link` with `linkType: "text"` and its HTML in the **`htmlContent`**
field (other block types leave `htmlContent` empty). Endpoints:

| Action | Request |
|---|---|
| Create | `POST /api/v1/accounts/link/text` body `{htmlContent, isActive, position, usedCodeView}` → `{message:"Text block saved", data:{id,…,linkType:"text"}}` |
| Update | `PUT /api/v1/accounts/link/text/{id}` (same body) |
| Delete | `DELETE /api/v1/accounts/link/{id}` (the generic link delete, **not** `/link/text/{id}`) |

`usedCodeView` is a boolean the client sends (tracks whether the code view was used — matches a
PRD success metric).

**The server-side sanitizer is real and correct, on every save.** Verified by POSTing malicious
`htmlContent` directly to the API (the attacker path) and reading it back, and again on `PUT`
(re-sanitised, not just first save):

- **Stripped:** `<script>`, `<style>`, `<iframe>`, `<img>`, `<a>`/`href`, `<button>`, every
  inline event handler (`onerror`, `onclick`, `onmouseover`, …), and `style=`. The tag is
  removed but its **inner text is kept as plain text** (e.g. `<a href=…>EVILLINK</a>` → `EVILLINK`).
- **Also stripped:** `<i>` (italic) — italic is not in the toolbar, so it is not in the allow-list.
- **Kept (allow-list):** `<table>/<thead>/<tbody>/<tr>/<th>/<td>`, `<b>`/`<strong>`, `<u>`,
  headings (`<h2>`, `<h3>`), `<p>`, and lists. Tables typed as markup in the code view **render
  as a real table on the public profile.**

**Public rendering is safe and hidden blocks are private.** Public/visitor blocks come from
`GET /api/v1/account/{uuid}/link-combination` and carry only the sanitised `htmlContent`; a
headless guest render of the public profile showed the table rendered, `document.querySelectorAll('table')`
= 1, and none of the injected `window.__pwned/__img/__btn` fired. A **hidden** block
(`isActive:false`) is **absent** from that endpoint for both a guest and the owner — it does not
leak.

**Empty-content guard has a gap (`CP-10` subtask, Low).** The editor disables **Add Text** when
the body is truly empty, but **whitespace-only content re-enables it**, and the server accepts
empty / whitespace / all-sanitised-away content (`POST …/link/text` → 200, stored `htmlContent:""`),
creating a blank block. Same "UI guards, server doesn't validate, whitespace bypasses" family as
the Tipping quick-amount and Event-title gaps.

## There is no UI for configuring profile tabs

`PUT /accounts/profile-tabs` exists (see above) but nothing drives it from the browser.
Customize's `Profile layout` section offers only the layout styles `Default` and `Simple`;
My Page's tabs (`Products`, `Links`, `Feeds`, `Memberships`) are not draggable, carry no
drag handles, and the page contains no configure/arrange/reorder wording. Note the API's
tab list has no `support` entry either.

## Switch to Buyer is a real role switch, not a preview overlay

My Page's `Switch to Buyer` navigates to the **buyer app** at `/profile` and renders the
buyer surface — tabs `Shops`, `Links`, `Membership`, `Support`, no `Add Product`, no
`Customize` — with a `Switch to Creator` control to come back. It lands on the user's own
buyer profile, so it does not by itself show a creator's locked exclusive content.

## My Page is gated by two stacked first-run dialogs

Verified 2026-09-09 on an account that had long since onboarded, so this is not limited to
brand-new creators. `/profile` opens behind a `Welcome to Yapp!` modal ("All in one
platform to become more closer and interact with your fans") whose only action is
`Let's Get Started!` — and pressing it **starts a second overlay**, the single-step tour
`💬 New: your Messages` whose only visible button is `Go To Messages`. That tour is closable
through its `×`. Until both are cleared, every control on the page — tabs included — is
unclickable, which is the same trap recorded for the Event & Tickets suites.

## The buyer edits their own profile at /profile/settings

Verified 2026-10-05 (buyer `anthony_mosciski`). The buyer's own `/profile` shows avatar, display
name, `n following`, a `My Memberships` card and only two tabs — `Feeds` and `Support` (no Shops,
Links or Exclusive tab; Exclusive is the `All Feeds` / `Exclusive Only` filter). The pencil badge on
the avatar (an unnamed `span` with an svg) opens **`/profile/settings`** → tabs `Profile and Account`
/ `Transaction History`: `Change Banner`, an avatar change badge, `Username`
(placeholder `Enter your username`), `Your Name`, a disabled `Email`, and `Save`. So a buyer **can**
edit their identity on the buyer app — TC-FE-B-064 ("no edit controls") is out of date.

**Username rules live on the server only.** The form has no maxlength/pattern and no inline errors;
`Save` is enabled for anything non-empty. `POST /api/v1/accounts/username/change {username}` answers:
empty → 400 `Username is required`; 3 chars → 400 `Username must be at least 4`; spaces/symbols →
400 `invalid username`; 26 chars → 400 `Username failed validation (max)`; taken → **409
`username already exists`** (the UI shows that text); upper-case letters are **accepted**.

**Saving a username** redirects to `/profile` with the overlay "Looking good, <username>!" —
"Your new username successfully updated." — closed by `Got It!`. The modals on this page are plain
fixed overlays, not `role="dialog"`.

**Profile picture:** avatar badge → `Upload Profile Picture` (hidden `input[type=file][accept=image/*]`,
"wider than 1080px, max 10MB, 1:1") → `Crop Selected Picture` (zoom slider, Cancel / Apply). **Apply
saves immediately** (`PUT /api/v1/accounts/profile/photo`) and shows "Profile Picture Updated!" /
`Got It!` — no Save needed. `Delete Current Photo` → "Remove Current Photo" → `Yes Remove` sends
`DELETE /api/v1/accounts/profile/photo` (with no photo it answers 500, S3 key empty).

**Fixed 2026-10-08 (was M-61 / F&E-13):** a picture upload used to blank the display name
(`users.name` → `""`; the PUT response carried `name: ""`), which left both Username and Your Name
empty and `Save` disabled. The endpoint now writes only `photo_profile_path`: the response keeps
`name`, and `phone_number` survives the upload. `dbFixtures.protectProfile()` snapshots name,
username, photo and cooldown and restores them. It does **not** restore phone or bio.

**The buyer's public page `/<username>` can render as the link-in-bio template** (seen
2026-10-08 right after a username change; the QA buyer has `isCreator: true`): banner, avatar
initial, a `Tip 2850` button, `No links yet.` and a `Supports` tab. This template has **no `main`
landmark**, and the display name is an `h1`. A check scoped to `main` fails even though the name
is on screen. An earlier run of the same flow rendered the app layout, which does have `main`.

**A successful change starts a 24-hour cooldown** (`users.username_changed_at`): the next change
returns **500** `you changed your username recently, you can change it again in 23 hours…`. A test
that changes a username must reset `username_changed_at` (DB fixture) to put the old one back —
learned the hard way on 2026-10-05, when a probe left the buyer renamed until a DB restore.

## Customize: what the profile form actually enforces

The creator edits the profile at `/customize` (four section tabs: Theme, Profile, Tip
Button, Domain), **not** at `/profile` — that route is My Page. Verified 2026-08-31.

**Only Bio has a length limit.** `#design-profile-bio` carries `maxlength=200` and
shows an `n/200` counter. `#design-profile-name` (Your Name) and
`#design-profile-username` (Link) have **no `maxlength` and no counter at all** — the
same shape as the Event title defect.

**Required-ness is asymmetric and invisible.** Clearing Your Name leaves `Save`
disabled forever with no error message, so the field is effectively required but never
says so. Clearing Link *enables* `Save`. Nothing in the UI explains the difference.

**Invalid colours are swallowed.** The three custom colour fields
(`#theme-backgroundColor`, `#theme-primaryColor`, `#theme-secondaryColor`) are plain
text inputs. A valid hex enables `Save`; `zzzzzz`, `#GGGGGG`, `#12` and `red` are all
kept verbatim in the field with **no error message**, and `Save` simply stays
disabled. The disabled button is the only feedback that a value was rejected.

**The palette is 5 + 3, not "about ten".** Theme presets are exactly Default, Sunset,
Ocean, Forest and Midnight, plus a non-selectable `Custom` entry; the Custom section
holds exactly three colour controls. There is no ten-colour swatch palette anywhere.

**Preview has two device modes.** The `Preview` dialog holds exactly two toggle
buttons plus Close: the default renders the iframe at **1222px**, the second at
**388px**. Neither toggle has an accessible name — they are icon-only.

**Image upload guidance** (Header Background → Upload tab): `accept="image/*"`, single
file, and the copy states *wider than 1080px*, *maximum file size 20MB*, *recommended
aspect ratio 1:1*.

Re-verified 7 Oct 2026 (L-53 → CP-12, still failing): `/customize` → Profile → Header has
`Change profile banner` (Gallery / Upload tabs) and `Change profile picture`; **both show the same
guidance** (1080px / 20MB / 1:1). Output is a `data:image/jpeg` preview: banner `Crop Header` →
**900×506** from a 1920×480 input; profile `Crop Profile Picture` → **600×600** from 1600×1600.
**On `/customize`, Apply only stages the image** ("You Have Unsaved Changes", needs `Save`) — unlike
the `/profile` avatar flow, where Apply saves at once. Leaving with unsaved changes raises a
`beforeunload` dialog. hendrarg's `Your Name` is currently empty (M-61 residue).

## Explore search fans out to three endpoints

Verified 2026-09-01. One keystroke burst fires **three parallel requests**, and the
parameter name is not consistent between them:

| Endpoint | Parameter |
|----------|-----------|
| `campaign/explore` | `q` |
| `creators/explore` | **`keyword`** |
| `products/explore` | `q` |

The input is debounced — six keystrokes produced a single wave of requests, not six —
and the query **is** reflected in the page URL as `?keyword=`. That is the opposite of
the creator Products list, whose search never touches the URL (`TC-PROD-C-061`).

Matching is **case-insensitive** and **partial**: `hendrarg`, `HENDRARG`, `HeNdRaRg`
and `hend` all return the creator. Appending a special character (`hendrarg!`) returns
zero, so there is no character normalisation.

**Assert on the API response, not the page text.** The QA account is itself a creator,
so its own name sits in the page header and any `innerText` check for it is a false
positive. Count the `creators/explore` payload instead.

**Still unknown:** leading/trailing whitespace. Keystrokes were dropped mid-typing in
testing, so the keyword actually sent was not the one intended and the result is not
evidence either way. Worth settling, because the creator product search and promo code
redemption both *reject* padded input.
