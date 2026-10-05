import * as fs from 'fs';
import * as path from 'path';
import type { BrowserContext } from '@playwright/test';
import { testAccounts, type TestAccount, type TestTokenEnvVar } from '@test-data/users';
import { decodeTokenClaims, isTokenExpired } from './token-utils';

/** JWT `uuid` claim, or undefined for a malformed token. */
export function getTokenUuid(token: string): string | undefined {
  try {
    const uuid = decodeTokenClaims(token).uuid;
    return typeof uuid === 'string' ? uuid : undefined;
  } catch {
    return undefined;
  }
}

/** Extracts the `at` cookie from the browser context after login. */
export async function extractAccessToken(context: BrowserContext): Promise<string> {
  const cookies = await context.cookies();
  const atCookie = cookies.find((c) => c.name === 'at');
  if (!atCookie?.value) {
    throw new Error('Cookie "at" not found after login — token extraction failed');
  }
  return atCookie.value;
}

/** Maps a JWT to its .env slot by the account whose `uuid` the token carries. */
export function resolveTokenEnvVar(token: string): TestTokenEnvVar {
  const uuid = getTokenUuid(token);
  const account = Object.values(testAccounts).find((a) => a.uuid === uuid);
  if (!account) {
    throw new Error(
      `JWT uuid "${uuid ?? 'unreadable'}" is not a mapped test account ` +
        `(${Object.values(testAccounts).map((a) => `${a.displayName} → ${a.envVar}`).join(', ')}). Pass envVar explicitly.`,
    );
  }
  return account.envVar;
}

/** True when the account's token is missing, expired, or belongs to another account. */
export function tokenNeedsRefresh(token: string | undefined, account: TestAccount): boolean {
  if (!token) return true;
  if (isTokenExpired(token)) return true;
  return getTokenUuid(token) !== account.uuid;
}

/** Throws unless the token belongs to `account` (by JWT uuid). */
export function assertTokenOwner(token: string, account: TestAccount): void {
  const uuid = getTokenUuid(token);
  if (uuid !== account.uuid) {
    const owner = Object.values(testAccounts).find((a) => a.uuid === uuid)?.displayName ?? `unknown uuid ${uuid}`;
    throw new Error(`${account.envVar} belongs to ${owner}, expected ${account.displayName} (${account.uuid}).`);
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
