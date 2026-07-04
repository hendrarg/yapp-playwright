# AT-B-FV-007: Tip Validation — Invalid Amount Rejected

## Meta

| Field | Value |
|---|---|
| Auto Test ID | AT-B-FV-007 |
| Layer | Functional Validation |
| Priority | Medium |
| Epic | Buyer Discovery |
| Feature | Support + Tip |

## Objective

Validasi bahwa sistem menolak input tip dengan amount tidak valid (0, negatif, atau kosong) dan menampilkan pesan validasi.

## Preconditions

- Buyer logged in
- On creator profile Support section with tip form visible

## Test Flow

### Step 1 — Open Support Section

- Buka halaman profil creator
- **Verify:** Support section tampil dengan tip form
- **Verify:** Send Tip button dalam keadaan disabled

### Step 2 — open tip page

- Masukkan amount 0 
- **Verify:** Support section tampil dengan tip form
- **Verify:** Send Tip button enable
- click send tip button

### Step 3 — Validation amount is is required

- **Verify:** tip page
- Masukan amount 0
- **Verify:** Err message appear "Amount is required"

### Step 4 — Validation minimum amount

- Masukan amount 1 
- Masukkan amount 0 atau kosongkan input
- **Verify:** Err message appear "Minimum amount is Rp10.000"

## Expected Result

Tip dengan amount 0 bisa masuk ke tab tip tetapi ada validation

## Test Data

- creator : hendrarg

## Notes

- TC-468
- Gunakan `authTest`
- Status: Failed — mungkin perlu re-test
