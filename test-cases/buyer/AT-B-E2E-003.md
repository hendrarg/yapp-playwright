# AT-B-E2E-003: Buyer Follow/Unfollow Creator — Full Cycle Across Entry Points

## Meta

| Field | Value |
|---|---|
| Auto Test ID | AT-B-E2E-003 |
| Layer | E2E Journey |
| Priority | Critical |
| Epic | Buyer Discovery |
| Feature | Follow Creator |

## Objective

Validasi bahwa Buyer dapat follow dan unfollow creator dari berbagai entry point (feed, creator profile, "Creators You Might Like" section, Following tab), dan state follow/unfollow konsisten di seluruh halaman.

## Preconditions

- Buyer logged in
- Target creator not followed yet
- Target creator appears in feed, "Creators You Might Like" section, and Following tab

## Test Flow

### Step 1 — Open feeds : /feeds

- Buka halaman Feeds    
- **Verify:** Feed berada di tab Following 
- **Verify:** Section "Creators You Might Like" ditampilkan

### Step 2 — Follow creator on "Creators You Might Like"

- Klik tombol follow di section creators you might like baris pertama
- **Verify:** Creator menghilang dari section creators you might like
- **Verify:** post creator yang di follow tampil di page "Following"

### Step 3 — Verify Follow State on Creator Profile

- Buka halaman profil creator yang sama
- **Verify:** Menampilkan "Following" Button

### Step 4 — Button following change to be unfollow

- Hover mouse to button following
- **Verify:** Following buton change tobe unfolow

### Step 5 — Unfollow from Creator Profile

- Click button unfollow 
- **Verify:** dialog unfollow button show with name creator 'unfollow "@namecreator"'
- **Verify:** Button unfollow and cancel 
- Click button unfollow
- **Verify:** Button follow ditampilkan

### Step 6 — Verify Unfollow State Across Pages

- Kembali ke Feeds → click banck button in profile
- **Verify:** berada di halaman Feed di tab Following 
- **Verify:** creator with same name show in creator you migh like with follow button
- **Verify:** post creator tidak di tampilkan di page following

## Expected Result

Follow/unfollow berfungsi dari semua entry point (feed, creator profile, "Creators You Might Like", Following tab), state konsisten di semua halaman setelah setiap aksi.

## Test Data

-

## Notes

- Consolidates TC-441, TC-459, TC-490, TC-491, TC-492, TC-493, TC-494, TC-495, TC-496, TC-497, TC-499 — all follow/unfollow scenarios across sections
- Pastikan target creator memiliki post di Following tab untuk verifikasi Step 4 dan Step 6
- "Creators You Might Like" section mungkin tidak muncul jika Buyer sudah follow semua creator — pastikan ada creator yang belum di-follow
