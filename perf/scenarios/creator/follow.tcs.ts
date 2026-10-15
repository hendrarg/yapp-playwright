import { writeSlo } from '../../config/thresholds.ts';
import type { PerfTc } from '../../lib/tc.ts';

/** `Performance` tab rows executed by `npm run perf -- creator/follow`. */
export const TCS: PerfTc[] = [
  {
    id: 'TC-PERF-C-008',
    title: 'Follow and unfollow latency',
    profiles: ['smoke', 'load'],
    thresholds: {
      ...writeSlo('POST /users/follow/:uuid'),
      ...writeSlo('DELETE /users/follow/:uuid'),
      // Status checks plus the teardown check that the original follow state is back.
      checks: ['rate>0.99'],
    },
  },
];
