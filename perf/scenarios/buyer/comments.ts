import { check, group, sleep } from 'k6';
import type { Options } from 'k6/options';
import { env } from '../../config/env.ts';
import { scenarioFor } from '../../config/profiles.ts';
import { thresholdsFor } from '../../lib/tc.ts';
import { TCS } from './comments.tcs.ts';
import { apiGet, apiWrite, listOf } from '../../lib/http.ts';

/**
 * The QA buyer reads and comments on one post that setup seeds as Sundanese (a test
 * account), so no real creator gets a comment; teardown deletes the post. Comments are
 * concurrency-safe, so this follows the PROFILE load shape.
 *
 * DMs are left out on purpose: a sent message stays in the counterpart's inbox (delete is
 * `scope: 'me'` only), which would pollute the E2E messaging fixtures.
 */
export const options: Options = {
  scenarios: { comments: scenarioFor(env.profile) },
  thresholds: thresholdsFor(TCS, env.profile),
};

const buyer = { token: env.buyerToken };
const sundanese = { token: env.sundaneseToken };

interface SetupData {
  postUuid: string;
}

export function setup(): SetupData {
  if (!env.buyerToken || !env.sundaneseToken) throw new Error('buyer/comments needs the buyer and Sundanese tokens');
  const created = apiWrite(
    'POST',
    '/api/v1/posts',
    'setup: POST /posts',
    { content: `k6 perf fixture ${Date.now()} — deleted after the run`, status: 'active', visibility: 'public', assets: [], productUuids: [], price: 0, isFlexiblePrice: false },
    { ...sundanese, expect: [200, 201] },
  );
  const postUuid = (created.json() as { data?: { uuid?: string } })?.data?.uuid;
  if (!postUuid) throw new Error(`setup could not seed the perf post: ${created.status} ${created.body}`);
  return { postUuid };
}

export default function (data: SetupData) {
  group('post comments', () => {
    apiGet(`/api/v1/posts/${data.postUuid}`, 'GET /posts/:uuid', buyer);
    listOf(apiGet(`/api/v1/posts/${data.postUuid}/comments?page=1&limit=10`, 'GET /posts/:uuid/comments', buyer));
    sleep(1 + Math.random() * 2);
    apiWrite('POST', `/api/v1/posts/${data.postUuid}/comments`, 'POST /posts/:uuid/comments', { postUUID: data.postUuid, content: `k6 ${__VU}-${__ITER}` }, { ...buyer, expect: [200, 201] });
  });
  sleep(2 + Math.random() * 3);
}

export function teardown(data: SetupData) {
  const res = apiWrite('DELETE', `/api/v1/posts/${data.postUuid}`, 'teardown: DELETE /posts/:uuid', undefined, { ...sundanese, expect: [200, 204] });
  // TC-PERF-B-006: the fixture post created for the run is gone.
  check(res, { 'fixture post deleted': (r) => r.status === 200 || r.status === 204 });
}
