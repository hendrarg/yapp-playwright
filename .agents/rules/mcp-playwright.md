# MCP Playwright

## Server registration

The `@playwright/mcp` npm package (`^0.0.76` in `package.json`) ships the `playwright-mcp` CLI, but `.mcp.json` does **not** invoke it directly — it runs a repo wrapper so every session gets the same browser, viewport, and account:

- **Registered in `.mcp.json`** (project scope) as `node scripts/playwright-mcp.mjs`. The wrapper loads `.env`, pins the browser cache through `applyPlaywrightBrowsersPath()`, then spawns the **locally installed** `node_modules/@playwright/mcp/cli.js` with `--browser=chromium --viewport-size=1440,900 --isolated`. Do NOT register `npx @playwright/mcp@latest` — it drifts from the locked version and bypasses the wrapper entirely.
- `--isolated` keeps the profile in memory, so the `--storage-state` file that `scripts/mcp-auth-storage.mjs` writes from `YAPP_MCP_ACCOUNT` is applied to a fresh context on every start.
- Verify health: `claude mcp list` should report `playwright: node scripts/playwright-mcp.mjs - ✔ Connected`.
- Tools appear as `mcp__playwright__*` (e.g. `browser_navigate`, `browser_snapshot`, `browser_click`, `browser_run_code_unsafe`). A session restart + one-time MCP approval prompt may be required before they are available.

## Browser inspection vs API inspection

- **UI / DOM / locator checks** → MCP Playwright (real browser, accessibility snapshot, live element tree). Do not use `.mjs` scratch scripts for this.
- **Authenticate before exploring, and never fall back to code-only exploration when auth fails.** A session sitting on `/auth` yields locators derived from spec files and `page.evaluate()` dumps, which miss the accessibility-tree signals (`getByRole`, `aria-label`, `getByText`) that `browser_snapshot` captures — that shortcut has cost four to five trial-and-error rounds per page object. Complete the OTP flow below instead.
- **API operations** (seed/inspect/delete products, read backend state like After Sales config) → plain `fetch`/helper scripts (`@helpers/api/*`). MCP Playwright drives a browser and cannot make raw API calls.

## Token injection (authenticated pages)

The creator/buyer apps share one `at` cookie on the apex domain (`.yapp.ink`) — the same mechanism as `loginWithToken` in `src/helpers/auth/token-login.ts`.

The MCP browser normally starts **already authenticated**: the wrapper writes a storage state for `YAPP_MCP_ACCOUNT` (`qa` by default → `YAPP_TEST_ACCESS_TOKEN`) and the server loads it. Inject the cookie by hand only when that did not happen — `YAPP_MCP_ACCOUNT=guest`, a missing or expired token (the wrapper logs which), or when you need to switch accounts without restarting the server:

```javascript
// browser_run_code_unsafe
await page.context().addCookies([{
  name: 'at',
  value: '<ACCESS_TOKEN>',          // from .env: YAPP_TEST_ACCESS_TOKEN (or _2)
  domain: '.yapp.ink',              // apex domain — serves every subdomain
  path: '/',
  secure: true,
  sameSite: 'Lax',
}]);
```

Then `browser_navigate` to e.g. `https://creators-dev.yapp.ink/products`. If the page redirects to `/auth`, the cookie was not applied (or the token expired — check the JWT `exp`).

- Because the cookie is written with `httpOnly: false` (see `scripts/mcp-auth-storage.mjs`), `browser_evaluate` can also swap accounts mid-session: navigate to any `*.yapp.ink` page, set `document.cookie = 'at=<token>; domain=.yapp.ink; path=/; secure; samesite=lax'`, then re-navigate. `--storage-state` is read only at server start, so this is what makes paired creator↔buyer testing cheap — otherwise every role switch needs a full MCP server restart. Switch back when done.
- The cookie persists for the lifetime of the MCP browser session.
- `.env` is not committed; never hardcode a real token into committed test files — read it from `process.env` / `.env` instead.

## Token refresh (expired token)

