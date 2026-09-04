> [[projects/yapp/knowledge/index|Domain knowledge index]]

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

**Every widget is a tab on one page**: `/streamer/overlays?activeTab=<tab>`. There are
**15** tabs — the full list, with `subathongacha` added 4 Sep 2026, is in the inventory
section below.

An unknown `activeTab` silently falls back to a generic "Overlays" page — that
fallback is how you prove a feature is gone. Resolve a widget to its `activeTab`
before writing test cases or locators.

## Widget inventory, crawled 4 Sep 2026

Every one of the 15 widget tabs was opened, every collapsed accordion expanded, and
every switch, input, select and button recorded. What follows is what the app actually
offers — read it before deciding a control is missing.

**There are 15 tabs, not 14.** The list above gained `subathongacha`. Full set:
`alert-tts`, `media-share`, `merged`, `vipqueue`, `songshare`, `spinwheel`,
`milestone`, `leaderboard`, `qrcode`, `subathon`, **`subathongacha`**, `runningtext`,
`runningtextoverlay`, `featuredproduct`, `voting`.

### Every widget shares the same chrome

Present on all 15, so never write it as widget-specific behaviour:

- **`Overlay link`** accordion with `COPY`, `ROTATE KEY`, `LAUNCH`. `ROTATE KEY` opens a
  confirm with two buttons — `KEEP CURRENT KEY` and `ROTATE AND BREAK CURRENT KEY`.
- **`Appearance`** accordion with two presets, `ORIGINAL` ("Thick card, with border") and
  `SIMPLE` ("Small, no shadow"), `Reset appearance to defaults`, and the switch trio
  `Aa / Use outline`, `Background`, `Border`. Verified present on songshare, milestone,
  qrcode, voting and leaderboard 2026-09-04.
- A **Font** picker is **not** universal — corrected 2026-09-04 after a census. It exists
  on `milestone` (`Work Sans`) and `subathon` (`Bricolage Grotesque`) but is **absent**
  from `songshare`, `qrcode`, `voting` and `leaderboard`. Treat Font as optional per
  widget; only the presets, the switch trio and Reset are the cross-widget contract.
- **`Remove yapp logo`** on the widgets that draw a header bar.
- **`DISCARD` and `SAVE`** — one shared Save for every widget (see the Voting trap
  above).

Colour fields come in pairs: a native `input[type=color]` plus a text input holding the
hex, named `<widget>-<role>Color`. Assert on the text input; the colour input has no
name.

### Subathon Gacha — a whole widget with no test coverage

New, and nothing in the Livestream sheet mentioned it until 4 Sep 2026. Master switch
`Subathon Gacha` ("Tips still arrive — the gacha just stays off screen.") ships **off**.

**The master switch gates every field on the tab.** Measured 2026-09-04: with it off,
**8 of 14** inputs are `disabled`; switching it on drops that to **0 of 14**. So any test
that fills a Gacha field must enable the widget first or the input silently refuses the
value — the same shape as the tier-membership price fields that stay disabled until their
period checkbox is ticked. `Wheel Title` (`subathonGacha.title`) carries
`maxlength="45"`, the placeholder `Enter wheel title (max 45 chars)`, and an `n/45`
counter that counts **characters** correctly (empty reads `0/45`, 17 characters read
`17/45`). The counter has no clamp of its own: a value forced past the cap renders
`50/45`.

It carries:

