---
title: Orders and reports
type: note
category: project
tags: [yapp, product, automation, orders-and-reports]
project: yapp
created: 2026-09-04
updated: 2026-09-09
sources: 0
status: active
---

> [[projects/yapp/knowledge/index|Knowledge index]]

# Orders and reports

The creator Orders list, order details, and the CSV export. Established across the
Aug 2026 test sessions.

## The CSV export has its own range state

`Export as CSV` opens a dialog with its own `Range Time` select — default `30 days`,
options 30 / 60 / 90 / `Custom Days` — and it is **not** synchronised with the page
filter. Set the range **inside the dialog**; do not assume the page filter carries
over.

## Promo attribution lives only in the export

If an assertion needs to know which promo an order used, the only source is the
`Promo Code Name` and `Promo Code Discount` columns of `GET /orders/reports`.
`GET /shop/orders/{uuid}` does not carry it, and neither does the order-details UI.

This is also how the immutability of an old order is verified without making a
payment.

## Order status is not exposed to the creator

The Orders list, Order Details, and the CSV all lack a status column or label. There
is no creator-side surface that distinguishes pending from failed from completed.

## The figures reconcile

- **Earnings equal the export.** The `30 days earnings` card and the sum of the
  `Received By Seller` column agree exactly, and row counts match one-to-one with
  unique Order IDs — no duplicates.
- **Period presets are inclusive**: today minus N days.
- **Promo discount maths is exact**, and fees are recomputed against the discounted
  subtotal: 99.000 × 20% = 19.800, × 15% = 14.850, × 25% = 24.750; a fixed 5.000
  gives subtotal 94.000.

## Order history cannot be emptied

Orders cannot be deleted from the UI, so no existing account can be returned to a
zero-order state. token1 holds 200 orders (191 completed, 9 expired). token2 is the
closest to clean — zero products and `totalEarnings: 0` — but still carries one
completed order (a free digital download, 7 Aug 2026), reachable with
`YAPP_MCP_ACCOUNT=sundanese`.

## The export ignores the page filters entirely

Not merely "unsynchronised": the export request is always
`GET /api/v1/orders/reports?status=completed&start_date=…&end_date=…` with **no
product-type parameter**, so the CSV follows the dialog's date range alone. The two
controls do not even share presets — the dialog offers 30 / 60 / 90 days, the page
filter offers 7 / 14 / 30 / 60 — and the dialog says nothing about this, so a creator
who filtered the page will assume the filter carried over. Verified 2026-08-14.

## CSV file shape

Filename is `report_YYYYMMDD_HHMMSS_user_{username}.csv` on **server** time, e.g.
`report_20260813_170314_user_hendrarg.csv`. Comma delimiter, LF line endings, file
ends with a newline, no UTF-8 BOM, served over a signed URL with no
`Content-Disposition`.

**The header schema is not fixed.** Product custom questions become columns, so the
column count varies by dataset — 25 on the baseline data. Any consumer that assumes a
fixed header will break. Escaping of commas, newlines and quotes inside a field, and
formula-injection protection, are still untested because no existing order contains
those characters.

## The CSV is UTC and labels itself; the web view is local — by design

The two surfaces are **meant** to differ (ruled by the product owner 2026-09-02): the
web view shows local time, the export shows UTC. What was missing was the label, and it
is now there — the CSV date column is titled **`Purchase Date (UTC)`** and every value
carries the suffix, e.g. `2026-08-31 08:35:09 UTC`. The Orders list renders the same
instant in WIB.

So a test comparing a list time against a CSV time must add 7 hours (the WIB offset),
never assert equality, and must not treat the gap as a defect. Verified on three
matched orders, 2026-09-02.

## Order Details carries Purchase Date

Order Details shows a `Purchase Date` label with the date (e.g. `31 August 2026`),
consistent with the Orders List row for the same order, along with Order ID, customer,
product and amount. Verified 2026-09-02.

## Orders list pagination

Default 10 rows per page with a `Page X of Y` indicator and first/prev/next/last
buttons that disable correctly at both ends. Default order is purchase date
descending and stays stable across pages — a full traversal of 19 pages yielded
exactly 188 orders with no duplicates or dropped rows. **There is no column sorting
control at all**, and no loading indicator: the table can sit empty for a few seconds
after a filter change, so poll rather than assert immediately.

