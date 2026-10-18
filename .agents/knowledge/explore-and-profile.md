---
title: Explore, profile, and landing
type: note
category: project
tags: [yapp, product, automation, explore-and-profile]
project: yapp
created: 2026-09-04
updated: 2026-10-16
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

## Public profile API — the singular `/account/` family (2026-10-14)

Captured from the browser on `/<username>` (guest). The public profile reads from
**`/api/v1/account/...`** (singular); `/accounts` (plural) is the signed-in user's own account.
Guessing `/users/{username}`, `/accounts/{username}` or `/creators/{username}` gets 401/404.

- `GET /account/username/{username}` (resolves the uuid), then in parallel:
  `/account/{uuid}/social-link`, `/account/{uuid}/quick-amounts`,
  `/account/{uuid}/tier-memberships`, `/account/{uuid}/link-combination`,
  `/account/{uuid}/products` (+ `/products/pinned`), `/account/username/{username}/profile-tabs`,
  `/account/username/{username}/profile-customization`, `/posts/user/{uuid}?visibility=public`,
  `/rate/exchange`, `/lifetime-prices/{username}/check`.
- Every profile visit also fires **`POST /view/counter/{uuid}`**, which writes to view stats. Leave it
  out of anything replayed in bulk (the k6 `buyer/browse` scenario skips it).
- **`/account/{uuid}/quick-amounts` answers HTTP 500 with body `{"status":404,"message":"quick
  amount not found"}`** for a creator who never saved quick amounts (5 of 7 featured creators on
  2026-10-14). The page copes and falls back to the default chips, but the API reports a 5xx for
  a normal empty state.
- **Featured creators can include a broken account**: `testuser123` (user id 14, not deleted) is in
  `GET /creators/featured`, but `/account/username/testuser123` and its uuid endpoints all
  answer 500 `user not found.` (`profile-tabs` 404). Do not pick a random featured creator for a
  profile assertion without checking it resolves.

## Some images fail in the Next.js optimizer (2026-10-14)

Seen by the k6 `buyer/vitals` run on landing / explore / profile / product, as a guest:

- **`/_next/image` → 400 `Unsupported image format`** when the source asset on `asset-dev.yapp.ink`
  is served **without a `Content-Type` header** — the bytes are a valid PNG/JPEG (e.g. a product
  thumbnail of creator `d52a08cb…`), so the upload stored no content type.
- **`/_next/image` → 403 `Error loading source image`** when the signed source URL itself answers
  CloudFront **`AccessDenied`** while unexpired — `hendrarg`'s current profile photo
  (`84ae3e39…/photo-profile/1c93a3de….jpg`) is one. Likely a missing object.
- A visual assertion on these images (thumbnail, avatar) fails for the asset, not the page.

## A product share link is the slowest public page (2026-10-14)

`/s/<shortUrl>` redirects to `/<creator>/product/<shortUrl>`; in real Chromium (guest) the product
page measured TTFB p75 ~2.3 s and LCP p75 ~3.6 s, against ≤0.6 s TTFB / ≤2.3 s LCP for landing,
explore and creator profile. Small sample (4 visits) — see `perf/baseline.md`.

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

- The footer promotion card on `/explore` uses `[content-visibility:auto]` and contains copy
  "Turn your ideas Into Income" and "Start creating and selling your digital products today."
  with an image decoration and a `Be A Creator` button.
- When clicked by an authenticated creator account, it opens a new tab to `creators-dev.yapp.ink/profile`
  directly (greeting with a first-time "Welcome to Yapp!" modal if not previously dismissed, after which
  the creator dashboard / "Home" / "My Page" is directly accessible without onboarding).
- When clicked by an unauthenticated guest visitor, it opens a new tab to `creators-dev.yapp.ink/auth`
  with the login/email input form, leaving the original tab on `/explore`.
- Shared products displayed in both Popular Products and Recommended sections display consistent
  prices (e.g. matching "Start from Rp10.000", fixed prices, or "Free", and paid products are never
  advertised as Free).


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

**Empty-content guard: the UI half is fixed, the server half is not (`CP-10`, re-checked
2026-10-12).** **Add Text** now stays disabled for an empty editor *and* for whitespace only. The
server still accepts empty / whitespace / all-sanitised-away content (`POST …/link/text` → 200,
stored `htmlContent:""`), so a blank block is still one API call away. AUT-PRF-013 keeps this as its
last step under `test.fail`.

