> **Obsidian:** [[projects/yapp/knowledge/index|Domain knowledge index]]

# Creator sign-up and onboarding

The creator app's `/auth` sign-up, username selection, and the three-step `/onboard`
wizard. Established 2026-09-02 by registering a brand-new account end to end
(`alt.jm-481v325@yopmail.com` → user 498, `qa.onb.0902`) with a headed MCP browser and
a manually entered OTP.

## The account exists before the username does

`POST /api/v1/auth/login/otp` (captcha-protected, returns a `tempToken`) then OTP
verification **creates the `users` row immediately**, with `username` still empty. Only
afterwards does `?step=select-username` run `POST /api/v1/accounts/username`. So:

- abandoning at the username screen leaves a real account with no username;
- a test that counts "accounts created" must not assume a username is present;
- `users` carries `is_complete_onboarding` (false until the wizard finishes) and
  `username_changed_at` (stamped when the username is first set).

## Real login cookies are host-scoped — the fixture's are not

After a genuine sign-up the cookies are **`at` and `rt` on `creators-dev.yapp.ink`**
(host-only); only `_ga` sits on the `.yapp.ink` apex. **A real creator session therefore
does not authenticate the buyer app.** Opening the new creator's public profile on
`yapp-dev.yapp.ink` gives the *guest* view — login affordance present, account menu
without an avatar, `Follow` enabled, `Direct Message` disabled.

