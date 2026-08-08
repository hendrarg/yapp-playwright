# MCP Playwright

## Server registration

The `@playwright/mcp` npm package (`^0.0.76` in `package.json`) ships the `playwright-mcp` CLI. Registering it as an MCP server is separate from having the dependency installed:

- **Registered in `.mcp.json`** (project scope), run via the **local pinned binary** `npx playwright-mcp` — do NOT use `@playwright/mcp@latest`, which can drift from the locked version.
- Verify health: `claude mcp list` should report `playwright: npx playwright-mcp - ✔ Connected`.
- Tools appear as `mcp__playwright__*` (e.g. `browser_navigate`, `browser_snapshot`, `browser_click`, `browser_run_code_unsafe`). A session restart + one-time MCP approval prompt may be required before they are available.

## Browser inspection vs API inspection

- **UI / DOM / locator checks** → MCP Playwright (real browser, accessibility snapshot, live element tree). Do not use `.mjs` scratch scripts for this.
- **API operations** (seed/inspect/delete products, read backend state like After Sales config) → plain `fetch`/helper scripts (`@helpers/api/*`). MCP Playwright drives a browser and cannot make raw API calls.

## Token injection (authenticated pages)

The creator/buyer apps share one `at` cookie on the apex domain (`.yapp.ink`) — the same mechanism as `loginWithToken` in `src/helpers/auth/token-login.ts`. The browser MCP session starts logged-out; inject the cookie to reach authenticated pages without OTP:

```javascript
// browser_run_code_unsafe
await page.context().addCookies([{
  name: 'at',
  value: '<ACCESS_TOKEN>',          // from .env: YAPP_TEST_ACCESS_TOKEN (or _2)
  domain: '.yapp.ink',              // apex domain — serves every subdomain
  path: '/',
  secure: true,
  sameSite: 'Lax',
}]);
```

Then `browser_navigate` to e.g. `https://creators-dev.yapp.ink/products`. If the page redirects to `/auth`, the cookie was not applied (or the token expired — check the JWT `exp`).

- The cookie persists for the lifetime of the MCP browser session.
- `.env` is not committed; never hardcode a real token into committed test files — read it from `process.env` / `.env` instead.

## Token refresh (expired token)

If the MCP browser session redirects to `/auth` and the `at` token in `.env` is expired (`isTokenExpired` / JWT `exp`), do a **conventional OTP login and persist the fresh token to `.env`** — the same flow the automation already uses (see `src/helpers/auth/refresh-token-otp.ts`, `src/helpers/auth/save-token.ts`, `tests/auth/otp-login.spec.ts`):

1. **Run the OTP login** against the real auth UI, using the mapped test account's testmail inbox:
   - `signInWithEmailOtp(page, baseURL, account)` — fills email from the account's testmail tag, clicks Continue, polls testmail.app for the 5-digit code (`fetchOtpCode`), types it into the `input[data-input-otp="true"]` fields, waits for `/explore`.
   - Needs `TESTMAIL_API_KEY` + `TESTMAIL_NAMESPACE` in `.env`.
2. **Extract the fresh token** from the browser context: `extractAccessToken(context)` reads the `at` cookie.
3. **Persist it back to `.env`**: `saveTokenToEnv(token, '.env', account.envVar)`.
   - Account → env var mapping (`src/test-data/users.ts`): QA Tester (`x7nv1.qa`, testmail tag `qa`) → `YAPP_TEST_ACCESS_TOKEN`; SDET (`x7nv1.sdet`, tag `sdet`) → `YAPP_TEST_ACCESS_TOKEN_2`.
4. **Re-inject the refreshed token** into the MCP browser context via `context.addCookies` (see Token injection above), then navigate again.

Quick path: run the OTP login spec (`npx playwright test tests/auth/otp-login.spec.ts --project=chromium`) — it logs in as QA Tester and saves the token to `.env` in one go. `refreshAccountTokenViaOtp(context, account, baseURL)` wraps login + save for fixture use.
