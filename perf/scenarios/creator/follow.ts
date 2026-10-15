import { check, group, sleep } from 'k6';
import type { Options } from 'k6/options';
import { env } from '../../config/env.ts';
import { thresholdsFor } from '../../lib/tc.ts';
import { TCS } from './follow.tcs.ts';
import { apiGet, apiWrite } from '../../lib/http.ts';

/**
 * Creator `hendrarg` follows → unfollows Sundanese, both test accounts, so no real
 * creator gets a follower or a notification. One account pair cannot toggle
 * concurrently, so this always runs 1 VU whatever the profile; teardown restores the
 * follow state found at setup.
 *
 * Buyer → hendrarg is deliberately untouched: E2E messaging relies on that follow for
 * DM eligibility and broadcast audiences.
 */
export const options: Options = {
  scenarios: { follow: { executor: 'constant-vus', vus: 1, duration: env.profile === 'smoke' ? '1m' : '10m' } },
  thresholds: thresholdsFor(TCS, env.profile),
};

const creator = { token: env.creatorToken };

interface SetupData {
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
  if (!env.creatorToken || !env.sundaneseToken) throw new Error('creator/follow needs the creator and Sundanese tokens');
  const account = apiGet('/api/v1/accounts', 'setup: GET /accounts', { token: env.sundaneseToken }).json() as { data?: { uuid?: string } };
  const sundaneseUuid = account.data?.uuid;
  if (!sundaneseUuid) throw new Error('setup could not resolve the Sundanese account uuid');
  return { sundaneseUuid, wasFollowing: isFollowing(sundaneseUuid) };
}

export default function (data: SetupData) {
  group('follow toggle', () => {
    // 409 = already following / 404 = not following — the toggle can start from either state.
    apiWrite('POST', `/api/v1/users/follow/${data.sundaneseUuid}`, 'POST /users/follow/:uuid', undefined, { ...creator, expect: [200, 201, 409] });
    sleep(1);
    apiWrite('DELETE', `/api/v1/users/follow/${data.sundaneseUuid}`, 'DELETE /users/follow/:uuid', undefined, { ...creator, expect: [200, 204, 404] });
  });
  sleep(2);
}

export function teardown(data: SetupData) {
  if (data.wasFollowing) {
    apiWrite('POST', `/api/v1/users/follow/${data.sundaneseUuid}`, 'teardown: POST /users/follow/:uuid', undefined, { ...creator, expect: [200, 201, 409] });
  } else {
    apiWrite('DELETE', `/api/v1/users/follow/${data.sundaneseUuid}`, 'teardown: DELETE /users/follow/:uuid', undefined, { ...creator, expect: [200, 204, 404] });
  }
  // TC-PERF-C-008: the follow state from before the run is back.
  check(isFollowing(data.sundaneseUuid), { 'follow state restored': (now) => now === data.wasFollowing });
}
