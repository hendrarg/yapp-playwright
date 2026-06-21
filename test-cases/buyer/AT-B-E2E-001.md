# AT-B-E2E-001: Buyer Explore Feed — Browse, View Tabs & Infinite Scroll

## Meta

| Field | Value |
|---|---|
| Auto Test ID | AT-B-E2E-001 |
| Layer | E2E Journey |
| Priority | Critical |
| Epic | Buyer Discovery |
| Feature | Discover Feed through Explore |
| Row Coverage | Row 4, 6, 7, 8, 10, 11, 19 |

## Objective

Validasi bahwa Buyer dapat browse Explore feed, berpindah antar tab (For You, Following, Exclusive), melihat mixed content (public + locked), infinite scroll berfungsi, section "Creators You Might Like" tampil, dan public image post bisa dibuka.

## Preconditions

- Buyer logged in
- Buyer sudah follow minimal 1 creator
- Terdapat exclusive/gated content yang aktif
- Terdapat public post dengan image
- Terdapat minimal cukup post untuk trigger infinite scroll

## Test Flow

### Step 1 — Open Explore Tab

- Buka halaman Explore
- **Verify:** Feed menampilkan mixed content (public posts dan locked posts dalam satu feed)
- **Verify:** Locked post menampilkan blur preview dan lock icon

### Step 2 — Infinite Scroll

- Scroll ke bawah sampai mentok visible posts
- **Verify:** Post tambahan di-load otomatis tanpa klik "Load More"
- **Verify:** Tidak ada duplikat post setelah load
- **Verify:** Loading indicator muncul saat fetching

### Step 3 — Switch to For You Tab

- Klik tab "For You"
- **Verify:** Feed berubah ke konten For You
- **Verify:** Halaman load tanpa error

### Step 4 — Switch to Following Tab

- Klik tab "Following"
- **Verify:** Hanya post dari creator yang di-follow yang muncul
- **Verify:** Jika tidak follow siapa-siapa, tampil empty state atau suggestion

### Step 5 — Switch to Exclusive Tab

- Klik tab "Exclusive"
- **Verify:** Hanya exclusive/gated content yang ditampilkan
- **Verify:** Lock icon dan price label terlihat pada setiap post

### Step 6 — Creators You Might Like

- Kembali ke Explore atau For You tab
- **Verify:** Section "Creators You Might Like" ditampilkan
- **Verify:** Menampilkan creator cards dengan profile picture dan Follow button

### Step 7 — Open Public Image Post

- Klik salah satu public image post
- **Verify:** Full image content visible (tidak blur, tidak locked)
- **Verify:** Post detail page terbuka dengan benar

## Expected Result

Semua feed tab load dengan benar, infinite scroll berfungsi, content type (public vs locked) tampil sesuai state, section rekomendasi creator muncul, dan public image post bisa diakses penuh.

## Test Data

| Data | Value |
|---|---|
| Buyer Account | (buyer test account) |
| Followed Creator | (creator yang sudah di-follow) |
| Min Posts for Scroll | > 10 posts di Explore feed |

## Notes

- Infinite scroll behavior mungkin berbeda di mobile vs desktop — test di kedua viewport jika applicable
- Tab switching bisa pakai URL hash atau client-side routing — perhatikan apakah URL berubah saat switch tab
- "Creators You Might Like" mungkin tidak muncul jika Buyer sudah follow semua creator — pastikan ada creator yang belum di-follow