If the MCP browser session redirects to `/auth` and the `at` token in `.env` is expired (`isTokenExpired` / JWT `exp`), do a **conventional OTP login and persist the fresh token to `.env`** — the same flow the automation already uses (see `src/helpers/auth/refresh-token-otp.ts`, `src/helpers/auth/save-token.ts`, `tests/auth/otp-login.spec.ts`):

1. **Run the OTP login** against the real auth UI, using the mapped test account's testmail inbox:
   - `signInWithEmailOtp(page, baseURL, account)` — fills email from the account's testmail tag, clicks Continue, polls testmail.app for the 5-digit code (`fetchOtpCode`), types it into the `input[data-input-otp="true"]` fields, waits for `/explore`.
   - Needs `TESTMAIL_API_KEY` + `TESTMAIL_NAMESPACE` in `.env`.
2. **Extract the fresh token** from the browser context: `extractAccessToken(context)` reads the `at` cookie.
3. **Persist it back to `.env`**: `saveTokenToEnv(token, '.env', account.envVar)`.
   - Account → env var mapping (`src/test-data/users.ts`): QA Tester (`x7nv1.qa`, testmail tag `qa`) → `YAPP_TEST_ACCESS_TOKEN`; SDET (`x7nv1.sdet`, tag `sdet`) → `YAPP_TEST_ACCESS_TOKEN_2`.
4. **Re-inject the refreshed token** into the MCP browser context via `context.addCookies` (see Token injection above), then navigate again.

Quick path: run the OTP login spec (`npx playwright test tests/auth/otp-login.spec.ts --project=chromium`) — it logs in as QA Tester and saves the token to `.env` in one go. `refreshAccountTokenViaOtp(context, account, baseURL)` wraps login + save for fixture use.

## Do not strip the driver.js overlay by reflex

Helper code in this repo removes `.driver-overlay` / `.driver-popover` and the
`driver-active` body class so they stop intercepting clicks. That is fine **once you know
what the overlay is** — but it is also a real product feature: the mandatory creator
first-run tour (see `.agents/domain-knowledge/onboarding.md`). Stripping it by habit hides
that feature from testing entirely; it went unexamined for a whole session that way.

Before removing it, capture it: `.driver-popover-title`, `.driver-popover-description`,
`.driver-popover-progress-text`, and the buttons that are **actually rendered**
(`getComputedStyle(b).display !== 'none'`). driver.js always emits close and `Previous`
buttons in markup even when the tour hides them, so DOM presence and `innerText` both
overstate what the user is offered.

Tour state for the creator tour lives in `localStorage` under `profile-store` and
`messages-tour-store`; delete both to replay it.

## Yapp UI traps

Every one of these produces a symptom identical to a product defect. Each has already
caused at least one false finding that had to be withdrawn — work through them before
concluding that a control is broken.

**Clear the driver.js onboarding overlay first.** It intercepts pointer events
(`svg.driver-overlay ... subtree intercepts pointer events`, `body.driver-active ...`)
and **re-arms after every page load**, so strip it each time:

```js
document.querySelectorAll('.driver-overlay,.driver-popover,svg.driver-overlay').forEach(e => e.remove());
document.body.classList.remove('driver-active', 'driver-fade', 'driver-simple');
```

A separate non-dismissible "New: your Messages" dialog can also cover the page.

**Filter on visibility — components render twice.** Many components have a mobile and
a desktop copy, one of them zero-width. Beyond `strict mode violation` on text
locators, the two copies can hold **independent React state** (a booking widget showed
different selected dates per copy). Always check `isVisible()` or a non-zero
`getBoundingClientRect().width` and act on the visible one.

Two corollaries:

- **Count what is painted, not what is in the DOM.** On the public profile at
  390×844 the tab strip keeps `Links`/`Feeds`/`Support` as `0×0 display:none` nodes
  while only the bottom-nav item paints. A raw `querySelectorAll` count produced a
  false "duplicate tab in mobile" defect — filter on a non-zero rect **and**
  `display`/`visibility` before reporting a duplicate.
