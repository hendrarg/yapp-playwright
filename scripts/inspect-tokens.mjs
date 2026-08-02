#!/usr/bin/env node
import path from 'node:path';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: path.resolve(process.cwd(), '.env') });

const accounts = [
  { label: 'token1', envVar: 'YAPP_TEST_ACCESS_TOKEN', expected: 'x7nv1.qa', name: 'QA Tester' },
  { label: 'token2', envVar: 'YAPP_TEST_ACCESS_TOKEN_2', expected: 'x7nv1.sdet', name: 'Sundanese' },
];

function decodeClaims(token) {
  const part = token.replace(/^"|"$/g, '').trim().split('.')[1];
  if (!part) return null;
  const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));
}

function decodeUsername(token) {
  const claims = decodeClaims(token);
  if (!claims) return null;
  for (const key of ['username', 'preferred_username', 'unique_name', 'sub']) {
    if (typeof claims[key] === 'string' && claims[key]) return claims[key];
  }
  return null;
}

function status(token, expected) {
  if (!token) return 'missing';
  const username = decodeUsername(token);
  if (!username) return 'JWT has no username claim (id/uuid only)';
  return username === expected ? 'ok' : `WRONG USER: ${username}`;
}

console.log('Test token mapping check\n');
for (const { label, envVar, expected, name } of accounts) {
  const token = process.env[envVar];
  console.log(`${label} ${envVar}`);
  console.log(`  expected: ${name} (${expected})`);
  console.log(`  status:   ${status(token, expected)}`);
  if (token) {
    try {
      const claims = decodeClaims(token);
      if (claims?.id != null) console.log(`  id:       ${claims.id}`);
      if (claims?.uuid) console.log(`  uuid:     ${claims.uuid}`);
      if (claims?.exp) {
        const expired = claims.exp * 1000 < Date.now();
        console.log(`  expires:  ${new Date(claims.exp * 1000).toISOString()}${expired ? ' (expired)' : ''}`);
      }
    } catch {
      // ignore
    }
  }
  console.log('');
}

const ns = process.env.TESTMAIL_NAMESPACE ?? '?';
console.log(`OTP token1 inbox: ${ns}.qa@inbox.testmail.app → YAPP_TEST_ACCESS_TOKEN (QA Tester)`);
console.log(`OTP token2 inbox: ${ns}.sdet@inbox.testmail.app → YAPP_TEST_ACCESS_TOKEN_2 (Sundanese)`);
