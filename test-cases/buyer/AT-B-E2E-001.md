# AT-B-E2E-001: Buyer Explore Feed — Browse, View Tabs & Infinite Scroll

## Meta

| Field | Value |
|---|---|
| Auto Test ID | AT-B-E2E-001 |
| Layer | E2E Journey |
| Priority | Critical |
| Epic | Buyer Discovery |
| Feature | Discover Feed through Explore |


## Objective

Validasi bahwa Buyer dapat browse Explore feed, berpindah antar tab ( Following, Your post, Exclusive), melihat mixed content (public + locked), infinite scroll berfungsi, section "Creators You Might Like" tampil, dan public image post bisa dibuka.

## Preconditions

- Buyer logged in on feeds

## Test Flow

### Step 1 — Open feeds : /feeds

- Buka halaman Feeds    
- **Verify:** Feed berada di tab Following 
- **Verify:** Section "Creators You Might Like" ditampilkan
- **Verify:** Menampilkan creator cards dengan profile picture dan Follow button

### Step 2 — Switch tab your post

- Klik tab "Your Post"
- **Verify:** Feed berubah ke konten your post
- **Verify:** Halaman load tanpa error

### Step 3 — Switch to Exclusive Tab

- Klik tab "Exclusive"
- **Verify:** Hanya exclusive/gated content yang ditampilkan
- **Verify:** Lock icon dan konnten terlihat pada setiap post

### Step 4 — Switch to Following Tab

- Klik tab "Following"
- **Verify:** Hanya Following content yang ditampilkan / tidak ada content kita

### Step 5 — Infinite Scroll

- Scroll ke bawah visible posts
- **Verify:** Post tambahan di-load otomatis
- **Verify:** Locked post menampilkan blur preview dan lock icon

### Step 6 — Open Public Image Post

- Klik salah satu public image post
- **Verify:** Full image content visible (tidak blur, tidak locked)
- **Verify:** Post detail page terbuka dengan benar

## Expected Result

Semua feed tab load dengan benar, infinite scroll berfungsi, content type (public vs locked) tampil sesuai state, section rekomendasi creator muncul, dan public image post bisa diakses penuh.

## Test Data
-

## Notes

- Infinite scroll behavior mungkin berbeda di mobile vs desktop — test di kedua viewport jika applicable
- Tab switching bisa pakai URL hash atau client-side routing — perhatikan apakah URL berubah saat switch tab
- "Creators You Might Like" mungkin tidak muncul jika Buyer sudah follow semua creator — pastikan ada creator yang belum di-follow
