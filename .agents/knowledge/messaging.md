> [[projects/yapp/knowledge/index|Domain knowledge index]]

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
- **Buyer tags** are `Add Mark Badge` → a "Mark Member" modal with a free-text label
  (max 25 chars, enforced only by hiding the Create option) plus 8 colour swatches.
  There are no predefined labels and no remove control. Labels live at
  `GET /api/v1/dm/labels`; assigned labels come back on the conversation **list**
  endpoint only, never the detail endpoint.
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

**Media is images only — there is no video path.** The composer's file input is
`accept="image/jpeg,image/png,image/gif,image/webp"`, `multiple`. Opening the
attachment menu (Link Product / Link Campaign / Request Tip / Link Post) adds **no**
further file input, so video cannot be attached from the creator side at all — any
expectation of a creator-side video attachment is unfounded on this build. No file size
limit is stated near the composer.

## Broadcast is send-now only

`New Broadcast` opens `Create Broadcast` containing exactly: a `Send to:` audience
selector, a recipient count, the message textbox, `Open attachment menu`, `Cancel`,
and `Send Broadcast` (disabled until there is content). **There is no schedule
control and no save-as-draft control**, and the broadcast list has no Draft or
Scheduled tab — only sent history with title, date, recipient count and Views.