- **Sample the right twin when comparing before/after state.** Chip groups repeat
  their label as a section heading: `Your Interest` chips are `button.rounded-full`
  while the heading is `text-lg font-semibold` with identical text. Reading the
  heading showed no class change on click and produced a false "no selected state"
  finding — the chips do swap `bg-primary-background` and `bg-primary`. Pin the
  locator to the interactive class, not the text.

**`element.click()` via `browser_evaluate` often does not trigger React handlers.**
Tab switches and date pickers silently no-op. Use a real Playwright click before
concluding a control is broken; this produced a false "tabs are broken" finding.

**A menu item that sends nothing may not be a dead handler.** Radix `[role=menuitem]`
wrappers here can contain a nested `button[role=switch]` occupying a small slice at
the right edge — `locator.click()` targets the item's centre and hits inert text. On
Products and Promotions the `Set Inactive` switch is 24 px wide inside a 159 px item;
reach it by filtering the menu item on its text and then locating
`button[role=switch]` inside it. Dump the item's inner DOM (`[role=switch]`,
`[role=checkbox]`, nested `button`) before writing "no-op"; a sibling item that does
fire a request proves nothing, because it may be an ordinary button. This cost a
withdrawn Medium defect.

**A missing `input[type=file]` usually means a dialog you have not opened.** On
`/customize` → Profile the top level has zero file inputs, which reads as "upload
cannot be automated". The real controls are the `Change profile banner` and
`Change profile picture` buttons (addressable by `aria-label`); the banner opens a
`Header Background` dialog whose **Upload tab** mounts
`input[type=file] accept="image/*"`, and the avatar opens `Upload Profile Picture`
with the same. Open the dialog and every tab inside it first. This produced a false
Low that had blocked four upload test cases.

**Locate a file input by its own label, never by index.** Pages carry a third,
unrelated image input (`accept="image/*"`, `multiple=false`) alongside the hero and
gallery. On Event & Tickets the real layout is input 0 = hero, input 1 = gallery,
input 2 = unrelated — index-guessing produced two retracted findings about product
thumbnails. Anchor on the text `select from gallery or drag and drop`, take the first
*visible* match, then walk up to the nearest ancestor holding an `input[type=file]`.
Reading `multiple` does not mutate the product; uploading two files would.

**Poll for a toast before triggering it.** Rejection toasts auto-dismiss, so sleeping
and then reading the DOM misses them. Match on the distinctive part of the message
(`is too small`) — the helper text
`Image should be at least 500 x 500 pixels and smaller than 500 MB` is **always on the
page** and is useless as a rejection marker.

**Wait for an overlay to unmount instead of force-clicking.** After a modal closes,
`elementFromPoint` at the button behind it can still return
`[data-slot=dialog-overlay]` for a moment; force-clicking measures a click that never
reached the target.

**Confirmations use `role=alertdialog`, not `dialog`.** `getByRole('dialog')` returns
0 for confirmations such as the Tips "Replay this alert?" prompt, which reads as "the
button does nothing".

**Clipboard assertions need OS focus.** `navigator.clipboard` reads and writes
silently no-op on a background tab, which looks exactly like a broken Copy button.
Call `page.bringToFront()`, write a sentinel, **assert the sentinel reads back**, then
click Copy. Skipping the read-back produced three false defects in one run.

**Filter results are path-dependent — exercise a filter as the first action after
load.** On the event Guest table, typing a one-match name while the full 10-row list
is on screen leaves 3 rows and keeps them (stale row reconciliation); the same term
typed from an already-filtered or empty state renders the correct single row. The API
is right either way (`totalResults:1`). So **a filter that passes may still be
broken**, and a manual tester and an automated run can disagree on the same test case
and both be honest.

**Interactive controls are frequently not `<button>`.** The voucher-cancel ×, "Add
Contact Information", and similar are `div[role="button"]`; the Promotion date-picker
trigger is a `div[data-slot="popover-trigger"]` with **no role and no tabindex**;
linked-product blocks carry no `href` at all. A `<button>`-only sweep concluded twice
that a working control did not exist.

