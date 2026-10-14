import type { Options } from 'k6/options';

/**
 * Provisional SLOs, keyed by the `kind` tag every request in `lib/http.ts` carries.
 * Lock the real numbers after the phase-2 baseline; a smoke run that breaks these
 * already means something regressed.
 */
export const thresholds: Options['thresholds'] = {
  http_req_failed: ['rate<0.01'],
  checks: ['rate>0.99'],
  'http_req_duration{kind:read}': ['p(95)<800', 'p(99)<1500'],
  'http_req_duration{kind:write}': ['p(95)<1500', 'p(99)<3000'],
};
