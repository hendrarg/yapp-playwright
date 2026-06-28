# AT-B-E2E-008: Buyer Support Creator — Tip IDR with Custom Amount

## Meta

| Field | Value |
|---|---|
| Auto Test ID | AT-B-E2E-008 |
| Layer | E2E Journey |
| Priority | High |
| Epic | Buyer Discovery |
| Feature | Support + Tip |

## Objective

Validasi bahwa Buyer dapat membuka Support tab di creator profile, memilih currency IDR, mengirim tip dengan custom amount, dan tip berhasil diproses.

## Preconditions

- Buyer logged in
- Creator profile exists with support/tip enabled

## Test Flow

### Step 1 — Open Profile and Support Tab

- Buka halaman profil creator
- Klik tab Support
- **Verify:** Support section ditampilkan
- **Verify:** Currency selector tersedia (IDR/USDT)
- **Verify:** Input tip amount tersedia
- **Verify:** Send Tip button dalam keadaan disabled

### Step 2 — Select IDR Currency

- Pilih currency IDR
- **Verify:** IDR button dalam state active/selected
- **Verify:** Tip suggestions muncul dalam IDR (Rp)
- **Verify:** Input placeholder sesuai currency IDR

### Step 3 — Enter Custom Tip Amount

- Klik salah satu tip suggestion (Rp50.000)
- **Verify:** Input field terisi amount yang dipilih
- **Verify:** Send Tipes button menjadi enabled

### Step 4 — Submit Tip

- Klik tombol Send Tipes
- **Verify:** Redirect to page "creator/tip"
- **Verify:** amount yang di input tampil sesuai
- **Verify:** name laready in field auto
- **Verify:** email already in filed auto
- **Verify:** checkbox already checked
- **Verify:** default payment qris

### Step 5 — Transaction

- Klik tombol Send Tip
- **Verify:** Redirect to page transaction
- **Verify:** subtotal, transfer fee, dan total ditampilkan 
- **Verify:** barcode ditampilkan
- **Verify:** button cek status
- **Verify:** order id ditampilkan
- **Verify:** tip to "name of creator" ditampilkan

### Step 6 — Post transaction via API

- CURL : 
curl --request post \
  --url https://staging.yapp.ink/api/v1/webhook/deposit-dev \
  --header 'content-type: application/json' \
  --data '{
  "orderID": "473dc7a6-da98-4a5c-a281-1bc92ad5920a"
}'
- order id disesuaikan
- wait 2 detik setelah berhasil sebelum ke step selanjutnya

### Step 7 — Transaction succed

- **Verify:** Payment Successful!
- **Verify:** card creator and amount
- **Verify:** button back to profile

## Expected Result

Tip IDR berhasil dikirim dengan custom amount, notifikasi sukses ditampilkan.

## Test Data

- creator : hendrarg

## Notes

- Consolidates TC-465, TC-467 — tip IDR + custom amount
- TC-466 (Tip USD) status Failed — mungkin perlu re-test
- Pastikan creator yang digunakan memiliki support/tip enabled
