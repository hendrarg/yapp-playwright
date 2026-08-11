/**
 * PostgreSQL database client for Yapp staging/dev database.
 *
 * Credentials are read from .env (not committed):
 *   PSQL_DB_HOST, PSQL_DB_PORT, PSQL_DB_NAME, PSQL_DB_USER,
 *   PSQL_DB_PASSWORD, PSQL_DB_SSL_MODE
 */
import { Pool, QueryResultRow } from 'pg';

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.PSQL_DB_HOST ?? 'yapp-dev.c3owa284mp95.ap-southeast-1.rds.amazonaws.com',
      port: Number(process.env.PSQL_DB_PORT ?? 5432),
      database: process.env.PSQL_DB_NAME ?? 'yapp_dev',
      user: process.env.PSQL_DB_USER ?? 'postgres',
      password: process.env.PSQL_DB_PASSWORD ?? '7ATkdiBujN67qtwjOBP7',
      max: Number(process.env.PSQL_MAX_OPEN_CONNS ?? 10),
      idleTimeoutMillis: 20_000, // 20m in ms
      ssl: {
        rejectUnauthorized: false, // RDS SSL requires this
      },
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
