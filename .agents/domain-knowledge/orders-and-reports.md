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