**Watch for colliding accessible names.** `button:has-text("Following")` matches the
**feed tab** before the follow button, and the like button sits inside a `div` sharing
its class with the comment counter.

**Many triggers have no accessible name at all** — every row's actions menu, the copy
Order ID button, the copy promo-code button. Name-based locators cannot reach them.
Conversely, some controls carry **only** `title`: the `/telegram` per-row actions
(`Resync with Telegram`, `Re-invite …`, `Ban …`) have neither `aria-label` nor text.
Target those by `title`, and note the title changes to the *reason* when the action is
unavailable (`Can't ban — subscriber hasn't joined the group yet`) — useful as an
assertion.

**Search `aria-label` and `title`, not just `innerText`, before declaring a control
missing — and check every form step, not only the one that opens first.** The Version
history control is a 36×36 icon with no text; two consecutive runs called it "not
implemented" because they scanned text.

**Radix menus close before a selector-driven click lands.** A coordinate click is more
reliable. Hover overlays behave the same way on the Explore creator cards.

**The hero file input is not index 0.** The consultation form carries four
`input[type=file]`: index 0 is `accept="image/*"` and belongs to another control; the
hero is the strict-accept, `multiple=false` input; the gallery is the strict-accept,
`multiple=true` one. Uploading to index 0 leaves `Hero image is required` on screen.
Anchor on the label.

**MCP's file chooser conflicts with `page.waitForEvent('filechooser')`.** Use the
`browser_file_upload` tool, or `setInputFiles` directly against the
`input[type=file]`.

**Wait for the page to settle before judging a CTA.** Pre-hydration renders showed
`Purchase` on the viewer's own product (which becomes `Edit Product` after settle) and
a `USD` tip tab carrying presets belonging to a different creator. Those buttons are
genuinely clickable at that moment and do nothing — easy to write up as a dead
handler.

**Use a word boundary when matching state classes.** `Your Interest` chips mark
selection with `bg-primary text-primary-foreground` and non-selection with
`bg-primary-background`; a substring match on `bg-primary` matches **both**, which is
how one session concluded the chips "expose no selected state". Match
`/\bbg-primary(\s|$)/`. The general lesson: before reporting that a state is not
exposed, make sure the matcher is not what is blinding you.

**The crop dialog's drag layer covers Apply.** In `Crop Profile Picture` and
`Crop Header`, an absolutely-positioned transition div captures pointer events over the
Apply button, so a plain `locator.click()` times out with "subtree intercepts pointer
events". Click Apply with `force: true`.

**The Orders date-range popover opens only on a real mouse click at coordinates.** The
`All Time` trigger has a **0×0 mobile twin** that `locator.click()` finds and silently
fails on. Find the genuinely visible element, take its bounding box, then
`page.mouse.click(x, y)`. The options inside the popover have no `role="option"` and
need the same treatment.

**The Orders table renders mobile and desktop twins.** `thead` reports **10** columns
for 5 real ones, and `tbody tr` is always twice the true result count. Halve it, or
filter to the visible copy — and prefer asserting row count against `totalResults`
from the response.

## `/streamer/*` specifics

From the 2026-08-27 live run on the refactored streamer app. See
`.agents/domain-knowledge/livestream.md` for what these widgets do.

**Use the hand-authored kebab-case ids.** The app has no `data-testid` but does have
stable ids: `media-video-max`, `media-video-cost`, `media-video-min`,
`media-voice-max`, `media-voice-cost`, `media-voice-min`, `vipqueue-min`,
`vipqueue-slots`, `vipqueue-displayed`, `vipqueue-title`, `vipqueue-<colorName>`,
`milestone-title`, `milestone-target`, `milestone-<colorName>`, `leaderboard-title`,
`leaderboard-items`, `qrcode-title`, `runningtext-text`, `subathon-illustration`. Per
`code-style.md` a hand-authored `#kebab-case` id is an accepted `selector` strategy —
pair it with a role or label in `smartLocator`.

