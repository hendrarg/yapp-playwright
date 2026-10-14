#!/usr/bin/env node
/**
 * Per-endpoint latency table from a k6 CSV result (`--out csv=<file>.csv.gz`).
 * k6's own summary only aggregates per threshold tag; a baseline needs p95 per `name`.
 * Browser runs (`k6/browser`) also get Web Vitals per page kind and the failed
 * browser requests grouped by path + status.
 *
 *   node scripts/perf-report.mjs perf/results/<run>.csv.gz   # prints + writes <run>-endpoints.md
 */
import { createReadStream, writeFileSync } from 'node:fs';
import { createGunzip } from 'node:zlib';
import { createInterface } from 'node:readline';

const file = process.argv[2];
if (!file) {
  console.error('usage: node scripts/perf-report.mjs <k6-result.csv[.gz]>');
  process.exit(1);
}

const input = createReadStream(file);
const lines = createInterface({ input: file.endsWith('.gz') ? input.pipe(createGunzip()) : input, crlfDelay: Infinity });

const byName = new Map();
const vitals = new Map(); // page kind -> metric -> values
const browserFailures = new Map(); // "status path (type)" -> count
let cols;

/** Collapse a buyer URL to the kind of page it is, so per-creator URLs aggregate. */
function pageKind(url) {
  const path = new URL(url).pathname;
  if (path === '/') return 'landing';
  if (path.startsWith('/explore')) return 'explore';
  if (path.includes('/product/') || path.startsWith('/s/')) return 'product';
  return 'creator profile';
}
for await (const line of lines) {
  const cells = line.split(',');
  if (!cols) {
    cols = Object.fromEntries(cells.map((c, i) => [c, i]));
    continue;
  }
  const metric = cells[cols.metric_name];
  if (metric.startsWith('browser_web_vital_')) {
    const kind = pageKind(cells[cols.url]);
    const perKind = vitals.get(kind) ?? new Map();
    const short = metric.replace('browser_web_vital_', '').toUpperCase();
    perKind.set(short, [...(perKind.get(short) ?? []), Number(cells[cols.metric_value])]);
    vitals.set(kind, perKind);
    continue;
  }
  if (metric === 'browser_http_req_failed') {
    if (Number(cells[cols.metric_value]) === 1) {
      const u = new URL(cells[cols.url]);
      const type = /resource_type=([^&]+)/.exec(cells[cols.extra_tags] ?? '')?.[1] ?? '?';
      const key = `${cells[cols.status]} ${u.host}${u.pathname} (${type})`;
      browserFailures.set(key, (browserFailures.get(key) ?? 0) + 1);
    }
    continue;
  }
  if (metric !== 'http_req_duration' && metric !== 'http_req_failed') continue;
  const name = cells[cols.name];
  if (!name || /^(setup|teardown):/.test(name)) continue;
  const entry = byName.get(name) ?? { durations: [], failed: 0, total: 0 };
  if (metric === 'http_req_duration') entry.durations.push(Number(cells[cols.metric_value]));
  else {
    entry.total += 1;
    entry.failed += Number(cells[cols.metric_value]);
  }
  byName.set(name, entry);
}

const pct = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)] ?? 0;
const rows = [...byName]
  .map(([name, e]) => {
    const d = e.durations.sort((a, b) => a - b);
    return { name, n: d.length, med: pct(d, 50), p95: pct(d, 95), p99: pct(d, 99), max: d.at(-1) ?? 0, fail: e.total ? (e.failed / e.total) * 100 : 0 };
  })
  .sort((a, b) => b.p95 - a.p95);

const ms = (v) => `${Math.round(v)}`;
const sections = [];
if (rows.length) {
  sections.push([
    '| Endpoint | n | med ms | p95 ms | p99 ms | max ms | fail % |',
    '|---|---:|---:|---:|---:|---:|---:|',
    ...rows.map((r) => `| ${r.name} | ${r.n} | ${ms(r.med)} | ${ms(r.p95)} | ${ms(r.p99)} | ${ms(r.max)} | ${r.fail.toFixed(2)} |`),
  ].join('\n'));
}
if (vitals.size) {
  const metrics = ['TTFB', 'FCP', 'LCP', 'CLS', 'INP'].filter((m) => [...vitals.values()].some((v) => v.has(m)));
  const fmt = (m, v) => (v === undefined ? '—' : m === 'CLS' ? v.toFixed(3) : ms(v));
  sections.push([
    `| Page (p75) | ${metrics.join(' | ')} |`,
    `|---|${metrics.map(() => '---:').join('|')}|`,
    ...[...vitals].map(([kind, perKind]) => {
      const cells = metrics.map((m) => {
        const v = perKind.get(m)?.sort((a, b) => a - b);
        return fmt(m, v ? pct(v, 75) : undefined);
      });
      return `| ${kind} | ${cells.join(' | ')} |`;
    }),
  ].join('\n'));
}
if (browserFailures.size) {
  sections.push([
    '| Failed browser request (status path type) | count |',
    '|---|---:|',
    ...[...browserFailures].sort((a, b) => b[1] - a[1]).map(([key, n]) => `| ${key} | ${n} |`),
  ].join('\n'));
}
const table = sections.join('\n\n');

console.log(table);
const out = file.replace(/\.csv(\.gz)?$/, '-endpoints.md');
writeFileSync(out, `${table}\n`);
console.log(`\nWritten: ${out}`);
