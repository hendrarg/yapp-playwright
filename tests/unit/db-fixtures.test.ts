import { test, expect } from '../test-base';
import { DbFixtures, assertDbFixturesAllowed, type Executor } from '@helpers/db/fixtures';

/**
 * DB fixtures write to a shared dev database with a superuser connection, so the guard rails
 * are the safety net. These cases pin them without touching the database: an in-memory table
 * stands in for `tier_membership_users`.
 */
const ENABLED = { YAPP_DB_FIXTURES: '1', PSQL_DB_HOST: 'dev-db.internal', PSQL_DB_NAME: 'yapp_dev' } as NodeJS.ProcessEnv;
const UUID = '11111111-1111-1111-1111-111111111111';

function memoryTable(initial: Record<string, unknown>) {
  const row: Record<string, unknown> = { uuid: UUID, ...initial };
  const exec: Executor = async (sql, params) => {
    if (params[0] !== UUID) return [];
    if (sql.startsWith('SELECT')) {
      const cols = /SELECT (.+) FROM/.exec(sql)![1].split(', ');
      return [Object.fromEntries(cols.map((c) => [c, row[c]]))];
    }
    const cols = [...sql.matchAll(/(\w+) = \$(\d+)/g)].filter(([, c]) => c !== 'uuid');
    for (const [, c, i] of cols) row[c] = params[Number(i) - 1];
    return [{ uuid: UUID }];
  };
  return { row, exec };
}

test('DB fixtures stay off unless enabled, and refuse production', { tag: ['@test-data', '@smoke'] }, () => {
  expect(() => assertDbFixturesAllowed({} as NodeJS.ProcessEnv)).toThrow(/YAPP_DB_FIXTURES=1/);
  expect(() => assertDbFixturesAllowed({ ...ENABLED, PSQL_DB_NAME: 'yapp_prod' })).toThrow(/production/);
  expect(() => assertDbFixturesAllowed(ENABLED)).not.toThrow();
});

test('DB fixtures only write whitelisted columns of one row', { tag: ['@test-data', '@smoke'] }, async () => {
  const { exec } = memoryTable({ expired_at: null });
  const db = new DbFixtures(exec, ENABLED);
  // @ts-expect-error user_id is deliberately not writable
  await expect(db.set('tier_membership_users', UUID, { user_id: 1 })).rejects.toThrow(/not writable/);
  await expect(db.expireMembership('22222222-2222-2222-2222-222222222222')).rejects.toThrow(/exactly one row/);
});

test('DB fixtures restore the previous values', { tag: ['@test-data', '@smoke'] }, async () => {
  const original = new Date('2026-12-31T00:00:00Z');
  const { row, exec } = memoryTable({ expired_at: original });
  const db = new DbFixtures(exec, ENABLED);

  await db.expireMembership(UUID, 2);
  expect((row.expired_at as Date).getTime()).toBeLessThan(Date.now());
  await db.setMembershipExpiryIn(UUID, 7);
  expect((row.expired_at as Date).getTime()).toBeGreaterThan(Date.now());

  await db.restoreAll();
  expect(row.expired_at).toBe(original);
});