This differs from `loginWithToken` / the MCP wrapper, which inject `at` on the **apex**
so one token serves both subdomains. Do not carry the apex assumption into a real
sign-up flow. **This nearly produced a false defect report** ("Follow button shown on
your own profile") — check cookie *scope* before judging any auth-dependent surface.

## Username rules

Message: `Username must be 4-25 characters long and can only contain letters, numbers,
periods, and underscores.` The field itself has **no** `minLength`, `maxLength`,
`pattern` or `required`, and no hint is shown before the user errs.

- min 4 — `api` (3 chars) is rejected on length, not because it is reserved
- **hyphen is rejected**; period and underscore accepted; **uppercase accepted**
- `../admin` and `<script>alert(1)</script>` fall out of the same format rule

**The inline check icon is format-only.** Typing fires **zero** network calls; the
circle-check just means the value matches the rule. Availability is tested only when
`Continue` is pressed (`POST /api/v1/accounts/username`), which is what returns
`Username is already taken`. Never read the tick as "available".

**A username can be changed, but only once every 24 hours.** The field lives at
`/customize#profile` and is genuinely editable — not `disabled`, not `readOnly`. Saving a
new one inside the cooldown is refused with a message that names the remaining time
exactly:

> you changed your username recently, you can change it again in 23 hours and 7 minutes

The field then reverts and neither `username` nor `username_changed_at` moves.
`username_changed_at` is stamped when the name is first set during onboarding, so a
freshly onboarded account is *already* inside its own cooldown.

**The API layer gives a much worse message.** Calling `POST /api/v1/accounts/username`
directly during the same cooldown answers only `500 "cannot change username"` — no mention
of the 24-hour rule and no remaining time. **Corrected 2026-09-02:** an earlier pass in
this note read that bare 500 as proof the username was permanently immutable. It is not;
it is a cooldown. Do not infer a permanent rule from an unhelpful error string.

**Still untested:** `explore`, `settings`, `admin`, `login`, `auth`, `products` all pass
the format rule, and whether the server reserves route-colliding names is unknown.
Claiming one costs a 24-hour lock rather than the account's name forever, so the test is
feasible — but budget a day before the account can be renamed back, or use a disposable
account.

## The /auth showcase is static; the Follow step is live

The five creators on `/auth` (`@yovidwin`, `@threselearns`, `@ajengtalks`, `@edlysia`,
`@andrewdinata`) **do not exist in `users`** — marketing content. The carousel on
onboarding step 3 is the opposite: every handle is a real account. Never use an `/auth`
handle as a "username already taken" fixture.

## The three-step wizard

`progressbar` is named `Step N of 3`. `I'll do it later` skips the whole wizard;
`Previous` appears from step 2 on.

**Step 1 — Set Profile.** Display Name is **pre-filled from the username**, counter
`n/50`.
- Over-50 input is **discarded wholesale**, silently — paste 60 chars and the field
  goes *empty* (`0/50`), it is not truncated to 50.
- The counter is UTF-16, so one emoji costs 2.
- Display Name does **not** trim whitespace (5 spaces stores as 5 chars), while the
  social username field *does* treat whitespace-only as empty. Inconsistent on one screen.
- Social platform: Instagram / TikTok / X / YouTube / Others, default Instagram.
- Social username is required but otherwise **unvalidated** — `@handle`, a full URL,
  spaces, 1 char and 200 chars all pass.

**Step 2 — Choose Tools.** Eleven tools; three carry a `HITS` badge and start selected
(Livestream, Digital Download, Membership). Counter `n / 3` and the rule is **exactly
three** — `Next` enables only at `3/3`, not at 1 or 2. The cap is enforced by *disabling*
the other eight once three are picked; deselecting one re-enables all eleven. Tool cards
expose `aria-pressed`, so read selection from `button[aria-pressed="true"]`.

**Step 3 — Follow Creators.** Optional (`Next` enabled at zero follows). `Follow` commits
**immediately** — `POST /api/v1/users/follow/{uuid}` → 200 — so abandoning onboarding
afterwards still leaves the follow. The carousel duplicates its entries for looping, so
the visible Follow-button count is double the creator count.

## The wizard saves as it goes

`users.name` already holds the Display Name while the user is still on step 3 with
`is_complete_onboarding` false. Moving `Previous`/`Next` preserves everything, including
the avatar preview. So "nothing is saved until the end" is false.

## What completion writes

Final `Next` fires `POST /api/v1/accounts/upgrade/creator` then
`POST /api/v1/accounts/onboarding/complete`, both 200. Then:

| Where | What |
|-------|------|
| `users.is_complete_onboarding` | false → true |
| `users.photo_profile_path` | `<uuid>/photo-profile/<uuid>.jpg` |
| `users.creator_favorites` | `livestream,digital_download,membership` — a **comma string**, not a JSON array |
| `user_links` | **five** rows seeded at once (`tiktok`, `x`, `instagram`, `web`, `youtube`); only the chosen one has a value and `is_active=true`, the rest are empty placeholders |
| `user_interests` | untouched — onboarding does not populate interests |

Afterwards `/onboard`, `/auth` and `/auth?step=select-username` **all redirect to
`/profile`**, so the wizard cannot be re-entered and the username cannot be re-picked by
deep link.

## The profile-picture path

Flow is: pick file → **`Crop Image` dialog** (zoom slider, `Cancel`, `Apply`) → `Apply`
→ a `data:image/jpeg;base64` preview. **No upload request happens at `Apply`** — the file
goes to the server only when onboarding completes. The crop always emits **JPEG**, so
PNG transparency is lost.

`accept="image/jpeg,image/png,image/jpg"` only filters the OS picker — it is not
validation. Failure feedback is absent across the board:

- **oversize (13.85 MB vs a stated 5 MB)** → nothing at all: no crop dialog, no toast,
  no message, no request;
- **`.txt` / `.gif`** → the crop dialog *opens*, and `Apply` then dies on
  `InvalidStateError: Failed to execute 'drawImage' … The HTMLImageElement provided is in
  the 'broken' state`, leaving the dialog stuck open.

Always run a valid-PNG control before calling this path broken — a 600×600 PNG crops and
applies correctly.

## First entry to the creator side runs a mandatory guided tour

Completing the wizard is not the end of onboarding. The first visit to `/profile` opens a
`Welcome to Yapp!` dialog ("All in one platform to become more closer and interact with
your fans") whose only control is `Let's Get Started!`. Closing it starts a **driver.js
tour** that spans two pages:

| `messages-tour-store` | Page | Popover | Only rendered button |
|---|---|---|---|
| *(absent)* → `sidebar` | `/profile` | 💬 New: your Messages — "…choose who's allowed to message you — this step can't be skipped." | `Go To Messages` |
| `settings` | `/messages` | Control who can message you — "Messages stays locked until you do." | `Open Settings` |
| `done` | `/messages` | tour gone, Messaging Settings panel open | — |

**It genuinely cannot be skipped or reversed.** driver.js always ships a close (`×`) and a
`← Previous` button in the popover markup, but here both are `display: none` — and
`Previous` is additionally `disabled` with `pointer-events: none`. Reloading mid-tour
brings the tour straight back. After it finishes, nothing on `/messages` is actually
disabled, so "locked" describes the tour gate, not a feature lock.

The progress indicator reads **`1 of 1` on both steps**, because each step is its own
driver.js instance — it never reflects the two-step journey.

**Tour state is localStorage-only, on two unsynchronised keys:**
`profile-store` = `{isWelcomeClosed, isTourFinished, isShareComplete, isWidgetOpened}` and
`messages-tour-store` = `{tourState}`. Nothing is persisted server-side, so the same
account on another browser or device replays the whole first-run experience — and clearing
both keys is how you replay it for testing. The keys disagree: `messages-tour-store` can
read `done` while `isTourFinished` is still `false`.

**Messages is the only tour that exists in this build.** Verified 2026-09-03 three ways
after clearing localStorage completely on a fresh creator:

1. *Runtime* — after the Messages pair reaches `done`, no tour fires on any of `/profile`,
   `/customize`, `/wallet`, `/products`, `/feeds`, `/statistics`, `/settings`, `/analytics`.
2. *Flags* — the other three `profile-store` flags are inert. `isTourFinished` stays
   `false` even once the Messages tour is `done`; `isShareComplete` never turns `true`; and
   `isWidgetOpened` is **born `true`** in a freshly cleared store, so anything gated on it
   being `false` can never trigger. Setting all three by hand, in every combination,
   produces no tour.
3. *Bundle* — scanning all 55 chunks (4.6 MB) finds exactly two tour hooks,
   `useMessagesSidebarTour` and `useMessagesSettingsTour`, and no wallet or social-media
   equivalent. Yet the string `"Connect your social media accounts."` **is** shipped and
   renders nowhere, `/customize` included.

So a new creator is guided only about Messages; linking social accounts, setting up the
wallet and creating a first product get no guidance at all.

The hooks are simply absent from this build, so nothing is malfunctioning — treating this
as a regression would assert an intent the evidence does not establish. The inert flags
and the unrendered social-media string are the open question: whether that guidance was
once shipped and then withdrawn is for the product owner to answer. Scope of the evidence:
dev only, account 498.

If you are looking for a tour that "should" be there and cannot find it, clear
localStorage first, then check the bundle for its hook before assuming a previous session
dismissed it — dismissal is recoverable, a missing hook is not.

**Do not judge a driver.js control from the DOM or `innerText`.** Reading the popover text
alone suggests two defects that do not exist — a close button on a step that says it cannot
be skipped, and a `Previous` button on step "1 of 1". Both are hidden. Check
`getComputedStyle(...).display` before concluding a control is offered.

## A clean creator fixture now exists

Created 2026-09-02 by this session and left in place deliberately:

| | |
|---|---|
| user id | **498** |
| email | `alt.jm-481v325@yopmail.com` (yopmail — public inbox, anyone can read its OTPs) |
| username | `qa.onb.0902` — changeable only once per 24h, see above |
| display name | `QA Onboarding 0902` |
| tools | `livestream,digital_download,membership` |
| state | onboarding complete, **0 products, 0 orders, 0 followers, 0 balance**, 1 follow out |

This is the only account on dev in a genuinely empty creator state. token1 carries 200
orders and cannot be emptied (orders are undeletable), and token2 still has one completed
order — so first-run and empty-state behaviour was previously untestable. Use 498 for
empty lists, zero-balance wallet, first-product flows, and anything that must not see
pre-existing history.

Its session cookies live only on the creator subdomain (above), so to drive it you must
log in through the creator app; there is no buyer-side session to inherit.

Verified empty-state surfaces on it: `/products` shows `Active (0) / Inactive (0) /
Draft (0)` with a `Create Product` CTA; `/analytics?tab=transactions` shows
`Lifetime Earnings Rp0,00` yet still offers `Export as CSV`; `/wallet` is `Rp0,00` /
`$0,00` with `No results.`; `/messages` shows `No conversations yet`; `/settings` gates on
`Payment access requires a linked bank account`; `/profile` opens the `Welcome to Yapp!`
tour and renders one tab per chosen tool.

**Careful with its metrics.** Because its whole history is known, it is the right account
for measuring analytics behaviour — that is how `Profile views` was shown to count page
loads. By the same token, every page you open on its public profile inflates that number,
so record the count before and after when it matters.

## Browser-driving notes

- **File uploads under MCP:** `page.waitForEvent('filechooser')` inside
  `browser_run_code_unsafe` never fires — the MCP server intercepts the chooser itself.
  Use `browser_file_upload`, or `setInputFiles` straight onto the hidden input.
  `browser_file_upload` only accepts paths under the allowed roots (`D:\yapp`).
- **`getByRole('button', { name: 'Next' })` is ambiguous** on step 3: it also matches the
  carousel's `Next slide` (`data-slot="carousel-next"`). Use `exact: true`.
- **Do not judge button state from a snapshot taken mid-transition.** A snapshot captured
  right after leaving step 1 showed `Next` as `[disabled]` at `3/3`; a settled re-read
  showed it enabled. That misreading was one keystroke away from a filed defect.
- To reach the sign-up flow at all, the MCP browser must start unauthenticated:
  set `YAPP_MCP_ACCOUNT=guest` in `.env` **before** the session starts, otherwise the
  wrapper injects token1 and `/auth` redirects straight to `/profile`.
