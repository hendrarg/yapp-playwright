# AT-B-FV-005: Like Idempotency — Rapid Tap Prevention

## Meta

| Field | Value |
|---|---|
| Auto Test ID | AT-B-FV-005 |
| Layer | Functional Validation |
| Priority | Medium |
| Epic | Buyer Discovery |
| Feature | Like a Post |

## Objective

Validasi bahwa rapid tap pada Like icon tidak menyebabkan double-like — hanya 1 like tercatat dan like count bertambah 1 saja.

## Preconditions

- Buyer logged in
- Post exists in feed, belum di-like

## Test Flow

### Step 1 — Open Feeds

- Buka halaman Feeds
- **Verify:** Post tampil dengan Like button dan like count awal

### Step 2 — Rapid Tap Like

- Tap Like icon dengan cepat beberapa kali
- **Verify:** Like count bertambah maksimal 1
- **Verify:** Like icon berubah ke state active

### Step 3 — Unlike to Reset

- Klik Unlike untuk reset state
- **Verify:** Like count kembali ke nilai awal
- **Verify:** Like icon inactive

## Expected Result

Rapid tap Like tidak menyebabkan double count, hanya 1 like yang tercatat.

## Test Data

-

## Notes

- TC-522
- Gunakan `authTest`
