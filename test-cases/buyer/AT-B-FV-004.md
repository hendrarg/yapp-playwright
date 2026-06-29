# AT-B-FV-004: Guest User Blocked — Comment Action Requires Login

## Meta

| Field | Value |
|---|---|
| Auto Test ID | AT-B-FV-004 |
| Layer | Functional Validation |
| Priority | High |
| Epic | Buyer Discovery |
| Feature | Comment on a Post |

## Objective

Validasi bahwa guest user (tidak login) tidak dapat melakukan komentar pada post dan akan diminta Sign In.

## Preconditions

- User NOT logged in
- On creator profile page

## Test Flow

### Step 1 — Open Profile as Guest

- Buka halaman profil creator tanpa login
- **Verify:** Feeds tab button terlihat di halaman profil

### Step 2 — Switch to Feeds Tab

- Switch ke tab Feeds
- **Verify:** Post creator tampil dengan comment count button

### Step 3 — Open Post Detail

- Klik comment count button pada post
- **Verify:** Post detail page terbuka
- **Verify:** "No comments yet." tampil
- **Verify:** "Sign in to drop a comment!" tampil

### Step 4 — Attempt to Comment

- Klik button "Sign In" di area comment
- **Verify:** Muncul dialog "Sign in before following"
- **Verify:** button "Sign in now!" tersedia

### Step 5 — Redirect to Login

- Klik button "Sign in now!"
- **Verify:** Redirect ke halaman login (/auth)

## Expected Result

Guest user tidak dapat melakukan komentar, muncul prompt Sign In, redirect ke /auth.

## Test Data

-

## Notes

- TC-446, TC-462
- Gunakan fixture `guestTest` karena test ini tanpa login
