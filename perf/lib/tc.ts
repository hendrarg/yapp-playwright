/**
 * A `TC-PERF-*` row of the sheet's `Performance` tab, as code. A scenario's sibling
 * `<name>.tcs.ts` lists the TCs it executes; `thresholdsFor` turns the ones the current
 * profile proves into k6 thresholds, and `scripts/perf-report.mjs` reads the same file
 * to print Passed / Failed per TC. So the Expected Result in the sheet and the check in
 * code are one definition.
 *
 * Kept free of k6 imports so Node can load the `.tcs.ts` files too.
 */
export type Profile = 'smoke' | 'load' | 'stress' | 'spike' | 'soak';

export interface PerfTc {
  id: string;
  title: string;
  /** Profiles whose run proves this TC. */
  profiles: Profile[];
  /** k6 thresholds (metric expression → conditions) that decide Passed / Failed. */
  thresholds: Record<string, string[]>;
  /** Part of the Expected Result k6 cannot judge on its own — read it from the HTML report. */
  review?: string;
}

/** Applied when a profile proves none of the scenario's TCs, so every run still has a gate. */
const GUARD: Record<string, string[]> = {
  http_req_failed: ['rate<0.01'],
  checks: ['rate>0.99'],
};

export function thresholdsFor(tcs: PerfTc[], profile: string): Record<string, string[]> {
  const merged: Record<string, string[]> = {};
  for (const tc of tcs.filter((t) => (t.profiles as string[]).includes(profile))) {
    for (const [metric, conditions] of Object.entries(tc.thresholds)) {
      merged[metric] = [...new Set([...(merged[metric] ?? []), ...conditions])];
    }
  }
  return Object.keys(merged).length ? merged : GUARD;
}
