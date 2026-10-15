import { vitals } from '../../config/thresholds.ts';
import type { PerfTc } from '../../lib/tc.ts';

/**
 * `Performance` tab rows executed by `npm run perf -- buyer/vitals`. The page groups
 * (`landing`, `explore`, …) are the `url` tags `vitals.ts` assigns with `metric.tag`.
 */
export const TCS: PerfTc[] = [
  { id: 'TC-PERF-B-007', title: 'Landing page Core Web Vitals', profiles: ['smoke', 'load'], thresholds: vitals('landing') },
  { id: 'TC-PERF-B-008', title: 'Explore page Core Web Vitals', profiles: ['smoke', 'load'], thresholds: vitals('explore') },
  { id: 'TC-PERF-B-009', title: 'Creator profile page Core Web Vitals', profiles: ['smoke', 'load'], thresholds: vitals('creator-profile') },
  { id: 'TC-PERF-B-010', title: 'Product page Core Web Vitals, opened from its share link', profiles: ['smoke', 'load'], thresholds: vitals('product') },
  {
    id: 'TC-PERF-B-011',
    title: 'Public pages load their images without errors',
    profiles: ['smoke', 'load'],
    thresholds: { 'browser_http_req_failed{url:next-image}': ['rate==0'] },
  },
];
