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

## Order data has no status indicator

The Orders list, Order Details, and the CSV all lack a status column or label, so
any test case that needs to distinguish pending / failed / completed from the creator
side has no surface to read.

## Verified accurate to the rupiah

Recorded so the defect list is not read as wholesale breakage — these were checked and
match exactly:

- **Earnings match the export.** The `30 days earnings` card read Rp4.554.500 and the
  sum of the `Received By Seller` column across 89 CSV rows was 4.554.500. Row counts
  matched too: 89 dashboard rows = 89 CSV rows = 89 unique Order IDs, zero duplicates.
- **Period boundaries are correct and inclusive** on all four presets — today minus N
  days (7 days → 6 Aug, 14 → 30 Jul, 30 → 14 Jul).
- **Promo discount maths is exact** and fees are recomputed: 99.000 × 20% = 19.800;
  × 15% = 14.850; × 25% = 24.750; a fixed 5.000 gives subtotal 94.000.

## Account order fixtures

Relevant when a test case needs a creator with no history: token1 holds 200 orders
(191 completed + 9 expired) and orders cannot be deleted from the UI. token2 is the
better candidate — **zero products** and `totalEarnings: 0` — but still carries 1
completed order (a free digital download, 7 Aug 2026). A genuinely empty-earnings
session is reachable as token2 (`YAPP_MCP_ACCOUNT=sundanese`); a genuinely
zero-order account is not, without a new account.
