#!/usr/bin/env node
/**
 * Run a k6 scenario from perf/scenarios/<role>/ with the repo's .env.
 *
 *   npm run perf -- buyer/browse                   # smoke (default)
 *   npm run perf -- creator/dashboard --profile load --confirm
 *
 * k6 cannot read .env or refresh tokens itself, so this wrapper loads .env,
 * refuses expired tokens (refresh with `npm run token:refresh -- <slot>`), and
 * writes a JSON summary, HTML report and a Markdown report (TC results from the
 * scenario's `.tcs.ts`, plus per-endpoint latency) to perf/results/.
 * Every profile except `smoke` needs --confirm: the target API is shared.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import dotenv from 'dotenv';

const root = resolve(import.meta.dirname, '..');
dotenv.config({ path: join(root, '.env'), quiet: true });

const args = process.argv.slice(2);
const scenario = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--profile')?.replace(/\.ts$/, '');
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? undefined : args[i + 1];
};
const profile = flag('profile') ?? 'smoke';

if (!scenario) {
  console.error('usage: npm run perf -- <buyer|creator>/<scenario> [--profile smoke|load|stress|spike|soak] [--confirm]');
  process.exit(1);
}
const script = join(root, 'perf', 'scenarios', `${scenario}.ts`);
if (scenario.endsWith('.tcs') || !existsSync(script)) {
  console.error(`No scenario at perf/scenarios/${scenario}.ts (e.g. buyer/browse, creator/dashboard)`);
  process.exit(1);
}
if (profile !== 'smoke' && !args.includes('--confirm')) {
  console.error(`PROFILE=${profile} puts real load on ${process.env.YAPP_API_BASE_URL}, which E2E and manual QA share.`);
  console.error('Agree a slot with BE/DevOps, then re-run with --confirm.');
  process.exit(1);
}

const TOKENS = { YAPP_TEST_ACCESS_TOKEN: 'creator', YAPP_TEST_ACCESS_TOKEN_BUYER: 'qa', YAPP_TEST_ACCESS_TOKEN_2: 'sundanese' };
for (const [name, slot] of Object.entries(TOKENS)) {
  const raw = (process.env[name] ?? '').replace(/"/g, '');
  if (!raw) continue;
  try {
    const { exp } = JSON.parse(Buffer.from(raw.split('.')[1], 'base64url').toString());
    if (exp && exp * 1000 < Date.now()) {
      console.error(`${name} expired — run \`npm run token:refresh -- ${slot}\` first.`);
      process.exit(1);
    }
  } catch {
    // Not a decodable JWT; let the API answer 401 and fail the checks.
  }
}

function findK6() {
  const onPath = spawnSync('k6', ['version'], { stdio: 'ignore', shell: process.platform === 'win32' });
  if (onPath.status === 0) return 'k6';
  const win = 'C:\\Program Files\\k6\\k6.exe';
  if (process.platform === 'win32' && existsSync(win)) return win;
  console.error('k6 not found. Install it: `winget install k6` (Windows) or https://grafana.com/docs/k6/latest/set-up/install-k6/');
  process.exit(1);
}

const resultsDir = join(root, 'perf', 'results');
mkdirSync(resultsDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const base = join(resultsDir, `${scenario.replace(/[\\/]/g, '-')}-${profile}-${stamp}`);

/**
 * Browser scenarios (`k6/browser`) reuse Playwright's Chromium rather than needing a
 * separate Chrome install. Unset and unresolvable → k6 falls back to a system Chrome.
 */
async function browserExecutable() {
  if (process.env.K6_BROWSER_EXECUTABLE_PATH || !readFileSync(script, 'utf8').includes("'k6/browser'")) return {};
  try {
    const { applyPlaywrightBrowsersPath } = await import('../config/playwright-browsers-path.mjs');
    applyPlaywrightBrowsersPath();
    const path = createRequire(import.meta.url)('@playwright/test').chromium.executablePath();
    return existsSync(path) ? { K6_BROWSER_EXECUTABLE_PATH: path } : {};
  } catch {
    return {};
  }
}

const k6 = findK6();
const browserEnv = await browserExecutable();
const run = spawnSync(
  k6,
  ['run', '-e', `PROFILE=${profile}`, '--summary-export', `${base}.json`, '--out', `csv=${base}.csv.gz`, script],
  {
    stdio: 'inherit',
    // `k6 run` exposes the process environment as __ENV, so tokens never hit argv.
    env: { ...process.env, ...browserEnv, K6_WEB_DASHBOARD: 'true', K6_WEB_DASHBOARD_EXPORT: `${base}.html`, K6_WEB_DASHBOARD_OPEN: 'false' },
  },
);
// TC results + per-endpoint table — k6's own summary only aggregates per threshold.
spawnSync(process.execPath, [join(root, 'scripts', 'perf-report.mjs'), `${base}.csv.gz`, '--scenario', scenario, '--profile', profile], { stdio: 'inherit' });
console.log(`\nReports: ${base}.json, ${base}.html, ${base}-report.md`);
process.exit(run.status ?? 1);
