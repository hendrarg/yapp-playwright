#!/usr/bin/env node
/**
 * Report which account each token slot in .env holds. Yapp JWTs carry `id` + `uuid` only, so the
 * owner is checked by uuid against src/test-data/users.ts (`testAccounts`). Never prints a token.
 */
import path from 'node:path';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: path.resolve(process.cwd(), '.env'), quiet: true });

// Mirrors testAccounts in src/test-data/users.ts.
const accounts = [
  { slot: 'creator', envVar: 'YAPP_TEST_ACCESS_TOKEN', uuid: '84ae3e39-ffe3-4d90-994c-413eb3435768', name: 'Creator (hendrarg)', refresh: 'npm run token:refresh -- creator' },
  { slot: 'buyer', envVar: 'YAPP_TEST_ACCESS_TOKEN_BUYER', uuid: '5bad6f80-dc4a-436e-b7ef-28293b32fa7b', name: 'QA buyer (anthony_mosciski)', refresh: 'npm run token:refresh -- qa' },
  { slot: 'token2', envVar: 'YAPP_TEST_ACCESS_TOKEN_2', uuid: '184bfcbc-80eb-427d-923d-fd558e4462de', name: 'Sundanese', refresh: 'npm run token:refresh -- sundanese' },
];

function decodeClaims(token) {
  const part = token.replace(/^"|"$/g, '').trim().split('.')[1];
  if (!part) return null;
  return JSON.parse(Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
}

console.log('Test token mapping check\n');
let bad = 0;
for (const { slot, envVar, uuid, name, refresh } of accounts) {
  const token = process.env[envVar];
  let status = 'missing';
  let claims = null;
  if (token) {
    try { claims = decodeClaims(token); } catch { claims = null; }
    const owner = accounts.find((a) => a.uuid === claims?.uuid)?.name ?? `unknown uuid ${claims?.uuid ?? '?'}`;
    const expired = claims?.exp ? claims.exp * 1000 < Date.now() : true;
    status = claims?.uuid !== uuid ? `WRONG ACCOUNT: ${owner}` : expired ? 'expired' : 'ok';
  }
  if (status !== 'ok') bad++;
  console.log(`${slot.padEnd(7)} ${envVar}`);
  console.log(`  expected: ${name} (${uuid})`);
  console.log(`  status:   ${status}${status === 'ok' ? '' : `  → ${refresh}`}`);
  if (claims?.exp) console.log(`  expires:  ${new Date(claims.exp * 1000).toISOString()}`);
  console.log('');
}
process.exitCode = bad ? 1 : 0;