- `Show timer under the wheel` ("Off hides the clock — the wheel still adds time to your
  subathon.")
- `subathonGacha.title` — `Wheel Title` with a **0/45** counter
- `Minimum tip to spin` — "Every tip at or above…"
- two `menit` number inputs (5 and 10) each paired with a `menit` combobox — the
  time-reward slots
- four colours: Background (wheel face + progress pan), Border (ring), Accent (header
  bar + pointer), Text (option labels + readout)
- the same `subathon-adjust-hour/minute/second` trio as Subathon

### Running Text is two widgets, and only one of them is tested

They look almost identical and differ in the one field that matters:

| Tab | Sidebar label | Message source | Unique control |
|---|---|---|---|
| `runningtextoverlay` | `Running Text` (New) | `runningtext-text`, a creator-authored line with a **21/200** counter | — |
| `runningtext` | `Tip Running Text` | supporter names, no text field at all | `Show tip amounts` ("Off leaves just the names") |

Both carry `Pinned label` plus `LABEL TEXT` (**8/30**) and five colours. **Locator trap:**
the overlay widget's colours are `runningTextOverlay-*` but its text input is
`runningtext-text` — the prefixes do not match, so a name-based selector built by analogy
will miss it.

### Subathon exposes far more than a toggle and an extension rule

- **No master enable switch.** Only the appearance trio plus `Remove yapp logo`.
- `Starting clock` with `subathon-hour/minute/second`
- `PAUSE TIMER`, `RESET TIMER`
- quick adjust: `+ 10 MIN`, `+ 30 MIN`, `+ 1 HOUR`, `− 10 MIN`, `− 30 MIN`, `− 1 HOUR`
- `+ ADD TIME` / `− REMOVE TIME` driven by `subathon-adjust-hour/minute/second`
- **`Time extension rules`**, plural and countable ("1 rule"), each an `IDR` amount plus a
  `+ 10 minutes` reward, with `Add rule`
- `subathon-illustration` — `TRY AN AMOUNT` (IDR), a simulator that needs no real tip

### Featured Product selects products with switches, and cycles with NEXT PRODUCT

The product list under `YOUR PRODUCTS` renders **one `button[role=switch]` per product**,
labelled with its type, name and price (`Online Course | Making money with QUEN |
Rp0,00`), so selection is multi-select and read from `aria-checked`, not from a combobox.
`NEXT PRODUCT` cycles the banner — **there is no `Play Preview` button.** Note also that
`featuredproduct-accentTextColor` is labelled **`QR code`** ("The code viewers scan"), not
"accent text", so the name and the label disagree.

### Milestone has a Schedule, rendered as buttons

`Goal` (`milestone-title`, `milestone-target`) sits beside a **`Schedule`** accordion whose
two dates are **buttons**, not inputs — e.g. `24 June 2026 00:00:00` and
`25 June 2026 00:00:00`. A `date` selector finds nothing. The fixture milestone is
currently **expired**: the card reads `Milestone Ended` / `Ends on: June 25, 2026`, which
is why progress and completion cannot be observed on it — move the schedule forward
before testing either.

### The buyer tip page names its add-on blocks from creator config

Verified 2026-09-04 on `/<handle>/tip` in a **guest** session. Three add-on blocks sit
under the amount field:

| Block | What the buyer actually sees |
|---|---|
| Media Share | heading `Media`, then `Youtube` / `Tiktok` / `Voice Note` and `No media type selected` |
| Song Share | **the creator's configured TITLE** — on the fixture it reads `Request Lagu`, with the subtext `Request a song`. The words "Song Share" appear nowhere |
| VIP Queue | heading `VIP Queue`, then `Join "<queue name>" Queue` — the quoted name is creator-configured (`Antrian VIP` on the fixture) |

So a buyer-side locator must **not** be pinned to the literal widget name for Song Share:
it renders `songshare-title`, which the creator can change to anything. VIP Queue keeps a
literal heading but its join label carries the configured queue name. Pin on role plus a
stable neighbour, or read the configured value from the creator tab first.

### Song Share is wider than its six test cases

`songshare-min-amount` (MINIMUM TIP TO QUEUE A SONG), **`songshare-priority-amount`
(PRIORITY MINIMUM — "Tips at or above this…")**, `songshare-max-queue` (12),
`songshare-max-duration` (420 s), `songshare-max-displayed` (ROWS SHOWN, 3),
`songshare-requester-text` (holds a `{sender}`-style placeholder), seven colours, and the
switches `Show amount`, `Hide when idle`, `Show queue list`. Two separate search fields
exist: `SEARCH A SONG TO BLOCK` and `SEARCH A SONG TO ADD`.


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
- **New, found 4 Sep 2026 and not covered by a single test case**: the
  **Subathon Gacha** widget, Subathon's `Starting clock` / `PAUSE TIMER` /
  `RESET TIMER` / quick-adjust buttons / multi-rule `Time extension rules` /
  `TRY AN AMOUNT` simulator, and **Tip Running Text** as a widget distinct from
  Running Text. See the inventory section for each control.

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

### The exact threshold inventory, and what has no threshold

Enumerated 2026-09-04 across all 15 widget tabs with **every accordion expanded**.
Alert (`?activeTab=alert-tts`) exposes exactly three amount thresholds, in a
`Thresholds` accordion:

- `MINIMUM AMOUNT TO SHOW ALERT`
- `MINIMUM AMOUNT TO PLAY SOUND`
- `MINIMUM AMOUNT FOR TEXT TO SPEECH`

**None of them is GIF-specific.** The GIF lives in a separate `Message & GIF`
accordion (`ALERT GIF`, `Choose GIF`, `Change GIF`, `Off uses your default alert GIF`)
and rides on the alert itself, so a tip either clears `MINIMUM AMOUNT TO SHOW ALERT`
and gets the whole alert including its GIF, or it does not. Varying the GIF by amount
is a different feature — *"Play a different alert sound or GIF for specific tip
amounts"* — the per-amount alert rules. Consequence: any test phrased as "GIF tip
below/at the GIF minimum" has **no control to act on** and is obsolete by design, not
by regression.

**Text to speech is one switch, not a set of per-content-type toggles.** The Alert tab
carries a `Text to speech` **switch** — copy: *"Reads the tip note out loud on your
stream."* — plus one neighbour, `Filter repeated words` (*"Collapses spammed words
before they are read."*). Together with `MINIMUM AMOUNT FOR TEXT TO SPEECH` that is the
whole TTS surface.

So narrating the **viewer's message** is exactly what the `Text to speech` switch does;
what does *not* exist is a separate toggle for narrating the **support template**. Do not
read "Text to speech" as a section heading — it is an interactive
`button[role="switch"]`, and reading it as a heading is how a session concluded the
toggle was gone.

Media Share (`?activeTab=media-share`) exposes `MINIMUM TIP` plus
`Video & GIF pricing`, described as *"The floor for any clip or GIF, whatever its
length."*

The 15 widget tabs are `alert-tts`, `media-share`, `merged`, `vipqueue`, `songshare`,
`spinwheel`, `milestone`, `leaderboard`, `qrcode`, `subathon`, `subathongacha`,
`runningtext`, `runningtextoverlay`, `featuredproduct`, `voting`. Searching all of
them with every accordion open returns **zero** occurrences of gift, wishlist,
discord, webhook, hadiah, or reward — which independently confirms the
"Removed outright" list above rather than relying on a single earlier pass.

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
