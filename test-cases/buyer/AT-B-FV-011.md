# AT-B-FV-011: Free Post — No Monetization Indicator

## Meta

| Field | Value |
|---|---|
| Auto Test ID | AT-B-FV-011 |
| Layer | Functional Validation |
| Priority | Medium |
| Epic | Buyer Discovery |
| Feature | Monetization Indicators |

## Objective

Validasi bahwa post gratis/publik tidak menampilkan indikator monetization (lock icon, payment label, atau badge Member Only).

## Preconditions

- Buyer logged in
- Public free post exists in feed

## Test Flow

### Step 1 — Open Feeds

- Buka halaman Feeds
- **Verify:** Feed berada di tab Following
- **Verify:** Public post menampilkan icon publict 

### Step 2 — Open detail post

- Click post
- **Verify:** post ditampilkan 
- **Verify:** img or product ditampilkan

## Expected Result

Post publik/gratis tidak menampilkan indikator monetization apapun.

## Test Data

-

## Notes

- TC-481
- Gunakan `authTest` karena perlu melihat post di feed
