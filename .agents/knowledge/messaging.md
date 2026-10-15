---
title: Messaging
type: note
category: project
tags: [yapp, product, automation, messaging]
project: yapp
created: 2026-09-04
updated: 2026-10-07
sources: 0
status: active
---

> [[projects/yapp/knowledge/index|Knowledge index]]

# Messaging

Creator Messages (`creators-dev.yapp.ink/messages`) and the buyer inbox
(`yapp-dev.yapp.ink/direct`). The implemented UI differs from the PRD wording the
test cases were written against, so check this before scoping a messaging TC.

## Creator app

- Tabs are **Chat** and **Broadcast** (not "Direct Messages" / "Broadcasts"); Chat is
  the default. A settings gear sits beside the tablist.
- **Group Chat is not a third tab.** Since 2026-09-23 a tier with Enable Group Chat
  adds a `GROUP` row to this same Chat list and opens `/messages/group/{roomUUID}`
  (`GET /api/v1/group-chats`). Details, the freeze banner, and what the composer
  does not include are in [[membership-tiers]]. On the buyer side the room is a
  `Group` row above the DMs in `/direct` (`/direct?groupId={roomUUID}`); a non-member
  deep link to `/direct/group/{roomUUID}` still renders a live composer that fakes a send.
- **Messaging access is a 3-value radio policy** in the Messaging Settings modal —
  Everyone / Subscribers only / No one — saved instantly with no Save button via
  `PUT /api/v1/dm/settings`, where `accessPolicy` ∈
  `followers_and_subscribers | subscriber_only | none`. The inbox header's "Allow for
  subscribers only" switch is a lossy 2-state view of the same setting.
- **Attachment menu** (identical in the DM and broadcast composers): Link Product,
  Link Campaign, Request Tip, Link Post, Media, Link Membership. Tipping is a "Tip
  Request" with 10K/25K/50K presets rendering a card CTA `Send Tip IDR <amount>`. The
  product card CTA is **Buy Now**, not "View Product".
- **Buyer tags** are a "Mark Member" modal with a label picker (free text, max 25 chars,
  enforced only by hiding the Create option) plus 8 colour swatches. **Rewritten
  2026-09-07, re-verified 2026-09-08:** the menu item now switches on state —
  `Add Mark Badge` when the member has none, `Edit Mark Badge` when they do, and the
  modal then opens **prefilled** with the current label, colour and a live Preview,
  next to a `Remove` button. Each saved label in the dropdown carries its own delete
  control (`aria-label="Delete <name>"`), and typing a new name offers `Create`.
  The colour swatches and `Done` stay **disabled until a label is chosen**, and the
  modal grows a live `Preview` row plus `Remove` the moment one is set.
  Labels live at `GET /api/v1/dm/labels`; **assignments are per buyer at
  `GET /api/v1/dm/buyers/{buyerUUID}/labels`** (`data: null` once removed). As of
  2026-10-02 `GET /api/v1/dm/conversations` **carries them again** as
  `counterParty.label[]` (it did not on 2026-09-08), so the list payload works for a
  badge assertion but the per-buyer endpoint is the authority. Since 2026-10-15 (L-29 / M&B-15 fixed) the badge renders on the inbox row **and** in the
  thread header beside the buyer's name.
- **Full badge lifecycle re-verified 2026-10-02** (M-29 closed): Add → `Member marked`;
  menu flips to `Edit Mark Badge`, modal prefilled with label + colour + `Remove`;
  `Remove` → `Mark removed` and the row badge disappears; `Delete <name>` in the label
  dropdown opens an `alertdialog` "Delete label? This label will be removed from all
  buyers and cannot be undone." There is no rename.
- **A removed badge cannot be re-applied to the same buyer.** `Remove` soft-deletes the
  assignment (the GET reports it gone) but `idx_dm_buyer_labels_unique` ignores the soft
  delete, so `POST /api/v1/dm/buyers/{buyer}/labels/{label}` answers **500 duplicate key
  (SQLSTATE 23505)** forever after. The UI shows no error — the modal simply closes and
  no badge appears. The same label on a buyer who never had it returns 200. Filed on
  YAP-2007, verified 2026-09-08; pick a **fresh** label for any test that removes one.
