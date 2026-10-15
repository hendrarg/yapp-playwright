/**
 * Shared SLOs the `.tcs.ts` files build their thresholds from. Plain data with no k6
 * import, so Node (`scripts/perf-report.mjs`) can load the TC files that use it.
 * Provisional numbers from the 2026-10-14 baseline — change them here, and in the
 * Expected Result of the matching `Performance` rows, together.
 */
export const READ_P95 = 'p(95)<800';
export const READ_P99 = 'p(99)<1500';
export const WRITE_P95 = 'p(95)<1500';

/** Whole-run API gate: errors, checks and read latency across every tagged call. */
export const API_GATE: Record<string, string[]> = {
  http_req_failed: ['rate<0.01'],
  checks: ['rate>0.99'],
  'http_req_duration{kind:read}': [READ_P95, READ_P99],
};

/** One endpoint's read latency, by its `name` tag. */
export function readSlo(name: string): Record<string, string[]> {
  return { [`http_req_duration{name:${name}}`]: [READ_P95] };
}

/** One endpoint's write latency, by its `name` tag. */
export function writeSlo(name: string): Record<string, string[]> {
  return { [`http_req_duration{name:${name}}`]: [WRITE_P95] };
}

/** Core Web Vitals "good" bands at p75, for one page group tagged in the browser scenario. */
export function vitals(page: string): Record<string, string[]> {
  return {
    [`browser_web_vital_lcp{url:${page}}`]: ['p(75)<2500'],
    [`browser_web_vital_fcp{url:${page}}`]: ['p(75)<1800'],
    [`browser_web_vital_cls{url:${page}}`]: ['p(75)<0.1'],
    [`browser_web_vital_ttfb{url:${page}}`]: ['p(75)<800'],
  };
}
