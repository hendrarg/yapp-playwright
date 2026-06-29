# AT-B-FV-001: Guest User Blocked — Following Tab Requires Login

## Meta

| Field | Value |
|---|---|
| Auto Test ID | AT-B-FV-001 |
| Layer | Functional Validation |
| Priority | High |
| Epic | Buyer Discovery |
| Feature | Discover Feed |

## Objective

Validasi bahwa guest user (tidak login) tidak dapat mengakses Following tab dan akan di-redirect atau diminta Sign In.

## Preconditions

- User NOT logged in
- On feeds/explore page

## Test Flow

### Step 1 — Open Feeds as Guest

- Buka halaman Feeds tanpa login
- **Verify:** You're not following anyone yet
- **Verify:** Follow creators to see their latest posts here

### Step 2 — Verify Auth Prompt

- klik follow 
- **Verify:** Muncul dialog 'Sign in before following'
- **Verify:** button "Sign in now!"

### Step 3 — Redirect to Login

- Klik button "Sign in now!"
- **Verify:** Redirect ke halaman login (/auth)

## Expected Result

Guest user tidak melihat Following tab, diarahkan ke Sign In.

## Test Data

-

## Notes

- TC-437
- Gunakan fixture `test` (bukan `authTest`) karena test ini tanpa login
