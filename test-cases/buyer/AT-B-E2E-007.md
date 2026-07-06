# AT-B-E2E-007: Buyer Media Preview — Image Gallery & Video Playback

## Meta

| Field | Value |
|---|---|
| Auto Test ID | AT-B-E2E-007 |
| Layer | E2E Journey |
| Priority | High |
| Epic | Buyer Discovery |
| Feature | Preview Clicked Media |

## Objective

Validasi bahwa Buyer dapat melakukan preview media (single image, multi-image gallery, video) dari feed dengan kontrol yang sesuai: fullscreen preview, zoom, swipe antar gambar, video playback dengan play/pause/seek, dan close kembali ke feed.

## Preconditions

- Buyer logged in
- Posts with single image, multi-image, and video exist across feeds (Following, Creator Profile)

## Test Flow

### Step 1 — Open Feeds with Media Posts

- Buka halaman Feeds
- **Verify:** Post dengan single image tampil
- **Verify:** Post dengan multi-image tampil
- **Verify:** Post dengan video tampil

### Step 2 — Preview Single Image

- Klik single image post
- **Verify:** Fullscreen preview terbuka
- Zoom in / zoom out gambar
- **Verify:** Zoom smooth, tidak distorsi
- Close preview
- **Verify:** Kembali ke feed di posisi semula

### Step 3 — Preview Multi-Image Gallery

- Klik multi-image post (klik gambar ke-2)
- **Verify:** Gallery terbuka di gambar yang diklik
- Swipe left
- **Verify:** Gambar berikutnya tampil
- Swipe right
- **Verify:** Gambar sebelumnya tampil
- Zoom masing-masing gambar di gallery
- **Verify:** Zoom independen per gambar
- Close gallery
- **Verify:** Kembali ke feed

### Step 4 — Video Playback

- Klik video post
- **Verify:** Fullscreen video terbuka
- **Verify:** Auto-play saat terbuka
- Pause video
- **Verify:** Video pause
- Play video
- **Verify:** Video resume
- Seek forward / backward
- **Verify:** Timestamp berubah sesuai seek
- Close video
- **Verify:** Kembali ke feed

## Expected Result

Semua tipe media dapat di-preview dengan benar: single image zoom, multi-image swipe/zoom, video playback controls.

## Test Data

-

## Notes

- Consolidates TC-500 ~ TC-514 — single image, multi-image gallery, zoom, video playback
- Pastikan ada post dengan single image, multiple images (gallery), dan video di feed
- Zoom behavior mungkin berbeda di mobile vs desktop
