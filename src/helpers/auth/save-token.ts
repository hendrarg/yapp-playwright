import * as fs from 'fs';
import * as path from 'path';
import type { BrowserContext } from '@playwright/test';
import { testAccounts, type TestTokenEnvVar } from '@test-data/users';
import { getTokenUsername, isTokenExpired } from './token-utils';

/** Extracts the `at` cookie from the browser context after login. */
export async function extractAccessToken(context: BrowserContext): Promise<string> {
  const cookies = await context.cookies();
  const atCookie = cookies.find((c) => c.name === 'at');
  if (!atCookie?.value) {
    throw new Error('Cookie "at" not found after login — token extraction failed');
  }
  return atCookie.value;
}

/** Maps a JWT to the correct .env key from `testAccounts`. */
export function resolveTokenEnvVar(token: string): TestTokenEnvVar {
  const username = getTokenUsername(token);
  if (!username) {
    throw new Error(
      'Could not read username from JWT. Pass envVar explicitly to saveTokenToEnv ' +
        `(${testAccounts.qa.envVar} for QA Tester or ${testAccounts.sundanese.envVar} for Sundanese).`,
    );
  }
  if (username === testAccounts.qa.username) {
    return testAccounts.qa.envVar;
  }
  if (username === testAccounts.sundanese.username) {
    return testAccounts.sundanese.envVar;
  }
  throw new Error(
    `Unknown JWT username "${username}". Expected QA Tester (${testAccounts.qa.username}) or Sundanese (${testAccounts.sundanese.username}).`,
  );
}

/** True when token1 is missing, expired, or clearly belongs to another mapped username. */
export function primaryTokenNeedsRefresh(token: string | undefined): boolean {
  if (!token) return true;
  if (isTokenExpired(token)) return true;
  const username = getTokenUsername(token);
  if (username && username !== testAccounts.qa.username) return true;
  return false;
}

/** Ensures YAPP_TEST_ACCESS_TOKEN belongs to QA Tester when the JWT exposes a username. */
export function assertPrimaryTestToken(token: string): void {
  const username = getTokenUsername(token);
  if (!username) {
    return;
  }
  if (username !== testAccounts.qa.username) {
    throw new Error(
      `YAPP_TEST_ACCESS_TOKEN belongs to "${username}", expected QA Tester (${testAccounts.qa.username}). ` +
        `OTP login for token1 uses testmail tag "${testAccounts.qa.testmailTag}" and saves to ${testAccounts.qa.envVar}. ` +
        `Sundanese OTP saves to ${testAccounts.sundanese.envVar}.`,
    );
  }
}

/** Persists a token to .env under the matching account env var (auto-detected from JWT username). */
export function saveTokenToEnv(token: string, envPath = '.env', envVar?: TestTokenEnvVar): void {
  const key = envVar ?? resolveTokenEnvVar(token);
  const absPath = path.resolve(process.cwd(), envPath);
  const content = fs.readFileSync(absPath, 'utf8');
  const lines = content.split('\n');
  const line = `${key}="${token}"`;
  let found = false;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith(`${key}=`)) {
      lines[i] = line;
      found = true;
      break;
    }
  }
  if (!found) {
    lines.push(line);
  }

  fs.writeFileSync(absPath, lines.join('\n'));
  process.env[key] = token;
}