**Editor details (2026-10-12).** `Paragraph style` offers only `Normal` and `Heading` (→ `<h2>`);
after a heading TipTap keeps an empty Normal paragraph at the end. Choosing an option leaves focus
on the select, so keys typed next reopen it — click back into the editor first. While the select's
listbox is open, the `Add Text` dialog is `aria-hidden`. Code view: `HTML source` textbox, hint
"Tables are supported. Links, images, video and scripts are removed on save.", `Back to editor`.
Each row in the Links list has a hide/show switch (`PUT …/link/text/{id} {isActive}`), `Edit text`
and `Delete text`; delete asks in an alertdialog "Delete this text?" → `Delete`.
`DELETE /accounts/link/{id}` on a row that is already gone answers **500 "link not exist."**, not 404.

**The Links list shows only the first 10 blocks.** It loads `link-combination?page=1&limit=10` and
never asks for page 2, so an 11th block is saved but missing from the list. Keep the creator's link
count under 10 (hendrarg has 6) — leftover test blocks push new ones off the list.

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

**Since 2026-10, `/profile` is "Home"** (sales, balance and overview cards, "Welcome home, <name>")
and **My Page lives at `/customize`** — breadcrumb `Home › My Page`, no first-run dialogs there.
For a new creator, My Page shows one quick-action button per tool picked at onboarding
(`GET /accounts/creator-favorites`, e.g. Livestream / Digital Download / Membership) plus
`Edit quick actions`, the tabs Links / Products / Feeds / Memberships, and on Links an `Add Block`
button with "Add your first link". The share address is now the `Share your page` button, not a
`yapp.ink/…` text — TC-PRF-C-075's Expected predates the move.

