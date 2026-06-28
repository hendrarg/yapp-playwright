# AT-B-E2E-005: Buyer Comment on Post — Submit & Verify

## Meta

| Field | Value |
|---|---|
| Auto Test ID | AT-B-E2E-005 |
| Layer | E2E Journey |
| Priority | High |
| Epic | Buyer Discovery |
| Feature | Comment on a Post |

## Objective

Validasi bahwa Buyer dapat membuka post detail, masuk ke comment section, submit komentar, dan memverifikasi komentar muncul dengan comment count bertambah.

## Preconditions

- Buyer logged in
- Post exists with comment section enabled

## Test Flow

### Step 1 — Open Feeds

- Buka halaman Feeds
- **Verify:** Feed berada di tab Following
- **Verify:** Post tampil dengan comment count

### Step 2 — Open Post Detail

- Klik post untuk membuka Post Detail
- **Verify:** Post detail page terbuka
- **Verify:** Comment section tersedia

### Step 3 — Open Comment Section

- Scroll ke comment section
- **Verify:** Comment input field tersedia
- **Verify:** Tombol submit comment tersedia and disable befor input comment

### Step 4 — Submit a Comment

- Ketik teks komentar di input field
- **Verify:** button Post enable
- Klik tombol Post
- **Verify:** Komentar muncul di list comment (teks match)
- **Verify:** Comment count bertambah 1

### Step 5 — Return to Feed and Verify Count

- Klik tombol Back untuk kembali ke feeds
- **Verify:** Berada di halaman feeds
- **Verify:** Comment count pada post yang sama bertambah 1

## Expected Result

Komentar berhasil dipost, muncul di comment section, comment count terupdate di post detail dan feed.

## Test Data

- Test comment automation

## Notes

- Consolidates TC-445, TC-461 — comment submit and verify across pages
- TC-525, TC-526, TC-527, TC-528 are DUPLICATES of Like section (copy-paste error in source) — excluded
