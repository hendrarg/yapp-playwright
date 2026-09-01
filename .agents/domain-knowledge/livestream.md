# Livestream and the streamer app

Live-verified 2026-08-27 on `creators-dev` / `yapp-dev` / `widget-dev`. Livestream
was refactored into a separate **streamer app**; the old `/streaming` route still
renders but is a legacy shell with its own tab strip. The Livestream sheet was
written against the old information architecture, so scope, preconditions, and
expected results are answered wrongly without this map.

## Navigation

Entry is `/streamer/dashboard`. Sidebar groups:

- **Overview** — Dashboard, Wallet, `/streamer/tips`
- **Streaming** — Overlay Studio (still at the old `/streaming/overlay`),
  `/streamer/overlay-control`, and Widgets

**Every widget is a tab on one page**: `/streamer/overlays?activeTab=<tab>`, where
`<tab>` is one of `alert-tts`, `media-share`, `merged`, `vipqueue`, `songshare`,
`spinwheel`, `milestone`, `leaderboard`, `qrcode`, `subathon`, `runningtext`,
`runningtextoverlay`, `featuredproduct`, `voting`.

An unknown `activeTab` silently falls back to a generic "Overlays" page — that
fallback is how you prove a feature is gone. Resolve a widget to its `activeTab`
before writing test cases or locators.

## Overlay URLs

Overlays moved to `https://widget-dev.yapp.ink/<widget>/<creatorUUID>`, keyed on the
JWT `uuid` claim. Alert is `/alert/<uuid>?variant=alert`, Media Share is the **same
path** with `?variant=media`, and the combined overlay is that path with **no**
`variant`.

Each widget card has Reveal / Copy / Rotate key / Launch — Tip Running Text is
missing Rotate key. Events arrive over
`wss://staging.yapp.ink/api/v1/overlay/<uuid>/ws`; config arrives over Firebase RTDB.

## What moved, merged, and disappeared

- **Merged into Alert**: Text to Speech and Filter Words are no longer their own
  epics. Filter Words is now one comma-separated field with no add/list UI.
- **Renamed**: the old "Running Text" is now **Tip Running Text** (the supporter
  ticker); the new "Running Text" is a creator-authored scrolling message.
- **Alert placeholders** are `{name}` / `{amount}`, previously `{amount} dari {sender}`.
- **Removed outright**: Wishlist, Send Gift, Discord Integration.
- **New**: Song Share, Overlay Control (pause / skip / censor plus a Stream Deck panel
  link), Tips history with Replay on Stream, a custom HTML alert editor
  (`/streamer/alert-html`), per-amount alert rules, and key rotation.

## Media share now buys playback seconds

The pricing model changed: the tip no longer gates attachment, it **buys playback
time**. A clip plays `floor(amount / cost per second)` seconds, capped at the clip
length and at the configured maximum duration.

Measured at 1.000/s: Rp10.000 gives 0:10, Rp18.999 gives 0:18, Rp19.000 gives the
whole 19 s clip. Below the creator media floor the attach UI is simply not rendered.
The platform minimum tip is Rp10.000, so any media floor below that is unreachable.

## One Save for every widget, and Voting can block it

`/streamer/overlays` renders **one form for all widget tabs** with a single sticky
save bar (`N unsaved changes` / DISCARD / SAVE).

**Validation runs across the whole payload, not the tab being edited.** With the
stored Voting schedule in the past, changing one Alert field and pressing SAVE is
rejected with the toast `Voting start date/time cannot be in the past` — **no network
request is made** and nothing persists, including the field just touched. It
reproduces on every tab. Worse, the Voting date picker disables past dates, so the
creator cannot re-pick the value blocking them and must choose a future date.

This is a genuine creator-facing blocker: one stale poll silently freezes the entire
streaming config. It also reads as "settings do not persist" on whatever widget
happens to be under test, and cost a full round of false conclusions before the
shared payload was identified.

**Fix first, then test anything else:** open `?activeTab=voting`, move Start and End
into the future, and SAVE once (`Stream config saved successfully`). Every widget
then saves normally.

Two consequences worth remembering:

- A failed save leaves the counter at `N unsaved changes` — check the counter and the
  toast; never assume success.
- **Some controls bypass the save bar and persist immediately** — the Alert enable
  switch and the VIP Queue custom fields (the counter stays at 0). Do not wait for
  SAVE on those.

## Widget accounting

Widgets disagree on which figure they count. Leaderboard and Spin Wheel use the
**subtotal**; the Tips list and the tip ticker show the **gross including fee** — for
a Rp25.000 tip that is Rp25.000 versus Rp26.263. Entries and progress only appear
**after settlement**, so a check made too early looks like nothing happened.

Spin Wheel carries the remainder across cycles: a tip that crosses the goal spins the
wheel and resets progress to the excess (Rp50.000 crossing a Rp1.000.000 goal reset
to Rp4.000).

## The two alert test endpoints are not equivalent

- `/tipping/alert/test` **ignores the payload** and always renders the sample
  `TEST tip you Rp10.000`.
- `/tipping/alert/tts/test` honours name, amount, and note.

**Both bypass the word-filter layer**, so neither can be used as a fixture for a
moderation test — a filtered word passing through a test alert proves nothing about
moderation.

## Effective thresholds are always the larger of two numbers

Buyer-facing media and queue thresholds are the maximum of the creator's configured
floor and the Rp10.000 platform tip minimum (see [tipping.md](tipping.md)). Below the
effective threshold the control simply is not rendered, with **no error message** and
the Subtotal shown as `Rp0` — which reads as a broken control rather than an unmet
condition.

Alert and Media Share eligibility are also not independent: the Alert threshold can
suppress Media Share along with it.

## Blocked words strip, they do not block

The Alert/TTS tab states it plainly: `Separate each word with a comma. These are
stripped from every tip note.` So a blocked word is **removed from the note text**;
the tip itself still goes through. A neighbouring `Filter repeated words` control
("Collapses spammed words before they are read") handles repetition and is a separate
thing from the blocked-word list.

Case sensitivity, substring versus exact matching and cross-language behaviour are
still undefined — testing them needs a real tip carrying a blocked word.

## Creator uploads are audio-only, and Media Share has no upload at all

The Alert/TTS tab holds four file inputs, every one `accept="audio/*"` and single
file. **The Media Share tab has no file input whatsoever** — the media comes from the
buyer, and the creator only configures `MAXIMUM LENGTH` and `COST PER SECOND` ("What
a fan pays for each second of clip").

**No maximum file size is stated anywhere** on either tab.

## VIP Queue input form

Custom join fields render as `@name` plus a type (e.g. `Number`), with an `Add input`
control. The configured maximum number of fields could not be established — clicking
`Add input` repeatedly changed nothing observable, so treat the cap as unknown rather
than unlimited.