**Expand the accordion before touching anything inside it.** Radix keeps collapsed
content mounted with a layout box, so Playwright reports the inputs as *visible* and
`fill()` appears to work — but React never registers the change (the unsaved counter
stays at 0) and a later `click()` fails with the parent `section` intercepting
pointer events. Click the header while `aria-expanded="false"` first. A `force: true`
click inside a collapsed section lands on the header and silently toggles something
else.

**Address inputs by id, not index.** Toggling a switch (Accept Voice note, for
example) collapses and re-renders sections; positional `nth()` locators then write
four different values into one field.

**Set React inputs with the native setter.** Accordion churn makes `fill()` unreliable
and slow; this always registers and needs no expansion:

```js
const set = (el, v) => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v);
  el.dispatchEvent(new Event('input', { bubbles: true }));
};
```

Verify it took by reading the "N unsaved changes" counter. Use real typing only when
the test is *about* input behaviour. `el.click()` in page context does work for Radix
switches and accordion headers here.

**Reload the overlay after changing settings and before judging a widget.** A stale
overlay connection drops events entirely — the overlay stays blank and the console
logs `[alert-debug] silent delete, alert never shown`. The app itself warns to refresh
the OBS browser-source cache. Two false "the alert is broken" conclusions came from
this.

**Read the overlay console, not just the DOM.** `[alert-debug] silent delete, alert
never shown` with a `reasons` object is how threshold suppression proves itself; the
WS frame's `pattern` field is how a template change is told apart from a rendering
bug.

**Watch roles on the buyer tip page.** The queue join control is a `role=switch`, not
a button, and "Send as Anonymous" is the *first* `role=checkbox` — clicking by
position hits the wrong one. VIP custom fields render only once the switch is on
**and** the amount clears the queue minimum, and the same gating hides the media
attach UI. Several "the field is missing" findings were really "the amount was too
low".

**Audio is verifiable — instrument it.** The overlay prefetches every sound into
`blob:` URLs, so a `play` hook alone cannot say which file played. Hook `fetch` to
record byte length against asset id, hook `URL.createObjectURL` to record blob URL
against size, then hook `HTMLMediaElement.prototype.play` and join them. That yields
the exact file plus `volume`. Install via `page.addInitScript` **before** `goto`. One
TTS element slipped past the `play` hook, so also poll
`document.querySelectorAll('audio')` for `volume`/`currentTime` as a backstop.

**Drive amount-dependent logic with Tips → REPLAY ON STREAM instead of new payments.**
A replay re-fires a past tip with its own amount, so a library of past tips becomes a
set of test amounts — this proved the whole per-amount alert matrix with zero new
transactions. Replays reuse the tip's stored TTS narration, so they cannot test a
voice change; that needs a new tip.

**Voice notes need no microphone.** The buyer voice-note UI has an Upload file path
(`accept="audio/mpeg,audio/mp3,audio/webm,.mp3,.webm"`). Build long fixtures by
concatenating an asset mp3 N times — frame concatenation gives a usable ~60 s file.
The input disappears once a file is staged; reload the page to upload another.

**Before writing "nothing happened", check the feature's enable state and reload the
overlay.** Several dead ends were self-inflicted: a stale overlay silently drops
events, an unsaved enable switch leaves the feature off, and a blanket "click every
collapsed header" loop opened a Rotate-key dialog.

## Session cleanup

`browser_close` is **not** enough. Its tool schema says "Close the page", and its handler only emits `await page.close()` — the browser process the MCP server launched keeps running as an empty window, and a new one is added every time a server restarts. Finish every MCP exploration with:

```powershell
npm run mcp:clean
```

- Closes browsers under the Playwright cache (`resolvePlaywrightBrowsersPath()`) plus this repo's `@playwright/mcp` node servers.
- **Never** touches a normal Chrome install, a browser owned by a running `playwright test`, or an MCP server started by another tool (Cursor, `npx @playwright/mcp@latest`). Those need `--all-servers`.
- `--dry-run` lists what would go; `--browsers` keeps the servers up so the next MCP call stays fast.

Duplicate MCP servers are the real leak: one per client, and they outlive the session that started them. Check with `npm run mcp:clean -- --dry-run` when the machine feels heavy.
