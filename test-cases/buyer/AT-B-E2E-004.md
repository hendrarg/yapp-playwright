# AT-B-E2E-004: Buyer Like/Unlike Post — Full Cycle Across Pages

## Meta

| Field | Value |
|---|---|
| Auto Test ID | AT-B-E2E-004 |
| Layer | E2E Journey |
| Priority | High |
| Epic | Buyer Discovery |
| Feature | Like + Unlike |

## Objective

Validasi bahwa Buyer dapat like dan unlike post dari berbagai halaman (Explore feed, Post Detail, Following feed, Creator Profile), like count terupdate secara real-time, dan state like/unlike konsisten di seluruh halaman.

## Preconditions

- Buyer logged in
- Post exists in multiple feeds ( Following, Creator Profile)
- Post belum di-like oleh Buyer

## Test Flow

### Step 1 — Open feeds : /feeds

- Buka halaman Feeds    
- **Verify:** Feed berada di tab Following 
- **Verify:** Section "Creators You Might Like" ditampilkan

### Step 2 — Like a Post from Feed

- Klik icon Like pada sebuah post
- **Verify:** Like count bertambah 1
- **Verify:** Like icon menjadi active / highlighted

### Step 3 — Verify Liked State on Post Detail

- Klik post yang sama untuk membuka Post Detail
- **Verify:** Like icon menampilkan state active (liked)
- **Verify:** Like count konsisten dengan feed
- Klik back di halaman detail post

### Step 4 — Unlike Post from Creator Profile

- Buka halaman profil creator dari feeds / klik name kreator in feeds
- Klik Unlike pada post tersebut
- **Verify:** Like count berkurang 1
- **Verify:** Like icon kembali ke state inactive

### Step 5 — Verify Unlike State Across Pages

- Buka Post Detail untuk post yang di-unlike
- **Verify:** Like icon inactive, count berkurang
- Cek di Explore feed
- **Verify:** State unlike konsisten (icon inactive)

## Expected Result

Like/unlike berfungsi dari semua halaman (Explore, Following, Creator Profile, Post Detail), like count langsung terupdate, dan state like/unlike konsisten di seluruh halaman.

## Test Data

-

## Notes

- Consolidates TC-443, TC-460, TC-516, TC-517, TC-518, TC-519, TC-520, TC-521, TC-523, TC-524 — all like/unlike scenarios across pages
- TC-522 (rapid tap prevention) is handled in FV layer (AT-B-FV-005)
- Verifikasi like count bisa berbeda jika ada user lain yang like/unlike secara bersamaan — gunakan count snapshot awal sebagai baseline
