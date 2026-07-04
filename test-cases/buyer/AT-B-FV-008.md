# AT-B-FV-008: Tip Validation — Currency Switch to USD

## Meta

| Field | Value |
|---|---|
| Auto Test ID | AT-B-FV-008 |
| Layer | Functional Validation |
| Priority | Medium |
| Epic | Buyer Discovery |
| Feature | Support + Tip |

## Objective

Validasi bahwa Buyer dapat switch currency ke USD, mengisi amount valid, dan mengirim tip dalam USD.

## Preconditions

- Buyer logged in
- On creator profile Support section with tip form visible

## Test Flow

### Step 1 — Open Support Section

- Buka halaman profil creator
- **Verify:** Support section tampil dengan currency selector (IDR/USDT)
- **Verify:** Send Tip button disabled

### Step 2 — Select USD Currency

- Pilih currency USD (USDT)
- **Verify:** USD button dalam state active
- **Verify:** Tip suggestions berubah ke USD format
- **Verify:** Input placeholder sesuai currency USD

### Step 3 — Enter Valid Amount

- Masukkan amount 1
- **Verify:** Send Tip button enabled

### Step 4 — Submit Tip

- Klik Send Tip
- **Verify:** Redirect ke tip page dengan amount USD

## Expected Result

Tip dalam USD berhasil diproses dengan amount yang valid.

## Test Data

- creator : hendrarg

## Notes

- TC-466
- Gunakan `authTest`
- Status: Failed — mungkin perlu re-test
