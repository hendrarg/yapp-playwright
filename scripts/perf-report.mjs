#!/usr/bin/env node
/**
 * Run report from a k6 CSV result (`--out csv=<file>.csv.gz`): Passed/Failed per
 * TC-PERF row first (with --scenario/--profile), then per-endpoint latency.
 * k6's own summary only aggregates per threshold tag; a baseline needs p95 per `name`.
 * Browser runs (`k6/browser`) also get Web Vitals per page kind and the failed
 * browser requests grouped by path + status.
 *
 *   node scripts/perf-report.mjs perf/results/<run>.csv.gz --scenario buyer/browse --profile smoke   # prints + writes <run>-report.md
 */
import { createReadStream, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createGunzip } from 'node:zlib';
import { createInterface } from 'node:readline';

const args = process.argv.slice(2);
const file = args[0];
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? undefined : args[i + 1];
};
if (!file) {
  console.error('usage: node scripts/perf-report.mjs <k6-result.csv[.gz]> [--scenario buyer/browse --profile smoke]');
  process.exit(1);
}

/**
 * Passed / Failed per `TC-PERF-*` the run's profile proves, from the scenario's
 * `.tcs.ts` and k6's `--summary-export` JSON (a threshold value `false` = not crossed).
 * A TC with a `review` part passes k6 only on what k6 can judge; the rest is listed.
 */
async function tcResults() {
  const scenario = flag('scenario');
  const profile = flag('profile');
  const summaryFile = file.replace(/\.csv(\.gz)?$/, '.json');
  if (!scenario || !profile || !existsSync(summaryFile)) return '';
  const tcsFile = resolve(import.meta.dirname, '..', 'perf', 'scenarios', `${scenario}.tcs.ts`);
  if (!existsSync(tcsFile)) return '';
  const { TCS } = await import(pathToFileURL(tcsFile).href);
  const metrics = JSON.parse(readFileSync(summaryFile, 'utf8')).metrics ?? {};

  const rows = TCS.filter((tc) => tc.profiles.includes(profile)).map((tc) => {
    const outcomes = Object.entries(tc.thresholds).flatMap(([metric, conditions]) =>
      conditions.map((c) => {
        const crossed = metrics[metric]?.thresholds?.[c];
        return crossed === undefined ? `no data: ${metric} ${c}` : crossed ? `failed: ${metric} ${c}` : null;
      }),
    ).filter(Boolean);
    const result = outcomes.some((o) => o.startsWith('failed')) ? 'Failed' : outcomes.length ? 'No data' : 'Passed';
    const detail = [...outcomes, ...(tc.review ? [`also review: ${tc.review}`] : [])].join('; ');
    return `| ${tc.id} | ${tc.title} | ${result}${tc.review && result === 'Passed' ? ' (k6 part)' : ''} | ${detail} |`;
  });
  if (!rows.length) return `_No TC-PERF row is proved by the \`${profile}\` profile of \`${scenario}\`._`;
  return ['| TC | Title | Result | Detail |', '|---|---|---|---|', ...rows].join('\n');
}

const input = createReadStream(file);
const lines = createInterface({ input: file.endsWith('.gz') ? input.pipe(createGunzip()) : input, crlfDelay: Infinity });

const byName = new Map();
const vitals = new Map(); // page kind -> metric -> values
const browserFailures = new Map(); // "status path (type)" -> count
let cols;

/**
 * Collapse a buyer URL to the kind of page it is, so per-creator URLs aggregate. A value
 * that is not a URL is already a group name set by the scenario's `metric.tag`.
 */
function pageKind(url) {
  if (!/^https?:/.test(url)) return url;
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
      // `url` may be a `metric.tag` group; the `name` column keeps the request URL.
      const raw = [cells[cols.url], cells[cols.name]].find((v) => /^https?:/.test(v ?? ''));
      const where = raw ? `${new URL(raw).host}${new URL(raw).pathname}` : cells[cols.url];
      const type = /resource_type=([^&]+)/.exec(cells[cols.extra_tags] ?? '')?.[1] ?? '?';
      const key = `${cells[cols.status]} ${where} (${type})`;
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
const tcSection = await tcResults();
if (tcSection) sections.unshift(tcSection);
const table = sections.join('\n\n');

console.log(table);
const out = file.replace(/\.csv(\.gz)?$/, '-report.md');
writeFileSync(out, `${table}\n`);
console.log(`\nWritten: ${out}`);
