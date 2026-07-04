# AT-B-FV-006: Locked Exclusive Media — Preview Blocked Before Unlock

## Meta

| Field | Value |
|---|---|
| Auto Test ID | AT-B-FV-006 |
| Layer | Functional Validation |
| Priority | High |
| Epic | Buyer Discovery |
| Feature | Preview Clicked Media |

## Objective

Validasi bahwa media dari locked exclusive post tidak dapat di-preview sebelum unlock — konten tetap blur dan tidak bisa diakses penuh.

## Preconditions

- Buyer logged in
- Exclusive media post exists, locked (not purchased)

## Test Flow

### Step 1 — Open Feeds with Exclusive Content

- Buka halaman Feeds
- **Verify:** Locked exclusive post tampil dengan blur + lock icon

### Step 2 — Attempt to Preview Media

- Klik media pada locked exclusive post
- **Verify:** Media preview tetap blur/tidak full
- **Verify:** Unlock button atau prompt unlock ditampilkan

## Expected Result

Media locked exclusive tidak bisa diakses penuh, konten blur, unlock button muncul.

## Test Data

-

## Notes

- TC-515
- Gunakan `authTest`