Filters live only in component state — the URL stays `/products?tab=orders` no matter
what is applied, so a filtered view cannot be shared or bookmarked.

**Changing a filter resets the page to 1.** From `Page 20 of 20`, selecting
`Last 30 days` gives `Page 1 of 4` with the table populated, and the order request
carries `page=1` rather than the previously active page number. The indicator never
points outside the range. Verified 2026-09-02 — this used to fail (the page number was
kept, leaving `Page 20 of 20` over a 4-page result), so do not copy assertions from
older notes that expected the stale number.

## /statistics is a NEW page, not a replacement for /analytics

**Corrected 2026-09-02 after an error.** An earlier pass concluded that `/analytics`
was gone and the `Analytics` sheet's test cases were stale. That was wrong: the probe
loop stopped at the first route that answered and never opened `/analytics` at all.

Both pages exist, and they are different products:

| Route | Holds |
|-------|-------|
| `/analytics?tab=analytics` | **Revenue Overview** — Total Revenue, Tipping Revenue, Product Sales, Campaign Activations, PPV, Membership, Lifetime Access, each with a growth percentage, plus the multi-source revenue graph |
| `/analytics?tab=transactions` | **Performance Details** — tabs Products / Tipping / Campaigns Activations / PPV / Membership / Lifetime Access, the transaction table, and **Export as CSV** |
| `/statistics` | A separate, newer page: Audience (profile & product views, wishlist adds, money left in carts), Activity over time, Buyer journey funnel, a Products table with sortable columns, and Reach (best time to post, link performance). No tabs, **no export** |

The creator **Orders** list also lives under `/analytics` — the sidebar links Orders to
`/analytics?tab=transactions`, and `/orders` resolves to the same "Payments" screen.
`/products?tab=orders` does **not** open it.

So the `Analytics` sheet is **not** stale, and creator CSV export exists in two places:
the Orders export documented above and the Performance Details export on
`/analytics?tab=transactions`.

### `Profile views` counts page loads, not people

Verified 2026-09-02 with a controlled experiment on a brand-new creator whose entire
visit history was known: three deliberate reloads of the same public profile, same
browser, same person, ~4 seconds apart, moved the figure from **6 to 9**. The UI number
matches the `user_view_counters` row count exactly.

That table holds only `user_id`, `viewer_user_id` and `created_at` — no session key, no
device fingerprint — and `viewer_user_id` was `NULL` on every row, so there is no
structural way to deduplicate. The problem is the label: the section is headed
`Audience` and reads *"How many people came, and whether that is going up or down"*,
while the number counts page loads.

Do not use `Profile views` as a unique-visitor assertion in any test.

**The lesson worth keeping:** when checking whether a feature moved, probe every
candidate route to completion. Breaking out of the loop on the first success is how a
whole sheet came to be judged obsolete on the strength of the wrong page.

## The Export dialog's Custom Days calendar is a two-month grid

Choosing `Custom Days` renders **77 day cells at once** — two months side by side — so a
click driven by day-number text alone can land in the month that is not the one you
meant. During a 2026-09-02 retest the dialog's `data-range-start` / `data-range-end`
attributes still read `false` after two date cells were clicked, and `Download` fired no
`GET /orders/reports` request, so the requested range could not be compared with the
selected one. Scope the click to the intended month's container and assert the range
attributes flipped before pressing Download.

## Orders moved out of Products, 2026-09-09

`/products?tab=orders` no longer shows orders — it renders the ordinary Products table.
`/orders` now **redirects to `/analytics`**, where two header buttons switch between
**`Orders`** and **`Analytics`**; the Orders list is behind the first. The Analytics side
carries its own sub-tabs (`Products`, `Tipping`, `Campaigns Activations`, `PPV`,
`Membership`, `Lifetime Access`) and renders 20 rows, so do not confuse the two views.
Neither view puts filter state in the URL; only the Analytics side adds
`?tab=transactions`.

