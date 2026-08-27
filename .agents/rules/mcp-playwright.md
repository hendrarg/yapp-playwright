# MCP Playwright

## Server registration

The `@playwright/mcp` npm package (`^0.0.76` in `package.json`) ships the `playwright-mcp` CLI, but `.mcp.json` does **not** invoke it directly — it runs a repo wrapper so every session gets the same browser, viewport, and account:

- **Registered in `.mcp.json`** (project scope) as `node scripts/playwright-mcp.mjs`. The wrapper loads `.env`, pins the browser cache through `applyPlaywrightBrowsersPath()`, then spawns the **locally installed** `node_modules/@playwright/mcp/cli.js` with `--browser=chromium --viewport-size=1440,900 --isolated`. Do NOT register `npx @playwright/mcp@latest` — it drifts from the locked version and bypasses the wrapper entirely.
- `--isolated` keeps the profile in memory, so the `--storage-state` file that `scripts/mcp-auth-storage.mjs` writes from `YAPP_MCP_ACCOUNT` is applied to a fresh context on every start.
- Verify health: `claude mcp list` should report `playwright: node scripts/playwright-mcp.mjs - ✔ Connected`.
- Tools appear as `mcp__playwright__*` (e.g. `browser_navigate`, `browser_snapshot`, `browser_click`, `browser_run_code_unsafe`). A session restart + one-time MCP approval prompt may be required before they are available.

## Browser inspection vs API inspection

- **UI / DOM / locator checks** → MCP Playwright (real browser, accessibility snapshot, live element tree). Do not use `.mjs` scratch scripts for this.
- **API operations** (seed/inspect/delete products, read backend state like After Sales config) → plain `fetch`/helper scripts (`@helpers/api/*`). MCP Playwright drives a browser and cannot make raw API calls.

## Token injection (authenticated pages)

The creator/buyer apps share one `at` cookie on the apex domain (`.yapp.ink`) — the same mechanism as `loginWithToken` in `src/helpers/auth/token-login.ts`.

The MCP browser normally starts **already authenticated**: the wrapper writes a storage state for `YAPP_MCP_ACCOUNT` (`qa` by default → `YAPP_TEST_ACCESS_TOKEN`) and the server loads it. Inject the cookie by hand only when that did not happen — `YAPP_MCP_ACCOUNT=guest`, a missing or expired token (the wrapper logs which), or when you need to switch accounts without restarting the server:

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

## Session cleanup

`browser_close` is **not** enough. Its tool schema says "Close the page", and its handler only emits `await page.close()` — the browser process the MCP server launched keeps running as an empty window, and a new one is added every time a server restarts. Finish every MCP exploration with:

```powershell
npm run mcp:clean
```

- Closes browsers under the Playwright cache (`resolvePlaywrightBrowsersPath()`) plus this repo's `@playwright/mcp` node servers.
- **Never** touches a normal Chrome install, a browser owned by a running `playwright test`, or an MCP server started by another tool (Cursor, `npx @playwright/mcp@latest`). Those need `--all-servers`.
- `--dry-run` lists what would go; `--browsers` keeps the servers up so the next MCP call stays fast.

Duplicate MCP servers are the real leak: one per client, and they outlive the session that started them. Check with `npm run mcp:clean -- --dry-run` when the machine feels heavy.
