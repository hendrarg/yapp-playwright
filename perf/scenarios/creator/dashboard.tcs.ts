import { API_GATE, READ_P95, readSlo } from '../../config/thresholds.ts';
import type { PerfTc } from '../../lib/tc.ts';

/** `Performance` tab rows executed by `npm run perf -- creator/dashboard`. */
export const TCS: PerfTc[] = [
  { id: 'TC-PERF-C-001', title: 'Creator dashboard API smoke at 1 virtual user', profiles: ['smoke'], thresholds: API_GATE },
  { id: 'TC-PERF-C-002', title: 'Creator dashboard baseline load at 10 virtual users', profiles: ['load'], thresholds: API_GATE },
  { id: 'TC-PERF-C-003', title: 'Product list stays within the read SLO at 10 virtual users', profiles: ['load'], thresholds: readSlo('GET /shop/products') },
  { id: 'TC-PERF-C-004', title: 'Membership tier list stays within the read SLO at 10 virtual users', profiles: ['load'], thresholds: readSlo('GET /tier-memberships') },
  { id: 'TC-PERF-C-005', title: 'Product analytics stays within the read SLO at 10 virtual users', profiles: ['load'], thresholds: readSlo('GET /creator/analytics/products') },
  { id: 'TC-PERF-C-006', title: 'DM conversation list, loaded on every creator page, stays within the read SLO', profiles: ['load'], thresholds: readSlo('GET /dm/conversations') },
  {
    id: 'TC-PERF-C-007',
    title: 'Feeds page comment calls (one per post) stay within the read SLO',
    profiles: ['load'],
    thresholds: {
      'http_req_duration{name:GET /posts/:uuid/comments}': [READ_P95],
      'http_req_failed{name:GET /posts/:uuid/comments}': ['rate==0'],
    },
  },
  {
    id: 'TC-PERF-C-009',
    title: 'Creator dashboard holds steady for one hour at 10 virtual users',
    profiles: ['soak'],
    thresholds: { http_req_failed: ['rate<0.01'] },
    review: 'p95 of the last 10 minutes at most 20% above the first 10 minutes (HTML report, response time over time)',
  },
];