**The Orders list is 5 columns** — `ORDER ID`, `CUSTOMER`, `PRODUCT`, `PURCHASE DATE`,
`TOTAL PRICE` — with 10 rows per page, `Page X of Y`, working first/prev/next/last
disabling at both ends, default purchase-date descending that is stable across page
boundaries, and **no sorting control on any header**. There is **no status anywhere**: not
a column, not a field on `/orders/{uuid}`, not a CSV column. The only scope marker is
`status=completed` on the export request.

**Locator trap:** the page renders **two `<table>` elements** (the second looks like a
sticky-header clone), so a document-wide `tbody tr` count returns 20 when the page really
shows 10. Scope row counting to the first table.

**The product filter is a type filter, and its trigger renames itself.** Options are
`All Products`, `Digital Product`, `Digital Download`, `Online Course`,
`Discord Membership`, `Consultations`, `Events and Tickets`, `Telegram Membership` — eight
entries, as multi-select checkboxes. Empty reads `All Products`; once a type is ticked the
trigger shows **that type's name** (e.g. `Consultations`) and a `Reset Filter` button
appears beside it.

## The CSV export ignores the page filters

Verified by exporting twice on 2026-09-09. The request is always
`GET /api/v1/orders/reports?status=completed&start_date=…&end_date=…` with **no product
type parameter**: an unfiltered export produced 36 data rows, and after filtering the list
down to Consultations (21 pages → 3) the very same URL produced the same 36 rows. The two
range controls are also separate — the dialog offers `30 days`, `60 days`, `90 days`,
`Custom Days`, while the page filter offers `All Time`, `Last 7/14/30/60 days`,
`Custom Date`.

File shape, measured on the bytes: name `report_20260909_082828_user_hendrarg.csv`
(`report_YYYYMMDD_HHMMSS_user_{username}.csv`, server timestamp), comma delimiter, **LF
only**, trailing newline, **no UTF-8 BOM**, and 25 columns in both the header and every
data row. The schema is **dynamic** — the last column was `Siapakah tuhan mu ?`, a product
custom question — so never assert a fixed header list.

## 2026-09-24: Analytics and Orders split apart again — Performance Details moved wholesale to `/orders`

**Supersedes the "Orders moved out of Products, 2026-09-09" routing above.** The two
pages un-merged in the other direction. Verified live on creators-dev, account `hendrarg`:

- `/analytics` is now **only** Revenue Overview: Total Revenue, Tipping Revenue, Product
  Sales, Campaign Activations, PPV, Membership, Lifetime Access, each with a growth
  percentage, the date-range button (`All time` / `Last 7/14/30/90 days` / `Last 6
  months` / `Last 1 year` / `Custom Date`), and the multi-source graph with per-source
  toggle switches. The whole page is ~615 characters of text — no tabs, no "Performance
  Details" string anywhere, `document.querySelector('main').scrollHeight` equals the
  viewport height. This matches `TC-ANL-C-001` through `009` and `032` exactly; those
  stayed in the `Analytics` sheet.
- `/analytics?tab=transactions` **redirects to `/orders`** (the reverse of the 2026-09-09
  note — there is no `Orders`/`Analytics` toggle-button pair left).
