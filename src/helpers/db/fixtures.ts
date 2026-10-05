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
  // Creator discovery flags: hidden from Explore (the NSFW treatment) and the Official (verified) badge.
  users: ['is_hide_from_explore', 'is_verified_creator', 'name', 'username', 'username_changed_at', 'photo_profile_path'],
  // A pending lifetime order the test created, pushed to the state a failed/expired payment leaves.
  post_lifetime_purchases: ['status', 'expired_at'],
} as const satisfies Record<string, readonly string[]>;

/** Tables whose test-created rows may be soft-deleted for good (`deleted_at = now()`), never restored. */
export const RETIRABLE = ['post_lifetime_purchases'] as const;
export type RetirableTable = (typeof RETIRABLE)[number];

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

  /**
   * Soft-delete one row this test created and nothing should keep, e.g. a purchase with no refund API.
   * It is not snapshotted: `restoreAll()` leaves it deleted.
   */
  async retire(table: RetirableTable, uuid: string): Promise<void> {
    if (!(RETIRABLE as readonly string[]).includes(table)) throw new Error(`Table ${table} is not retirable by DB fixtures`);
    const updated = await this.exec(`UPDATE ${table} SET deleted_at = now() WHERE uuid = $1 AND deleted_at IS NULL RETURNING uuid`, [uuid]);
    if (updated.length !== 1) throw new Error(`${table} ${uuid}: expected to retire one row, retired ${updated.length}`);
  }

  /** Revoke the buyer's lifetime unlock of this creator's exclusive posts, bought during the test. */
  async retireLifetimePurchases(buyerUuid: string, creatorUuid: string): Promise<number> {
    const rows = await this.exec(
      `SELECT p.uuid FROM post_lifetime_purchases p
         JOIN users b ON b.id = p.buyer_id JOIN users c ON c.id = p.creator_id
        WHERE b.uuid = $1 AND c.uuid = $2 AND p.deleted_at IS NULL`,
      [buyerUuid, creatorUuid],
    );
    for (const row of rows) await this.retire('post_lifetime_purchases', String(row.uuid));
    return rows.length;
  }

  /** Turn the test's pending lifetime order into a failed one: status `expired`, payment window closed. */
  async failLifetimePayment(orderUuid: string): Promise<void> {
    await this.set('post_lifetime_purchases', orderUuid, { status: 'expired', expired_at: new Date(Date.now() - 60_000) });
  }

  /**
   * Let a test edit the account's identity through the UI and get it back afterwards: snapshots
   * name, username, photo and the username cooldown (a photo upload also blanks the name — bug), and clears the cooldown (a change otherwise blocks the
   * next one for 24 h). `restoreAll()` writes the original username and photo straight back.
   */
  async protectProfile(userUuid: string): Promise<void> {
    const [row] = await this.exec('SELECT name, username, photo_profile_path FROM users WHERE uuid = $1', [userUuid]);
    if (!row) throw new Error(`users ${userUuid}: not found`);
    await this.set('users', userUuid, { name: row.name, username: row.username, photo_profile_path: row.photo_profile_path, username_changed_at: null });
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