- **Broadcast audiences are single-select** — Followers / Subscribers / Custom List.
  There is no Supporters segment and no per-tier filter. Custom-list candidates are
  limited to followers.
- **The inbound DM policy no longer touches the broadcast audience** (M-59 / M&B-20 fixed,
  verified 2026-10-15). With `accessPolicy` set to `subscriber_only`, `followers_and_subscribers`
  or `none`, `Send to` is identical: default Followers, all three options enabled, Subscribers
  keeps its real count (it used to drop to 0 under `none`). Older screenshots with Followers /
  Custom List greyed out show the pre-fix coupling.

## Buyer app

- The composer has only **Attach media** plus Send — no rich-card menu. Since Oct 2026
  the input also takes video (`accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,
  video/webm,video/quicktime"`, `multiple`); a buyer-sent MP4 renders as a loaded `<video>`.
  (Was `Attach image`, images only — re-verified 2026-10-07.)
- Inbox previews are type-aware ("You sent a photo", "Sent a product", "You requested
  a tip") where the creator app renders a blank preview.
- The ⋮ menu is Report User / Block User / Delete — no Add Mark Badge.
- **Two new-chat entry points** (2026-10-07). The creator's public profile now has a
  **`Direct Message`** button next to `Member` — it opens `/direct?chatId=<uuid>` when the
  buyer may message, and `/<creator>/membership` when the policy is subscribers-only and the
  buyer holds no tier. The **"Your Subscribed Creators"** list
  (`GET /api/v1/dm/directories/buyer/creators`, Message → `POST /api/v1/dm/conversations`
  `{counterPartyUUID, counterPartyRole: "creator"}`) renders **only when the buyer has zero DM
  conversations *and* zero group chats** (that is the code's condition) — a buyer in any
  tier group never sees it. Fixture for the empty state: soft-delete every
  `tier_membership_users` row of the buyer with `DbFixtures.set(..., { deleted_at })` (that
  also drops their groups) and delete each conversation for the buyer.
- **Delete (scope `me`) wipes the buyer's copy of the history.** `DELETE
  /api/v1/dm/conversations/{uuid}` `{scope: "me"}` hides the thread; the next message from
  either side brings it back with **only the new messages**. Starting the chat again returns
  the same conversation UUID.
- Buyer inbox search is inert — it filters nothing.

## DM sends ride a WebSocket — with a REST fallback that seeds anything

The UI sends over `wss://…/api/v1/dm/ws?token=` (on dev the socket host is
`staging.yapp.ink`), so there is no request to wait on from the browser. The stable
assertions are the state from `GET /api/v1/dm/conversations` (`lastMessage`,
`unreadCount`) or the thread DOM.

**For seeding, the app's own fallback works:** `POST /api/v1/dm/conversations/{uuid}/messages`
with `{contentType, content?, referenceUuids?, tipAmount?, mediaUrls?, mediaType?}` accepts
every type — `text`, `media`, `product`, `campaign`, `post`, `tier_membership` **and `tip`**
(which broadcasts reject, M-27). Wrapped as `sendDm` in `src/helpers/api/dm.ts`, with
eligibility, policy (`PUT /api/v1/dm/settings`), directory and delete helpers beside it.
Broadcasts take `{contentType, content, referenceUuids, audience: {type: "buyer_uuids",
buyerUUIDs}}` (or `{type: "custom_list", customListUUID}`). Member-only posts need
`tierMembershipUuids` on create (`visibility: "membership_only"`), else 500.

## Buyer thread: cards, timestamps and read-only panels (verified 2026-10-07)

- Own bubbles sit right with a clock time and an unlabeled lucide check (delivered); the
  creator's sit left. **Consecutive messages share one time**, printed under the last of the
  run — earlier bubbles in a run have none. A buyer text reaches the creator's
  `/dm/conversations` within ~1 s and bumps `unreadCount`.
- Product card: thumbnail, type badge, title, creator, `Rp15.000`, **`Buy Now`** (new tab →
  `/<creator>/product/<short>`). Campaign card: banner, `Active`, title, owner, `N%`, a
  progressbar, **`Donate Now`** (new tab → `/campaign/uuid/<uuid>/donate`). Tip request:
  creator avatar/name and **`Send Tip Rp25.000`** (same tab → `/<creator>/tip?amount=25000&
  currency=IDR`, amount prefilled). Tier card: `Membership`, tier, creator, `Subscribed`
  (same tab → `/profile/membership`) or `Subscribe Now` (new tab → `/<creator>/membership/
  <tier>`).
- Post cards are a single button (author, age, text, image) with **no `Public` label and no
  `View Post`**; clicking opens `/post/<uuid>`. PPV adds `Unlock Post`, which opens the
  **`Unlock Exclusive Post` payment dialog in place** (same form as the feed). After the
  purchase the card loses `Unlock Post`. A member-only card shows `Member Only`; for a buyer
  without the tier the post page's `Unlock Now` opens **`Select Membership to Unlock`** with
  that tier and `Subscribe Rp<price>`.
- Read-only threads replace the composer with **"You can't send a message right now"** plus
  a reason: policy `none` → "This person is not accepting messages right now. Your chat
  history is saved." (`reason: dm_disabled`); subscribers-only + lapsed member → banner "Your
  subscription to <creator> ended, resubscribe to keep chatting" and "Messages only accept
  from subscribers…" with `Subscribe` → `/<creator>/membership`; Everyone + lapsed member →
  "Your subscription has ended. Resubscribe to keep chatting…" with `Subscribe` →
  `/profile/membership`. History stays readable in every case.
- **Bug M-63 / M&B-23 (filed 2026-10-07):** once the buyer holds no active tier of the
  creator, the existing conversation reports `canSend: false`, `readOnlyReason:
  dm_access_revoked` even when the policy is Everyone and
  `GET /api/v1/dm/creators/{uuid}/eligibility` says `canMessage: true`. So a "potential
  customer" (no membership) can open a chat from the directory but cannot type. A pending
  order does not grant DM either (`dm_subscriber_only_required` under subscribers-only).
  `AUT-MB-019` runs under `test.fail()` for this.
- Fixtures: the QA buyer also holds two DM-disabled tiers of **sundanese** (`MB Permanent
  Contrast`, `MB Dropdown Check …`) — with sundanese on subscribers-only, eligibility is
  `canMessage: false` and sundanese drops out of the directory (the "tier without DM" case).

## Composer limits (verified 2026-09-01)

**The creator DM composer has no length limit.** `Write a message...` is a plain
textarea with `maxlength = -1` and no counter anywhere. Emoji, HTML-looking text,
quotes, backslashes and slashes are all kept verbatim, and **Shift+Enter inserts a
real newline**, so multiline messages are supported.

**Video is accepted since 2026-09-07.** The creator composer's file input is now
`accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime"`,
`multiple` — it was images-only before, so the older note that "video cannot be attached"
is dead. A sent video renders as a real `<video>` element on both apps (first frame as the
thumbnail plus a play overlay); `poster` is null and `controls` is absent, so assert the
element and its `readyState`, never a poster attribute. Opening the attachment menu
(Link Product / Link Campaign / Request Tip / Link Post) still adds no further file input.
No file size limit is stated near the composer — **and none is enforced either.**
Established 2026-09-11: a `.mp4` of **1 GB + 1 byte** attaches with no error, no toast,
a staged thumbnail and `Send Broadcast` still enabled. The file input carries only
`accept` and `multiple`, with no size attribute, and no copy anywhere mentions MB or GB
(compare the product form's `smaller than 500 MB` and onboarding's `up to 5MB`). Nothing
uploads at attach time — the transfer starts on `Send` — so the client has the
opportunity to check and simply does not. Folded into M-43.

Large files that are realistic *do* work: a **42.9 MB** MP4 uploaded through the
multipart path (`POST /api/v1/file/upload/create` → `/complete`, two create/complete
pairs for one file) and the broadcast completed with `failedCount: 0` about a second
after `POST /api/v1/dm/broadcasts`. So the platform handles size fine; it just never
validates it.

**Testing an oversized boundary without moving gigabytes:** create the fixture with
`fsutil file createnew <path> <bytes>` + `fsutil sparse setflag` (instant, no real data)
and route-block `**/api/v1/file/upload/**` plus the S3 host before attaching. The
client-side gate — which is the part worth asserting — is fully observable that way.

## Broadcast is send-now only

`New Broadcast` opens `Create Broadcast` containing exactly: a `Send to:` audience
selector, a recipient count, the message textbox, `Open attachment menu`, `Cancel`,
and `Send Broadcast` (disabled until there is content). **There is no schedule
control and no save-as-draft control**, and the broadcast list has no Draft or
Scheduled tab — only sent history with title, date, recipient count and Views.

## Membership cards read the buyer's subscription state (2026-09-08)

A tier card sent through `Link Membership` renders its CTA from the viewer's actual
subscription: `Subscribed` → `/profile/membership` for a tier the buyer already holds,
`Subscribe Now` → the tier checkout for one they do not. Verified from the buyer side on
`kuy` (subscribed) and `Succed` (not) in the same thread. Earlier builds showed
`Subscribe Now` on both, which is what YAP-2001 was about.

## Long unbroken text wraps on creator, overflows on buyer (2026-09-08)

The two apps do not share the bubble component. A 229-character string with no spaces
wraps to 9 lines inside the creator's 264px bubble, and blows out to a single 1755px line
on the buyer, giving the thread a horizontal scrollbar (scroller `overflow-y-auto flex-1
min-h-0` at scrollWidth 1807 vs clientWidth 799). The buyer's wrapper does carry
`max-w-[264px]`; it is the text node inside that never breaks. Same for long broadcast
text.

**The conversation list has the same defect on both apps**, and it is a separate surface
from the bubble: the last-message preview is never truncated, so the row measures
scrollWidth 2350 against a 383/384px column. On the creator the row is clipped and the
**timestamp disappears**; on the buyer the list scroller (`min-h-0 flex-1 overflow-y-auto`,
`overflow-x: auto`) gains a **horizontal scrollbar**, and the member badge beside the name
is cut off with it. The buyer preview already sets `overflow: hidden` and
`-webkit-line-clamp: 1` — they do nothing because the flex child has no `min-width: 0` and
sizes to its content (2228px). All of this is open on YAP-1984; only the creator **bubble**
is fixed.

## The second buyer account, and the token trap behind it

Established 2026-09-09. `x7nv1.qa@inbox.testmail.app` — the inbox the OTP helpers use for
"the QA account" — logs into **user 459 `anthony_mosciski`**, not into token1's user.
token1 (`YAPP_TEST_ACCESS_TOKEN`) carries `id: 317`, which is **`hendrarg`
(jendraljohn92@gmail.com)**, the creator every creator-side test uses.

Two consequences:

- **A real second buyer exists and is already useful.** User 459 holds an **active
  subscription to hendrarg's `kuy` tier** (until 3 Oct 2026, DM enabled), so it is the
  fixture for everything phrased as "as a subscriber": buyer-side DM, member-only post
  access, same-tier membership cards, and a second commenter on any post.
- **It holds three DM-enabled hendrarg tiers, not one** (2026-10-02): `kuy` (to 3 Oct
  2026), `satu tahun` (to 23 Oct 2026) and `Live Time and Bound Online Course` (to 10 Oct
  2026), read from `GET /api/v1/tier-membership-users` with its own token. DM access is
  granted if **any** held tier has `isEnableDirectMessage`, so a "creator disabled DM"
  test (L-26) must switch all three off — and back on. Each toggle saves with the tier's
  `Save Changes` (`PUT /api/v1/tier-memberships/{uuid}` 200).
- **Taking its session without touching `.env` or the creator session**: from
  `browser_run_code_unsafe`, `page.context().browser().newContext()` gives a second,
  isolated context in the same MCP browser; log in there through `/auth` (pointer-trail
  click for reCAPTCHA) and read the OTP from `otp_codes` via `npm run db:shell`. The code
  is **5 digits** (`maxlength="5"`). `globalThis` does not survive between run_code calls,
  so find the context again with `browser().contexts()`.
- **Never let the fixtures refresh token1 while that account matters.** The documented
  refresh path (OTP through the QA testmail inbox, saved back to `YAPP_TEST_ACCESS_TOKEN`)
  would write user 459's token over hendrarg's and quietly change who the creator tests
  are. To take a 459 session, call `signInWithEmailOtp` directly and keep the token in a
  file — it does not touch `.env`; `refreshAccountTokenViaOtp` does.

## Broadcast: one segment at a time, then a per-person trim

Verified 2026-09-09 on `/messages/broadcast`.

`New Broadcast` opens a single dialog holding everything: `Send to: <segment> <N> People`,
a `Post something here...` composer, `Open attachment menu`, `Cancel`, `Send Broadcast`.

- The **segment control is a radio group**, not a multi-select — `Followers`,
  `Subscribers`, `Custom List`, with exactly one `data-state="checked"` at any moment.
  Overlapping segments therefore cannot be combined and no unique-recipient count exists.
  Each option now has its own subtitle (L-33 / M&B-19 fixed 2026-10-15): Followers *"Everyone who
  follows you will get this broadcast."*, Subscribers *"Only your paid members will get this
  broadcast."*, Custom List *"Only the people on lists you pick will get this broadcast."* The
  radios' accessible names carry subtitle + count, e.g. `Subscribers Only your paid members … 4 People`.
- The **`N People` button** opens a second panel, `Message recipient`, listing every
  person in the segment with a checkbox plus `Select All` — the only way to trim a
  broadcast, and it stays inside one segment.
- The attachment menu is `Link Product`, `Link Campaign`, `Request Tip`, `Link Post`,
  `Media`, `Link Membership`, each with its own one-line description.
- **Broadcast `Request Tip` is staged, then sent with the broadcast** (M-27 / M&B-9 fixed
  2026-10-15). The inline Tip Request card holds 10K / 25K / 50K, an IDR field and `Remove tip
  request` — there is no `Request` button any more and picking an amount sends nothing.
  `Send Broadcast` posts `{contentType: "tip", tipAmount}` → 200, toast `Broadcast queued for N
  recipient(s).`, and the recipient gets a `tip` message. To keep a test send small, open
  `N People` (dialog `Followers (9)`), press `Select All` to clear every box, tick one test
  account and `Save` — the button then reads `1 People`.
- **The pickers do not share a confirm button**: `Select Post` commits with **`Apply`**,
  `Select Membership Tier` with **`Confirm`**. Clicking the row alone attaches nothing,
  and the composer behind stays reachable, so a send fired too early goes out empty —
  check that the dialog closed and the broadcast appears in the list before believing it.

- **Broadcast detail has no actions menu** (6 Oct 2026, M&B-6 / M&B-16). There is no
  update/delete endpoint for a sent broadcast, so the inert `(…)` button that used to sit top
  right was **removed** rather than wired up. The detail header now holds only `Send to <avatars>
  N People` and `N Views`. A TC expecting delete/recall/details there (TC-MB-C-101) is out of
  date — the expected state is that no such control exists.

### What the recipient sees

- A **member-only post card** renders the post title under a `Member Only` badge. There is
  **no `View Post` button** — the card itself is the link, and for a subscriber it opens
  `/post/{uuid}` with the full content, no unlock prompt.
- A **membership card is state-aware**: the CTA reads `Subscribe Now` for a tier the buyer
  does not hold and **`Subscribed`** for one they do. Tapping the subscribed one lands on
  `/profile/membership` → Active, showing the plan and next billing date rather than a
  checkout.

## Link Product picker refetches on every open (2026-10-15)

`Select Product` (Link Product, from the DM or broadcast attachment menu) issues a fresh
`GET /shop/products` each time it opens, so a product set inactive meanwhile is no longer offered —
no reload needed (L-32 / M&B-18 fixed). Rows are a thumbnail, type, title, price and a checkbox, with
a `Search by name` box.
