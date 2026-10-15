import { API_GATE, readSlo } from '../../config/thresholds.ts';
import type { PerfTc } from '../../lib/tc.ts';

/** `Performance` tab rows executed by `npm run perf -- buyer/browse`. */
export const TCS: PerfTc[] = [
  { id: 'TC-PERF-B-001', title: 'Buyer browse API smoke at 1 virtual user', profiles: ['smoke'], thresholds: API_GATE },
  { id: 'TC-PERF-B-002', title: 'Buyer browse baseline load at 10 virtual users', profiles: ['load'], thresholds: API_GATE },
  { id: 'TC-PERF-B-003', title: 'Explore feed stays within the read SLO at 10 virtual users', profiles: ['load'], thresholds: readSlo('GET /posts/explore') },
  {
    id: 'TC-PERF-B-012',
    title: 'Buyer browse under rising load up to 100 virtual users',
    profiles: ['stress'],
    thresholds: {},
    review: 'Error rate < 1% and p95 < 800 ms up to at least 50 VUs, and latency back to baseline after ramp-down (HTML report, per-stage charts)',
  },
  {
    id: 'TC-PERF-B-013',
    title: 'Buyer browse recovers from a sudden traffic spike',
    profiles: ['spike'],
    thresholds: { http_req_failed: ['rate<0.05'] },
    review: 'p95 back under 800 ms within 1 minute after the spike (HTML report, response time over time)',
  },
];
