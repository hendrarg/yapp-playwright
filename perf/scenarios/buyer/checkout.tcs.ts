import { writeSlo } from '../../config/thresholds.ts';
import type { PerfTc } from '../../lib/tc.ts';

/** `Performance` tab rows executed by `npm run perf -- buyer/checkout`. */
export const TCS: PerfTc[] = [
  {
    id: 'TC-PERF-B-004',
    title: 'Checkout price estimation latency',
    profiles: ['smoke', 'load'],
    // No order can be created: the scenario never calls POST /orders/quote.
    thresholds: {
      ...writeSlo('POST /orders/quote/estimation'),
      'http_req_failed{name:POST /orders/quote/estimation}': ['rate<0.01'],
    },
  },
  {
    id: 'TC-PERF-B-005',
    title: 'Add to cart and remove latency',
    profiles: ['smoke', 'load'],
    thresholds: {
      ...writeSlo('POST /cart/items'),
      ...writeSlo('DELETE /cart/items/:uuid'),
      // Status checks plus the teardown check that the cart matches its pre-run state.
      checks: ['rate>0.99'],
    },
  },
];
