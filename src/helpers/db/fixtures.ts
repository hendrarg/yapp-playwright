/**
 * Guarded write access to the dev database for test fixtures — state the UI cannot reach in a
 * reasonable time (an expired membership, a renewal window, a reset withdrawal) is built here
 * instead of excluding the test case. See `.agents/rules/testing.md` → Automation strategy.
 *
 * Guard rails, all enforced in code:
 * - off unless `YAPP_DB_FIXTURES=1`, and refused when the database host or name looks like production;
 * - only the tables and columns listed in `WRITABLE` can change;
 * - one row at a time, addressed by `uuid`; anything but exactly one updated row throws;
 * - every change is snapshotted and `restoreAll()` puts the old values back in reverse order —
 *   the `dbFixtures` Playwright fixture calls it in teardown, even when the test fails.
 *
 * Add a table/column to `WRITABLE` only when a mapped TC needs it, after checking the column in
 * the schema (`npm run db:shell -- "SELECT column_name FROM information_schema.columns WHERE table_name='…'"`).
 */
import { query } from './client';

export const WRITABLE = {
  tier_membership_users: ['expired_at', 'deleted_at'],
} as const satisfies Record<string, readonly string[]>;

export type WritableTable = keyof typeof WRITABLE;
export type WritableColumn<T extends WritableTable> = (typeof WRITABLE)[T][number];
type Row = Record<string, unknown>;
export type Executor = (sql: string, params: unknown[]) => Promise<Row[]>;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Throws unless DB fixtures are explicitly enabled against a non-production database. */
export function assertDbFixturesAllowed(env: NodeJS.ProcessEnv = process.env): void {
  if (env.YAPP_DB_FIXTURES !== '1') {
    throw new Error('DB fixtures are disabled. Set YAPP_DB_FIXTURES=1 (dev database only) to let tests change rows.');
  }
  const target = `${env.PSQL_DB_HOST ?? ''} ${env.PSQL_DB_NAME ?? ''}`;
  if (/prod/i.test(target)) throw new Error(`DB fixtures refuse to write to what looks like production: ${target.trim()}`);
}

export class DbFixtures {
  private readonly undo: Array<{ table: WritableTable; uuid: string; values: Row }> = [];

  constructor(
    private readonly exec: Executor = (sql, params) => query(sql, params),
    env: NodeJS.ProcessEnv = process.env,
  ) {
    assertDbFixturesAllowed(env);
  }

  /** Set whitelisted columns on the one row with this uuid; the previous values are restored later. */
  async set<T extends WritableTable>(table: T, uuid: string, values: Partial<Record<WritableColumn<T>, unknown>>): Promise<void> {
    const allowed: readonly string[] = WRITABLE[table];
    if (!allowed) throw new Error(`Table ${table} is not writable by DB fixtures`);
    const columns = Object.keys(values);
    if (!columns.length) throw new Error('DbFixtures.set needs at least one column');
    const denied = columns.filter((c) => !allowed.includes(c));
    if (denied.length) throw new Error(`Columns not writable on ${table}: ${denied.join(', ')}`);

    const before = await this.exec(`SELECT ${columns.join(', ')} FROM ${table} WHERE uuid = $1`, [uuid]);
    if (before.length !== 1) throw new Error(`${table} ${uuid}: expected exactly one row, found ${before.length}`);
    await this.update(table, uuid, values as Row);
    this.undo.push({ table, uuid, values: before[0] });
  }

  /** Make a tier membership subscription expired `daysAgo` days ago (default 1). */
  async expireMembership(subscriptionUuid: string, daysAgo = 1): Promise<void> {
    await this.set('tier_membership_users', subscriptionUuid, { expired_at: new Date(Date.now() - daysAgo * DAY_MS) });
  }

  /** Move a tier membership subscription's expiry to `daysFromNow` days ahead (e.g. 7 for an H-7 window). */
  async setMembershipExpiryIn(subscriptionUuid: string, daysFromNow: number): Promise<void> {
    await this.set('tier_membership_users', subscriptionUuid, { expired_at: new Date(Date.now() + daysFromNow * DAY_MS) });
  }

  /** Put every changed row back, newest change first. Collects failures and throws once at the end. */
  async restoreAll(): Promise<void> {
    const errors: string[] = [];
    while (this.undo.length) {
      const { table, uuid, values } = this.undo.pop()!;
      try {
        await this.update(table, uuid, values);
      } catch (e) {
        errors.push(`${table} ${uuid}: ${(e as Error).message}`);
      }
    }
    if (errors.length) throw new Error(`DB fixture restore failed — fix these rows by hand:\n${errors.join('\n')}`);
  }

  private async update(table: WritableTable, uuid: string, values: Row): Promise<void> {
    const columns = Object.keys(values);
    const assignments = columns.map((c, i) => `${c} = $${i + 2}`).join(', ');
    const updated = await this.exec(`UPDATE ${table} SET ${assignments} WHERE uuid = $1 RETURNING uuid`, [uuid, ...columns.map((c) => values[c])]);
    if (updated.length !== 1) throw new Error(`${table} ${uuid}: expected to update one row, updated ${updated.length}`);
  }
}
