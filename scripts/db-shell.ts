/**
 * Interactive-ish database shell for exploring the Yapp staging DB.
 *
 * Usage: npx tsx scripts/db-shell.ts "<SQL>"
 *    or: npx tsx scripts/db-shell.ts --interactive
 *
 * Examples:
 *   npx tsx scripts/db-shell.ts "SELECT table_name FROM information_schema.tables WHERE table_schema='public'"
 *   npx tsx scripts/db-shell.ts "SELECT * FROM users LIMIT 5"
 */
import 'dotenv/config';
import { query, closePool } from '../src/helpers/db/client';

async function main() {
  const sql = process.argv.slice(2).join(' ');

  if (!sql || sql === '--interactive') {
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║  Yapp DB Shell — PostgreSQL (staging/dev)    ║');
    console.log('╠══════════════════════════════════════════════╣');
    console.log(`║  Host: ${process.env.PSQL_DB_HOST ?? 'yapp-dev.c3owa284mp95.ap-southeast-1.rds.amazonaws.com'}`);
    console.log(`║  DB:   ${process.env.PSQL_DB_NAME ?? 'yapp_dev'}`);
    console.log('╠══════════════════════════════════════════════╣');
    console.log('║  Usage:                                      ║');
    console.log('║    npx tsx scripts/db-shell.ts "<SQL>"       ║');
    console.log('║                                              ║');
    console.log('║  Quick-start queries:                        ║');
    console.log('║    # List all tables                         ║');
    console.log('║    SELECT table_name FROM information_schema.tables WHERE table_schema=\'public\' ORDER BY table_name');
    console.log('╚══════════════════════════════════════════════╝');
    await closePool();
    return;
  }

  try {
    console.log(`Running: ${sql.substring(0, 120)}${sql.length > 120 ? '...' : ''}\n`);
    const rows = await query(sql);

    if (rows.length === 0) {
      console.log('(no rows)');
    } else {
      // Pretty-print as table
      const keys = Object.keys(rows[0]);
      const widths = keys.map((k) =>
        Math.max(k.length, ...rows.map((r: Record<string, unknown>) => String(r[k] ?? 'NULL').length)),
      );

      // Header
      const header = keys.map((k, i) => k.padEnd(widths[i])).join(' | ');
      console.log(header);
      console.log('-'.repeat(header.length));

      // Rows
      for (const row of rows) {
        const line = keys
          .map((k, i) => {
            const val = row[k];
            const s = val === null ? 'NULL' : String(val);
            return s.padEnd(widths[i]);
          })
          .join(' | ');
        console.log(line);
      }

      console.log(`\n${rows.length} row(s)`);
    }
  } catch (err: any) {
    console.error('Query error:', err.message);
    if (err.message.includes('ECONNREFUSED') || err.message.includes('ENOTFOUND')) {
      console.error('Hint: Are you on the right network/VPN?');
    }
  } finally {
    await closePool();
  }
}

main();
