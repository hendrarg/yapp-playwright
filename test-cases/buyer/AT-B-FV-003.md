# AT-B-FV-003: Guest User Blocked — Like Action Requires Login

## Meta

| Field | Value |
|---|---|
| Auto Test ID | AT-B-FV-003 |
| Layer | Functional Validation |
| Priority | High |
| Epic | Buyer Discovery |
| Feature | Like a Post |

## Objective

Validasi bahwa guest user (tidak login) tidak dapat melakukan like pada post dan akan diminta Sign In.

## Preconditions

- User NOT logged in
- On feeds

## Test Flow

### Step 1 — Open Profile as Guest

- Buka halaman profil creator tanpa login
- **Verify:** Feeds tab button terlihat di halaman profil

### Step 2 — Switch to Feeds Tab

- Switch ke tab Feeds
- **Verify:** Post creator tampil di feeds tab

### Step 3 — Attempt to Like

- Klik button like pada post
- **Verify:** Muncul dialog "Sign in before following" dengan teks "Love this post?"
- **Verify:** button "Sign in now!" tersedia

### Step 4 — Redirect to Login

- Klik button "Sign in now!"
- **Verify:** Redirect ke halaman login (/auth)

## Expected Result

Guest user tidak dapat melakukan like pada post, muncul dialog Sign In, redirect ke /auth.

## Test Data

- creator : hendrarg

## Notes

- TC-444
- Gunakan fixture `test` (bukan `authTest`) karena test ini tanpa login
