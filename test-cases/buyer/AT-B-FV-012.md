# AT-B-FV-012: Member-Only Badge Display

## Meta

| Field | Value |
|---|---|
| Auto Test ID | AT-B-FV-012 |
| Layer | Functional Validation |
| Priority | Medium |
| Epic | Buyer Discovery |
| Feature | Monetization Indicators |

## Objective

Validasi bahwa badge "Member Only" tampil konsisten pada exclusive/membership-only content di feed dan creator profile.

## Preconditions

- Buyer logged in
- Membership-only content exists in feed and creator profile

## Test Flow

### Step 1 — Verify Member-Only Badge in Feed

- Buka halaman Feeds
- **Verify:** Feed berada di tab Following
- **Verify:** Post membership-only menampilkan badge "Member Only"
- **Verify:** Lock icon terlihat pada post exclusive

### Step 2 — Verify Member-Only Badge on Creator Profile

- Buka halaman profil creator yang memiliki exclusive post
- Switch ke tab Feeds
- **Verify:** Post yang sama menampilkan badge "Member Only"
- **Verify:** Indicator konsisten antara feed dan profile

## Expected Result

Badge "Member Only" dan lock icon tampil konsisten di feed dan creator profile.

## Test Data

-

## Notes

- TC-478, TC-479
- Gunakan `authTest` karena perlu melihat content
