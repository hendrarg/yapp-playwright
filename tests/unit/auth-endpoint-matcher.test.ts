import { test, expect } from '../test-base';
import { isAccountEndpoint } from '@helpers/auth/validate-token';

/**
 * The `page` fixture of both authTest and creatorAuthTest asserts that the account
 * endpoint returned 200, so this matcher gates every authenticated test in the suite.
 *
 * A substring match on '/api/v1/accounts' also caught `/api/v1/accounts/domain`, which
 * the creator dashboard requests and which legitimately 404s when the creator has no
 * custom domain. That reported a valid token as "Auth token invalid" and killed whole
 * specs seconds after they started. These cases pin the boundary so it cannot regress.
 */
test(
  'account endpoint matcher accepts only the exact accounts path',
  { tag: ['@auth', '@test-data', '@smoke'] },
  () => {
    for (const url of [
      'https://staging.yapp.ink/api/v1/accounts',
      'https://staging.yapp.ink/api/v1/accounts/',
      'https://staging.yapp.ink/api/v1/accounts?include=profile',
    ]) {
      expect(isAccountEndpoint(url), url).toBe(true);
    }

    for (const url of [
      'https://staging.yapp.ink/api/v1/accounts/domain',
      'https://staging.yapp.ink/api/v1/accounts/domain?x=1',
      'https://staging.yapp.ink/api/v1/accounts/me',
      'https://staging.yapp.ink/api/v2/accounts',
      'https://staging.yapp.ink/api/v1/accounts-legacy',
      'not-a-url',
    ]) {
      expect(isAccountEndpoint(url), url).toBe(false);
    }
  },
);
