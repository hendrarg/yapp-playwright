import { writeSlo } from '../../config/thresholds.ts';
import type { PerfTc } from '../../lib/tc.ts';

/** `Performance` tab rows executed by `npm run perf -- buyer/comments`. */
export const TCS: PerfTc[] = [
  {
    id: 'TC-PERF-B-006',
    title: 'Comment on a post latency',
    profiles: ['smoke', 'load'],
    thresholds: {
      ...writeSlo('POST /posts/:uuid/comments'),
      // Status checks plus the teardown check that the fixture post was deleted.
      checks: ['rate>0.99'],
    },
  },
];
