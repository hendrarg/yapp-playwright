# AT-B-E2E-009: Buyer View Membership Plans — Browse & Select Tier

## Meta

| Field | Value |
|---|---|
| Auto Test ID | AT-B-E2E-009 |
| Layer | E2E Journey |
| Priority | High |
| Epic | Buyer Discovery |
| Feature | Membership |

## Objective

Validasi bahwa Buyer dapat melihat membership plans di creator profile, browse tier cards, klik Show More, dan membuka detail membership tier.

## Preconditions

- Buyer logged in
- Creator profile exists with membership tiers configured

## Test Flow

### Step 1 — Open Creator Profile

- Buka halaman profil creator
- **Verify:** Profile header tampil (profile picture, name, bio)
- **Verify:** Membership section tampil di sidebar kanan

### Step 2 — Verify Membership Section

- **Verify:** Membership heading ditampilkan
- **Verify:** Tier cards ditampilkan (max 2 sebelum Show More)
- **Verify:** Setiap tier menampilkan price (IDR) dan /month label
- **Verify:** Show More button tersedia

### Step 3 — Click Show More

- Klik tombol Show More
- **Verify:** direct to page membership : creatorname/membership
- **Verify:** Semua tier cards ditampilkan
- **Verify:** menampilkan button subcribe/subcribed, description and img

### Step 4 — Select a Membership Tier

- Klik salah satu membership tier card
- **Verify:** Navigasi ke halaman detail membership tier
- **Verify:** menampilkan tiername, billing, creator dan button subscribe/subscibed
- **Verify:** menampilkan beberapa benefit product atau rewards

## Expected Result

Membership section tampil dengan benar, Show More berfungsi, tier detail page terbuka dengan informasi yang sesuai.

## Test Data

- creator : davidalfasunarna

## Notes

- TC-469 (Membership subscription) status Failed — mungkin perlu re-test. TC ini hanya verify browse & select, bukan full subscription flow
- Pastikan creator yang digunakan (hendrarg) memiliki membership tiers
