import * as fs from 'fs';
import * as path from 'path';
import type { BrowserContext } from '@playwright/test';

/** Extracts the `at` cookie from the browser context after login. */
export async function extractAccessToken(context: BrowserContext): Promise<string> {
  const cookies = await context.cookies();
  const atCookie = cookies.find((c) => c.name === 'at');
  if (!atCookie?.value) {
    throw new Error('Cookie "at" not found after login — token extraction failed');
  }
  return atCookie.value;
}

/** Persists the token to .env by replacing the YAPP_TEST_ACCESS_TOKEN line. */
export function saveTokenToEnv(token: string, envPath = '.env'): void {
  const absPath = path.resolve(process.cwd(), envPath);
  const content = fs.readFileSync(absPath, 'utf8');
  const lines = content.split('\n');
  let found = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('YAPP_TEST_ACCESS_TOKEN=')) {
      lines[i] = `YAPP_TEST_ACCESS_TOKEN="${token}"`;
      found = true;
      break;
    }
  }
  if (!found) {
    lines.push(`YAPP_TEST_ACCESS_TOKEN="${token}"`);
  }
  fs.writeFileSync(absPath, lines.join('\n'));
  process.env.YAPP_TEST_ACCESS_TOKEN = token;
}
