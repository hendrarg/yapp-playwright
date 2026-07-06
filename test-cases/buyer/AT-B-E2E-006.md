# AT-B-E2E-006: Buyer Exclusive Content — Locked → Unlock Flow

## Meta

| Field | Value |
|---|---|
| Auto Test ID | AT-B-E2E-006 |
| Layer | E2E Journey |
| Priority | Critical |
| Epic | Buyer Discovery |
| Feature | Exclusive + Post Detail + Monetization |

## Objective

Validasi full flow exclusive content: locked post dengan blur + lock icon + price label, post detail dengan konten blur dan unlock button, purchase/unlock konten, verifikasi konten ter-unlock di feed dan detail, serta konsistensi price dan indikator monetization.

## Preconditions

- Buyer logged in
- Exclusive/member-only post exists (locked, belum di-unlock)

## Test Flow

### Step 1 — Verify Locked Post in Feed

- Buka halaman Feeds
- **Verify:** Locked post menampilkan blur preview + lock icon
- **Verify:** Monetization indicator tampil (Exclusive / Member Only / PPV label)
- **Verify:** Price label tampil di feed card

### Step 2 — Open Locked Post Detail

- Klik locked post card
- **Verify:** Post detail page terbuka
- **Verify:** Konten tetap blur/tersamar
- **Verify:** Teaser text terlihat
- **Verify:** Unlock button ditampilkan
- **Verify:** Full content TIDAK bisa diakses

### Step 3 — Unlock Content

- Klik Unlock button
- **Verify:** Konten ter-unlock segera (blur hilang)
- **Verify:** Full content dapat diakses

### Step 4 — Verify Unlocked State in Feed

- Kembali ke feed
- **Verify:** Post yang sama tidak lagi menampilkan lock icon
- **Verify:** State unlocked konsisten antara feed dan detail

### Step 5 — Verify Price Consistency

- **Verify:** Price di feed card sama dengan price di post detail page

### Step 6 — Verify Free Post No Lock Icon

- **Verify:** Post publik/gratis tidak menampilkan lock icon atau monetization indicator

## Expected Result

Full locked → unlock flow berjalan sempurna: indikator monetization benar, konten blur sebelum unlock, unlock bekerja, state konsisten di feed dan detail, price konsisten.

## Test Data

-

## Notes

- Consolidates TC-433, TC-448, TC-449, TC-457, TC-472~TC-489 — monetization indicators, post detail locked/unlocked, purchase flow
- Pastikan payment method tersedia untuk test purchase
- Tes ini mencakup verifikasi monetization indicator, locked/unlocked state, dan price consistency
