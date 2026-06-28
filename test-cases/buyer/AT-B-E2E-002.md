# AT-B-E2E-002: Buyer Creator Profile — Navigate Tabs & View Content

## Meta

| Field | Value |
|---|---|
| Auto Test ID | AT-B-E2E-002 |
| Layer | E2E Journey |
| Priority | Critical |
| Epic | Buyer Discovery |
| Feature | Profile|
| TC Coverage | TC-450, TC-451, TC-452, TC-453, TC-454, TC-455, TC-456, TC-463, TC-464 |

## Objective

Validasi bahwa Buyer dapat membuka creator profile page, berpindah antar tab (Feeds, Shops, Links, Support, All Feeds), melihat konten per tab dengan benar, membuka detail post, melihat photo post, dan melihat membership plans section.

## Preconditions

- Creator profile exists with posts, products, links, membership

## Test Flow

### Step 1 — Open Creator Profile Page : /hendrarg

- Buka halaman creator profile
- **Verify:** Creator profile page loads successfully

### Step 2 — View Membership Plans Section
- **Verify:** Feed berada di tab Shops 
- **Verify:** Creator profile picture, name, dan bio ditampilkan
- **Verify:** Products dari creator ditampilkan
- **Verify:** Setiap product menampilkan image, name, price, dan affiliate indicator (if applicable)

### Step 3 — View Membership Plans Section

- **Verify:** Menampilkan max 2 membership plan dan link show more
- **Verify:** Available membership plans dan benefits ditampilkan
- **Verify:** Setiap tier menampilkan name, price, benefits/rewards

### Step 4 — View Support Creator

- **Verify:** Menampilkan max 2 membership plan dan link show more
- **Verify:** Available select input amount IDR OR USDT
- **Verify:** Available suggestion price dan bisa dipilih example
- **Verify:** Button send tips disable befor input sent tip
- pilih sugestion tips 50000
- **Verify:** Button send tips enable after input sendtip

### Step 5 — Switch to Links Tab

- Klik tab "Links"
- **Verify:** Links dari creator ditampilkan
- **Verify:** Setiap link menampilkan creator, img, dan title

### Step 6 — Switch to Support Tab

- Klik tab "Support"
- **Verify:** Support sent tip ditapilkan
- **Verify:** mennampikan creator sent "uang", comment dan juga waktu

### Step 7 — Switch to Feeds Tab

- Klik tab "Feeds"
- **Verify:** Feed terbuka di tab all fieeds
- **Verify:** Feed posts dari creator ditampilkan
- **Verify:** Post content, engagement (likes, comments), dan linked products (if any) ditampilkan

### Step 7 — Switch to Feeds eksclusive only

- Klik "Exclusive Only" in feeds
- Buka creator photo post (public)
- **Verify:** Photo ditampilkan dengan jelas dan successfully
- **Verify:** Image tidak blur dan tidak locked (untuk public post)

## Expected Result

All creator profile tabs navigate correctly, content loads per tab, post detail opens successfully, photo post displays clearly, dan membership plans section shows available tiers dengSan benefits.

## Test Data
- profile : hendrarg

## Notes

- Tab order bisa berbeda-beda tergantung creator's tab configuration (Configure Tab Order feature) — pastikan test dengan creator yang punya semua tab aktif
- Support tab mungkin tidak muncul jika creator tidak mengaktifkan tip/membership — pastikan test creator punya support enabled
- All Feeds tab bisa menampilkan konten exclusive yang locked untuk buyer yang belum purchase — verify lock state tetap ada
- Membership plans section mungkin tidak ada jika creator belum create any tier — pastikan test creator punya minimal 1 membership tier
- Perhatikan apakah URL berubah saat switch tab (client-side routing vs hash-based)
