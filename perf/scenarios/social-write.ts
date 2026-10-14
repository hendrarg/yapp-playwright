import { group, sleep } from 'k6';
import type { Options } from 'k6/options';
import { env } from '../config/env.ts';
import { scenarioFor } from '../config/profiles.ts';
import { thresholds } from '../config/thresholds.ts';
import { apiGet, apiWrite, listOf } from '../lib/http.ts';

/**
 * Social writes, kept inside the three test accounts so no real creator gets a
 * notification, follower or comment:
 *
 * - `comments` (PROFILE load shape): the QA buyer reads and comments on one post that
 *   setup seeds as Sundanese; teardown deletes the post. Comments are concurrency-safe.
 * - `follow` (always 1 VU): creator `hendrarg` follows → unfollows Sundanese. One pair,
 *   so it cannot run concurrently; teardown restores the follow state found at setup.
 *   Buyer → hendrarg is deliberately untouched: E2E messaging relies on that follow for
 *   DM eligibility and broadcast audiences.
 *
 * DMs are left out on purpose: a sent message stays in the counterpart's inbox (delete is
 * `scope: 'me'` only), which would pollute the E2E messaging fixtures.
 */
export const options: Options = {
  scenarios: {
    comments: { ...scenarioFor(env.profile), exec: 'comments' },
    follow: { executor: 'constant-vus', vus: 1, duration: env.profile === 'smoke' ? '1m' : '10m', exec: 'follow' },
  },
  thresholds,
};

const buyer = { token: env.buyerToken };
const creator = { token: env.creatorToken };
const sundanese = { token: env.sundaneseToken };

interface SetupData {
  postUuid: string;
  sundaneseUuid: string;
  /** Whether hendrarg followed Sundanese before the run. */
  wasFollowing: boolean;
}

function isFollowing(targetUuid: string): boolean {
  for (let page = 1; page <= 20; page++) {
    const res = apiGet(`/api/v1/users/me/following?page=${page}&limit=50`, 'GET /users/me/following', creator);
    const body = res.json() as { data?: { data?: { uuid: string }[]; totalPages?: number } };
    if ((body.data?.data ?? []).some((u) => u.uuid === targetUuid)) return true;
    if (page >= (body.data?.totalPages ?? 1)) return false;
  }
  return false;
}

export function setup(): SetupData {
  for (const [name, value] of Object.entries({ buyer: env.buyerToken, creator: env.creatorToken, sundanese: env.sundaneseToken })) {
    if (!value) throw new Error(`social-write needs the ${name} token`);
  }
  const account = apiGet('/api/v1/accounts', 'setup: GET /accounts', sundanese).json() as { data?: { uuid?: string } };
  const sundaneseUuid = account.data?.uuid;
  if (!sundaneseUuid) throw new Error('setup could not resolve the Sundanese account uuid');

  const created = apiWrite(
    'POST',
    '/api/v1/posts',
    'setup: POST /posts',
    { content: `k6 perf fixture ${Date.now()} — deleted after the run`, status: 'active', visibility: 'public', assets: [], productUuids: [], price: 0, isFlexiblePrice: false },
    { ...sundanese, expect: [200, 201] },
  );
  const postUuid = (created.json() as { data?: { uuid?: string } })?.data?.uuid;
  if (!postUuid) throw new Error(`setup could not seed the perf post: ${created.status} ${created.body}`);

  return { postUuid, sundaneseUuid, wasFollowing: isFollowing(sundaneseUuid) };
}

export function comments(data: SetupData) {
  group('post comments', () => {
    apiGet(`/api/v1/posts/${data.postUuid}`, 'GET /posts/{uuid}', buyer);
    listOf(apiGet(`/api/v1/posts/${data.postUuid}/comments?page=1&limit=10`, 'GET /posts/{uuid}/comments', buyer));
    sleep(1 + Math.random() * 2);
    apiWrite('POST', `/api/v1/posts/${data.postUuid}/comments`, 'POST /posts/{uuid}/comments', { postUUID: data.postUuid, content: `k6 ${__VU}-${__ITER}` }, { ...buyer, expect: [200, 201] });
  });
  sleep(2 + Math.random() * 3);
}

export function follow(data: SetupData) {
  group('follow toggle', () => {
    // 409 = already following / 404 = not following — the toggle can start from either state.
    apiWrite('POST', `/api/v1/users/follow/${data.sundaneseUuid}`, 'POST /users/follow/{uuid}', undefined, { ...creator, expect: [200, 201, 409] });
    sleep(1);
    apiWrite('DELETE', `/api/v1/users/follow/${data.sundaneseUuid}`, 'DELETE /users/follow/{uuid}', undefined, { ...creator, expect: [200, 204, 404] });
  });
  sleep(2);
}

export function teardown(data: SetupData) {
  if (data.wasFollowing) {
    apiWrite('POST', `/api/v1/users/follow/${data.sundaneseUuid}`, 'teardown: POST /users/follow/{uuid}', undefined, { ...creator, expect: [200, 201, 409] });
  } else {
    apiWrite('DELETE', `/api/v1/users/follow/${data.sundaneseUuid}`, 'teardown: DELETE /users/follow/{uuid}', undefined, { ...creator, expect: [200, 204, 404] });
  }
  apiWrite('DELETE', `/api/v1/posts/${data.postUuid}`, 'teardown: DELETE /posts/{uuid}', undefined, { ...sundanese, expect: [200, 204] });
}
