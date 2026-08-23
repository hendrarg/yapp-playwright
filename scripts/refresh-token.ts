/**
 * Refresh one mapped test account's access token through the real OTP login
 * flow, then persist it to `.env` under that account's slot.
 *
 * Usage: npm run token:refresh -- sundanese
 *        npm run token:refresh -- qa
 *
 * Companion to `npm run token:inspect`, which only reports what each slot holds.
 * The code itself is resolved through `YAPP_OTP_SOURCE` (auto | testmail | db),
 * so this keeps working while the testmail monthly quota is exhausted.
 */
import 'dotenv/config';
import { chromium } from '@playwright/test';
import { baseURL } from '../config/env';
import { testAccounts, type TestAccountKey } from '../src/test-data/users';
import { refreshAccountTokenViaOtp } from '../src/helpers/auth/refresh-token-otp';
import { decodeTokenClaims } from '../src/helpers/auth/token-utils';
import { closePool } from '../src/helpers/db/client';
import { applyPlaywrightBrowsersPath } from '../config/playwright-browsers-path.mjs';

applyPlaywrightBrowsersPath();

function parseAccountKey(raw: string | undefined): TestAccountKey {
  const keys = Object.keys(testAccounts) as TestAccountKey[];
  if (!raw) {
    throw new Error(`Pass an account (${keys.join(' | ')}) — e.g. npm run token:refresh -- sundanese`);
  }
  const key = keys.find((candidate) => candidate === raw);
  if (!key) {
    throw new Error(`Unknown account "${raw}". Expected one of: ${keys.join(', ')}`);
  }
  return key;
}

async function main() {
  const account = testAccounts[parseAccountKey(process.argv[2])];
  // Headed by default, matching playwright.config: the invisible captcha on
  // /auth is friendlier to a real window.
  const headless = process.env.PW_HEADLESS?.toLowerCase() === 'true';
  const namespace = process.env.TESTMAIL_NAMESPACE ?? '?';

  console.log(`Refreshing ${account.envVar} for ${account.displayName} (${account.username})`);
  console.log(`  inbox:  ${namespace}.${account.testmailTag}@inbox.testmail.app`);
  console.log(`  source: YAPP_OTP_SOURCE=${process.env.YAPP_OTP_SOURCE ?? 'auto'}\n`);

  const browser = await chromium.launch({ headless, args: ['--start-maximized'] });
  const context = await browser.newContext({ viewport: null });
  try {
    const token = await refreshAccountTokenViaOtp(context, account, baseURL);
    const claims = decodeTokenClaims(token);
    console.log(`Saved to ${account.envVar}`);
    console.log(`  id:      ${claims.id}`);
    console.log(`  uuid:    ${claims.uuid}`);
    console.log(`  expires: ${new Date(Number(claims.exp) * 1000).toISOString()}`);
  } finally {
    await context.close();
    await browser.close();
    // The OTP fallback may have opened the pg pool; without this the idle
    // client keeps the process alive for its 20s timeout.
    await closePool();
  }
}

main().catch((error) => {
  console.error(`\nFailed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
