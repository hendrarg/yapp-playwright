---
title: Messaging
type: note
category: project
tags: [yapp, product, automation, messaging]
project: yapp
created: 2026-09-04
updated: 2026-09-04
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
  `GET /api/v1/dm/buyers/{buyerUUID}/labels`** — `GET /api/v1/dm/conversations` no
  longer carries them at all, so do not assert badges from the list payload.
- **A removed badge cannot be re-applied to the same buyer.** `Remove` soft-deletes the
  assignment (the GET reports it gone) but `idx_dm_buyer_labels_unique` ignores the soft
  delete, so `POST /api/v1/dm/buyers/{buyer}/labels/{label}` answers **500 duplicate key
  (SQLSTATE 23505)** forever after. The UI shows no error — the modal simply closes and
  no badge appears. The same label on a buyer who never had it returns 200. Filed on
  YAP-2007, verified 2026-09-08; pick a **fresh** label for any test that removes one.
- **Broadcast audiences are single-select** — Followers / Subscribers / Custom List.
  There is no Supporters segment and no per-tier filter. Custom-list candidates are
  limited to followers.

## Buyer app

- The composer has only **Attach image** plus Send — no rich-card menu
  (`accept="image/jpeg,png,gif,webp"`).
- Inbox previews are type-aware ("You sent a photo", "Sent a product", "You requested
  a tip") where the creator app renders a blank preview.
- The ⋮ menu is Report User / Block User / Delete — no Add Mark Badge.
- **The only new-chat entry point is the "Your Subscribed Creators" list**
  (`GET /api/v1/dm/directories/buyer/creators`) shown in the empty-inbox state; a
  per-creator Message button creates the conversation on click. That section
  disappears once the buyer has any conversation, and the creator's public profile has
  no Message button at all. So a buyer with an existing inbox has no way to start a
  new conversation.
- Buyer inbox search is inert — it filters nothing.

## DM sends ride a WebSocket, not REST

There is no `POST .../messages` to wait on. The stable assertions are the state from
`GET /api/v1/dm/conversations` (`lastMessage`, `unreadCount`) or the thread DOM —
never a response wait on the send itself.

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
  All three options carry the same wrong subtitle, *"If they click, all followers will be
  notified."* (`L-50`).
- The **`N People` button** opens a second panel, `Message recipient`, listing every
  person in the segment with a checkbox plus `Select All` — the only way to trim a
  broadcast, and it stays inside one segment.
- The attachment menu is `Link Product`, `Link Campaign`, `Request Tip`, `Link Post`,
  `Media`, `Link Membership`, each with its own one-line description.
- **The pickers do not share a confirm button**: `Select Post` commits with **`Apply`**,
  `Select Membership Tier` with **`Confirm`**. Clicking the row alone attaches nothing,
  and the composer behind stays reachable, so a send fired too early goes out empty —
  check that the dialog closed and the broadcast appears in the list before believing it.

### What the recipient sees

- A **member-only post card** renders the post title under a `Member Only` badge. There is
  **no `View Post` button** — the card itself is the link, and for a subscriber it opens
  `/post/{uuid}` with the full content, no unlock prompt.
- A **membership card is state-aware**: the CTA reads `Subscribe Now` for a tier the buyer
  does not hold and **`Subscribed`** for one they do. Tapping the subscribed one lands on
  `/profile/membership` → Active, showing the plan and next billing date rather than a
  checkout.