Verified 2026-09-09 on an account that had long since onboarded, so this is not limited to
brand-new creators. `/profile` opens behind a `Welcome to Yapp!` modal ("All in one
platform to become more closer and interact with your fans") whose only action is
`Let's Get Started!` — and pressing it **starts a second overlay**, the single-step tour
`💬 New: your Messages` whose only visible button is `Go To Messages`. Its `×` (`aria-label
"Close"`) is no longer visible (2026-10-12) and the copy says "this step can't be skipped". Until both are cleared, every control on the page — tabs included — is
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

## Profile layouts v2.1 — Blocks, tipping on the profile, Custom HTML (live on dev 2026-10-16)

Shipped per [[projects/yapp/profile-customization-v2.1 - prd|PRD v2.1]]; the visual source is Figma *Yapp 2.0*
(REVAMP BUYER / CREATOR SIDE). Where dev, Figma and PRD disagree, the PRD note's *Catatan QA* lists it.

**PM rulings, 2026-10-16 — these override the PRD text:** seeding takes Links only; new products enter
Blocks only through the picker; the per-block hide switch stays; a published Custom HTML replaces the
**whole** profile (only its "appears below your profile" copy is wrong); Blocks with nothing visible shows
"Nothing here yet" + the `Send Tip` **button only**; Simple keeps tipping as a Tip tab (the side form is
Default only); the Switch layout dialog uses the PRD/dev copy on **every** layout change; unsafe Custom HTML is
refused at Save draft; `isSupportPrivate` stays for later use; keyboard reorder is minor (it does work, but
only as Space → arrow → Space — plain ↑/↓ do nothing, which is why it looks broken).

**Preview while Blocks is selected but not saved shows nothing.** Public `GET /account/{uuid}/blocks`
answers **404 `blocks_not_enabled`** while the saved layout is not Blocks, so the unsaved preview reads
"Nothing here yet. You can still show your support with a tip." + the full form even for a creator with
blocks. After Save the preview shows the blocks at once and follows hide/show live (fixed 2026-10-16, before
that it stayed stale until a reload or a reorder). That full-form screen is therefore not the real empty
state. A long name without spaces now ends in an ellipsis in the Blocks header (preview and public); on the
**Default** mobile header the same name still runs under the share icon.

**Layout choice.** Theme → `radiogroup "Profile layout"`: Default ("Your content in tabs, with a tip card on
the side."), Simple ("One section stays on the left; the rest are tabs."), Blocks ("Stack links, products and
posts in any order."). Picking Blocks shows "Build and arrange this layout in My Page." + `Open My Page →`.
The **first** Save to Blocks raises alertdialog `Switch layout?` ("Blocks changes how My Page works…" /
"Seeded from your current page.", Cancel / Switch layout). `PUT /accounts/profile-customization` carries
`profileLayoutPreference: "blocks"`; the response and the public
`GET /account/username/{u}/profile-customization` add `blocksSeeded` and `hasPublishedCustomHtml`.

**Blocks API.** Owner `GET /accounts/blocks` → `{blocks:[{uuid, kind: link|product|group, position,
parentUuid, displayStyle, isNew, isComplete, link|product|title+children}], customOrder, seeded}`; public
`GET /account/{uuid}/blocks` (404 until seeded, hidden blocks and empty groups left out). Add
`POST /accounts/blocks {kind, refId, parentUuid}` (new block lands at position 1 with `isNew`); reorder
`PUT /accounts/blocks/arrangement {items:[{uuid,parentUuid}]}` (sets `customOrder`); delete a group
`DELETE /accounts/blocks/{uuid}`. A nested group is refused server-side: **400 `nested_group`**.

**Seeding runs once and takes only the Links list** (2026-10-16, hendrarg): 5 links + the folder as a
`group` (style list) — the campaign row stays `kind: link` with `linkType: campaign`. **No Product, Feeds or
Membership blocks are seeded**, and a product created later (on any layout) is never auto-added; it enters
Blocks only through Add Block → Products ("A newly created product is added from this picker afterwards.").
Text/link rows created on Default *do* join, at the top with NEW when `customOrder` is true. Blocks →
Default → Blocks restores the arrangement exactly; `blocksSeeded` stays true, so **first-switch seeding can
be observed only once per account** — a test needs a fresh creator or a DB reset of `profile_blocks`.
Groups are their own rows: deleting the group leaves the original Links folder in place.

**My Page on Blocks.** Tabs disappear; `Add Block` opens `Add New Block` (search box "Paste a link or
search...", categories Suggested / Products / Memberships / Appointments / Social / Text & posts, tiles
Folder / Link / Campaign / Text). Rows: `Drag to reorder block` handle, a switch named by its action
(`Hide from your page` ↔ `Show on your page`; hidden rows dim and leave the public page), `Block actions`
(Edit, Delete). Keyboard reorder is dnd-kit style — **Space, arrow, Space**, plain arrows do nothing — and
announces "Moving. position N of M." / "Dropped <title>.". Delete always removes the item itself: a Product
block → `DELETE /shop/products/{uuid}` ("This deletes the product itself."), a link/text →
`DELETE /accounts/link/{id}` (a Text block's dialog reads `Delete text "<text>"?`); a group delete keeps its
children ("The N blocks inside stay on your page."). Never delete a fixture product's block in a test — to
test a product block, create a throwaway product (`createDigitalProduct`) and delete it afterwards.
Positions are not renumbered after a delete. A product block's Edit opens `Edit display` with a **Display**
combobox (`Classic`; Digital Download also offers `Featured`, Telegram Membership does not) and
`Update display` → `PATCH /accounts/blocks/{uuid} {displayStyle}`. Once Blocks is seeded, the Switch layout
dialog back to Blocks reads "Your blocks come back exactly as you left them."

**Public pages.** Blocks: centred header with Subscribe / Direct Message / Follow, then `Send Tip`
(→ `/<username>/tip`), then the blocks; campaigns render as the campaign carousel. Default desktop: content
tabs on the left, form `Support <username>` on the right, **no Support tab, no supporter rows**. Default
mobile: `Send Tip` under the bio and icon tabs — visually only the active tab has a label, but all five carry
names (Shops / Links / Feeds / Membership / Tip). Simple desktop: Links column on the left, tabs Shops / Feeds /
Membership / Tip on the right (no `main` landmark). A Telegram Membership block shows its real price
(Rp50.000) since 2026-10-16, **although `blocks` and `products` payloads still send `price: 0`** for it — assert
the rendered price, never the payload's `price`.

**Custom HTML** (`/customize/custom-html`). Landing "Write your own section — Build a section with HTML and
CSS. Once published, it replaces your whole public profile, header included." with steps Write / Review /
Live; validation messages say "…Your profile page runs on HTML and CSS only." and a `<script>…</script>` pair
counts as one problem; Publish, Discard and Unpublish live on that landing, not in the
editor. Editor: HTML/CSS tabs, `<n> / 204,800 bytes`, placeholders `{{name}} {{username}} {{bio}}
{{avatarUrl}} {{profileUrl}} {{tipUrl}}` (`{{name}}` renders empty for hendrarg, whose name is blank).
Endpoints `GET /accounts/profile-custom-html`, `POST …/preview`, `PUT …/draft`, `POST …/submit`,
`…/publish`, `…/unpublish`; public `GET /account/username/{u}/custom-html` → a full `document` with a
nonce CSP. Unsafe markup (`<script>`, `on*=`, `javascript:`, `<form>`, `<input>`, `<iframe>`) is refused
with **422** and a per-index problem list — even on Save draft. **On dev every submission is approved
instantly, on purpose** (dev team, 2026-10-16: auto-approve so testing goes faster; `reviewed_by_user_id`
NULL, `reviewed_at = submitted_at` in `profile_custom_html_versions`, since ~13:15 WIB that day). So Pending
review, Withdraw and Reject cannot be exercised on dev — do not file the instant approval as a bug. A published page **replaces the
whole profile, header and Send Tip included**, inside an `iframe srcdoc` with
`sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"`
(no `allow-same-origin`). The first public view after Publish can still be the old render (revalidate lag).

## Customize: the My Page editor (re-verified 2026-10-12)

`/customize` is the creator's **My Page editor**. A section nav — `My Page`, `Theme`, `Profile`,
`Tip Button`, `Domain`, `Clan` — swaps the left workspace (it sits in a second `main` inside the
shell's `main`). The right panel (`complementary`) holds a **live preview iframe** of the buyer page
at `<buyer>/<username>/preview` (388px; `Switch preview to desktop view` widens it), a `Preview`
button, and `Undo` / `Redo` / `Save`. **Nothing auto-saves**: one `Save` commits every section and
answers with the toast **"Changes saved"**. An unsaved edit raises an inline `role=alert`
"Unsaved Changes — Please save your changes before leaving this page." and a `beforeunload` prompt
on reload/close — an in-app link (e.g. Wallet) leaves without asking.

**Save endpoints:** theme + layout `PUT /accounts/profile-customization {customTheme,
profileLayoutPreference}`; name/bio/role (+ `backgroundID` for a gallery banner) multipart
`PUT /accounts`; interests `PUT /accounts/interests {interestIDs}`; social links
`PUT /accounts/social-link {items}`; tip button `PUT /accounts/tip-button` + `POST /quick-amounts`.
`src/helpers/api/profile-appearance.ts` snapshots and restores all of these (`creatorAppearance`
fixture); banner and picture come back through `dbFixtures.protectAppearanceMedia()`.

**Theme.** Presets are a `radiogroup "Theme"` of radios **named** Default, Sunset, Ocean, Forest,
Midnight (the old unnamed "Aa" buttons are gone, so TC-PRF-C-020 now passes); `Custom` is plain text
that lights up when custom colours are in use, never a radio. Layout is `radiogroup "Profile layout"`
(Default / Simple); the preview changes at once — Simple has a top `Menu` button and Links/Products
tabs, Default the Shops tab. Each colour field has a `Choose color` button (popover with Color/Hue
sliders and "Recent colors" `Use #…` buttons — it is a picker now).

**Colours are rejected silently, twice over.** Non-hex values (`zzzzzz`, `#GGGGGG`, `#12`, `red`) stay
verbatim in the field, show no error and keep `Save` disabled. **A valid hex too close to the other
two theme colours is also ignored** — kept in the field, the preview does not change, `Save` stays
disabled, no message. Seen: a background equal to the primary, `#123456` against secondary `#0F3460`,
`#24AA77` against primary `#E94560`, `#FAFAFA` against Midnight's primary `#38BDF8`; accepted:
`#000000`, `#FFFFFF`, `#654321`. Each field is judged against the current other two, so the order
matters: a test that sets a full custom theme picks far-apart colours (`#FAFAFA` / `#D7263D` /
`#22223B`) and an order that works from its starting theme. Default reports its background as
`lab(100 0 0)` — compare preview colours after painting them on a canvas.

**Profile.** `Your Name` and `Link` have no maxlength and no counter; `Bio` has `maxlength=200` and an
`n/200` character counter. Clearing Your Name keeps Save disabled with no message, clearing Link
enables it. **hendrarg's `Your Name` is empty** (M-61 residue), so a Profile save in tests must fill a
name first. `Role` is a select ("Select a role") of 10 options — Artist, Content Creator, Community,
Educator, Entrepreneur, Streamer, Musician/band, Product Designer, Software Developer, Others — the
current one carries `data-state=checked` and a check icon; there is no empty option. Interest chips
have no `aria-pressed`/`data-state`: selected = class `bg-primary`, unselected `bg-primary-background`.
Saving a new **Link** changes the username (and the public URL) — restore it with
`dbFixtures.protectProfile()`.

**Social links** are five unnamed icon buttons in API order tiktok, x, instagram, web, youtube; each
opens `Update social link for <platform>` with a `@username` box and `Update`. A newly set link is
saved with `isActive: false` but still renders on the public profile (`TikTok profile` →
`https://tiktok.com/@<handle>`, `target=_blank`).

**Header media.** `Change profile banner` opens `Header Background` with tabs Gallery (4 presets
`Option 1–4`) and Upload; `Change profile picture` opens `Upload Profile Picture` (with
`Delete Current Photo`). Both expose a real `input[type=file][accept=image/*]` and lead to a crop
dialog (`Crop Profile Picture` / `Crop Header`: `Crop target` image, zoom slider, Go back, Close,
Cancel, Apply). **Escape does not close the crop dialog** — use Cancel. Apply only stages a `data:`
image; Save writes it. Output: picture 600×600, header 900×506. A gallery banner is `background_id`
1–4 with an empty `background_path`; an upload is `<uuid>/background/<file>.jpg` with a null id.
Both upload dialogs still say 1080px / 20MB / **1:1** (L-53 → CP-12, AUT-PRF-008 `test.fail`).

**Public pages lag a save by one view.** The buyer profile is served stale-while-revalidate: the
first visit after a save can show the previous render (an old banner, even one replaced minutes
earlier); a reload shows the new one. The creator's own signed-in context also keeps its cached
account, so check public results from a fresh guest context and reload until they appear
(`ProfilePage.expectAfterRevalidate`).

**Preview dialog** (`Preview`): two icon-only mode buttons with no accessible name plus `Close`;
the iframe is 1222px in the first mode and 388px in the second.

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

## Public profile appearance flags & responsive locators

Verified 2026-10-13 on dev (`tests/buyer/profile.spec.ts` refactor):

- **Hide Support Section (`isSupportPrivate`)**: Toggles the visibility of the `Support` tab in the public profile tab navigation (`Shops`, `Links`, `Feeds`, `Support`). The `Support` tab only renders when `isTipButton` is enabled and `isSupportPrivate: false`. When `isSupportPrivate: true`, the tab is omitted from the tablist while other content remains available.
- **Multipart `PUT /api/v1/accounts` requirement**: When mutating profile account flags via multipart request in Playwright, do NOT include `'Content-Type': 'application/json'` header (`getMultipartHeaders()` strips it). Otherwise, the server ignores the multipart boundary and changes to `isSupportPrivate` or `isEnableEngagement` silently fail to persist.
- **Public Link Combination Endpoint**: Public Links tab data uses singular `/api/v1/account/{uuid}/link-combination` (not plural `/accounts/`). It requires `Origin` and `Referer` headers to pass backend CORS/CSRF validation without throwing 403 Forbidden.
- **Quick Amounts fallback**: When custom quick amounts are disabled (`isEnabled: false`), `/tip` and profile tip forms fall back to the system defaults (`Rp20.000`, `Rp50.000`, `Rp100.000`). Custom creator amounts (e.g. `Rp10.000`) are absent, but the chip list does not drop to count 0.
- **Show Followers (`isEnableEngagement`)**: Toggles the follower count text on the public profile. When `false`, follower count is not rendered in the profile bio header.
- **Responsive duplicate nodes in DOM**: Public profile renders hidden mobile elements (e.g. mobile header username/handle `<p class="... text-xs">` and mobile tip button `<button>`) even at desktop viewport sizes (1440×900). Locators matching text or roles must filter for `{ visible: true }` or scope to paragraph/heading elements rather than raw `.first()`.
- **Public profile banner element**: An `img[src*="background"]` element only mounts in `<main>` when a custom banner image has been uploaded (`background_path` populated). If no banner has been uploaded or a default preset is used, the header wrapper `<div class="relative w-full"></div>` is empty.
- **Theme & Layout on Buyer View**: The public profile applies the creator's custom background color directly on `document.body` (and CSS variable `--custom__theme-bg-color`), with themed buttons matching the primary color. Default layout presents standard profile tabs (`Shops`, `Links`, `Feeds`) and omits the top `Menu` button present in Simple layout.
- **Share Modal targets**: Clicking the profile header's `Share` button opens a dialog offering a Copy link input/button and 6 social destination buttons: Facebook, Twitter/X, LinkedIn, WhatsApp, Telegram, and Reddit.
- **Cross-Role API Seeding from Buyer Specs**: Mutating creator settings (`PUT /api/v1/accounts/profile-customization` or `PUT /api/v1/accounts/social-link`) from buyer-side tests requires `fetch` using the creator's Bearer token (`token1`) and `creatorsBaseURL` origin (`getHeaders(undefined, creatorsBaseURL.replace(/\/$/, ''))`), because Playwright's `request` in `authTest` context carries the buyer's session credentials.