- `/orders` now renders `Lifetime Earnings` / `All time earnings` cards plus a
  **`Performance Details`** section with the tabs `Products`, `Tipping`, `Campaigns
  Activations`, `PPV`, `Membership`, `Lifetime Access` — the exact tab set the `Analytics`
  sheet's TC-ANL-C-010 through C-031 used to test at the old `/analytics?tab=transactions`.
  The `Products` tab is this file's plain Orders list (5 columns, `All Time` / `All
  Products` filters); the other five tabs are per-category views, each with its **own**
  time filter and **own** `Export as CSV` (e.g. the PPV tab's filter is a combobox — `Last
  7/14/30/60 days`, `All time` — separate from the Products tab's button pair, and
  separate again from the Export dialog's own `Range Time` picker documented above).
  Tipping's `Recent`/`Leaderboard` sort menu still works from this tab, though
  `Leaderboard` itself has a bug — see below.
- Because that section no longer exists on `/analytics`, `TC-ANL-C-010` through `C-031`
  and `TC-ANL-C-034` (23 TCs — the whole Performance Details cluster, plus the empty-state
  TC that mixed Analytics and Statistics) were removed from the `Analytics` sheet
  2026-09-24 as obsolete-by-relocation, not as a feature regression. The `Orders` sheet's
  `TC-ORD-C-*` already covers the generic list/filter/export behavior on the `Products`
  tab; the other five tabs had no TC on either sheet, so `TC-ORD-C-072` through `C-084`
  (13 new TCs) were added the same day to close that gap — see the per-tab notes below.
- **Bug M-01 (Analytics → Orders) still reproduces at the new location.** Re-verified
  2026-09-24: PPV tab, custom range 1 Jul–24 Sep 2026, 11 records rendered; `Export as
  CSV` downloaded a file with the header row only, 0 data rows. The relocation is not a
  fix. Pinned by `TC-ORD-C-078` (Failed).
- Automation Mapping `AUT-FV-015` and `AUT-FV-016` had every one of their covered TC IDs
  removed by this cleanup and briefly covered zero TCs. Retired (rows deleted) 2026-09-24
  rather than retargeted — no other row's `Covered TC IDs`, and no `Automation
  Clarifications` row, referenced either ID, so removal left nothing dangling.

## The five relocated Performance Details tabs, one by one (verified 2026-09-24)

- **Tipping** has no search box, no time filter and no `Export as CSV` — just the
  `Recent`/`Leaderboard` sort control above the list. Each row is supporter name,
  relative time, tip amount, and the message text when the tip carried one (a private
  tip shows "Private (this message only available for you)" instead of the text).
  `Recent` calls `GET /api/v1/supporter?direction=DESC&status=completed&page=1` and is
  correctly ordered (`createdAt` strictly descending, checked 10 rows deep).
  `Leaderboard` calls `GET /api/v1/supporter/leaderboard?limit=10` and **is broken**: on
  an account with at least three distinct supporters (confirmed from the `Recent` data),
  it returned exactly one row — the creator's own name under a second display alias
  ("QA Tester"), with an amount that matches the sum of every one of *that one sender's*
  completed tips. The other two real supporters do not appear at any rank; this is not a
  low-rank truncation, the endpoint drops them outright. The one row's `timeAt` is the
  zero-value `0001-01-01T00:00:00Z`, which the frontend then diffs against "now" with no
  guard, rendering "2026 years ago". Filed as bug `M-80`, pinned by `TC-ORD-C-074`
  (Failed). `TC-ORD-C-073` (Recent) is Passed.
  Pagination here is **numbered** (`Previous 1 2 3 … 7 Next`), unlike every other tab's
  `Rows` / `Page X of Y` / first-prev-next-last control.
- **Campaigns Activations** has a combobox above the list that picks the **campaign
  type** (only `Donation` existed on this account, so it could not be checked with more
  than one option); each row is campaign name, relative time, donor name, and amount —
  **no message**, and no search/filter/export controls at all. This tab is structurally
  the odd one out among the six.
- **PPV**, **Membership** and **Lifetime Access** share one component: a `Search` box,
  a time-range combobox (`Last 7/14/30/60 days`, `All time` — fewer options than the
  Revenue Overview date button, and separate from the Export dialog's own `Range Time`
  picker), an `Export as CSV` button, and the standard pager. Confirmed CSV schemas:
  - PPV: `uuid, buyer_uuid, buyer_name, buyer_email, post_uuid, post_title,
    purchase_date, total_price` — **downloads header-only, 0 rows** (bug M-01).
  - Membership: `uuid, customer_uuid, customer_name, customer_email, membership_uuid,
    membership_title, membership_thumbnail_image, purchase_date, total_price` — export
    verified correct (20/20 rows matched the table).
  - Lifetime Access: `uuid, customer_uuid, customer_email, customer_name, purchase_date,
    total_amount` — note `customer_email` comes **before** `customer_name`, the reverse
    of Membership's column order — export verified correct (3/3 rows matched).
- All three default to `Last 30 days` and can show **0 rows** even when older data
  exists elsewhere in the account (PPV and Lifetime Access both did on this account) —
  always switch to `All time` or a wide custom range before judging a tab "empty".
