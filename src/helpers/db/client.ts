/**
 * PostgreSQL database client for the Yapp staging/dev database.
 *
 * Every connection value is required from .env (never committed, no source defaults):
 *   PSQL_DB_HOST, PSQL_DB_NAME, PSQL_DB_USER, PSQL_DB_PASSWORD
 * Optional: PSQL_DB_PORT (5432), PSQL_MAX_OPEN_CONNS (10), PSQL_DB_SSL_MODE (require).
 */
import { Pool, QueryResultRow } from 'pg';
import { dbConfig } from '@config/env';

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      ...dbConfig(),
      idleTimeoutMillis: 20_000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected pool error:', err.message);
    });
  }
  return pool;
}

/** Run a query and return rows. */
export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params?: unknown[],
): Promise<T[]> {
  const client = await getPool().connect();
  try {
    const result = await client.query<T>(sql, params);
    return result.rows;
  } finally {
    client.release();
  }
}

/** Run a query and return the first row (or null). */
export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params?: unknown[],
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

/** Get a dedicated client for transactions. */
export async function getClient() {
  return getPool().connect();
}

/** Close the pool (call on process exit). */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
