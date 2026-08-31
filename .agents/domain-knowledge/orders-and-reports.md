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

## Orders list pagination

Default 10 rows per page with a `Page X of Y` indicator and first/prev/next/last
buttons that disable correctly at both ends. Default order is purchase date
descending and stays stable across pages — a full traversal of 19 pages yielded
exactly 188 orders with no duplicates or dropped rows. **There is no column sorting
control at all**, and no loading indicator: the table can sit empty for a few seconds
after a filter change, so poll rather than assert immediately.

Filters live only in component state — the URL stays `/products?tab=orders` no matter
what is applied, so a filtered view cannot be shared or bookmarked.
