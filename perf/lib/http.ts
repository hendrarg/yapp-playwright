import http from 'k6/http';
import type { RefinedResponse, ResponseType } from 'k6/http';
import { check } from 'k6';
import { env } from '../config/env.ts';

// Yapp's API sits behind a WAF that rejects requests without browser-like
// Origin/Referer/User-Agent headers (403) — same rule as src/helpers/api/headers.ts.
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36';

export interface RequestOptions {
  token?: string;
  origin?: string;
}

export function apiUrl(path: string): string {
  return `${env.apiBaseURL}${path}`;
}

export function headers({ token, origin = env.buyerOrigin }: RequestOptions = {}): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Origin: origin,
    Referer: `${origin}/`,
    'User-Agent': USER_AGENT,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * GET an API path. `name` is the metric tag: give templated URLs one stable name
 * (`GET /products/{uuid}`) or every UUID becomes its own time series.
 */
export function apiGet(path: string, name: string, opts: RequestOptions = {}): RefinedResponse<ResponseType> {
  const res = http.get(apiUrl(path), { headers: headers(opts), tags: { name, kind: 'read' } });
  check(res, { [`${name} is 2xx`]: (r) => r.status >= 200 && r.status < 300 });
  return res;
}

/** POST/DELETE an API path, tagged `kind:write`. `expect` lists the statuses that count as success. */
export function apiWrite(
  method: 'POST' | 'DELETE',
  path: string,
  name: string,
  body: unknown,
  opts: RequestOptions & { expect?: number[] } = {},
): RefinedResponse<ResponseType> {
  const expected = opts.expect ?? [200, 201, 204];
  const res = http.request(method, apiUrl(path), body === undefined ? null : JSON.stringify(body), {
    headers: headers(opts),
    tags: { name, kind: 'write' },
    responseCallback: http.expectedStatuses(...expected),
  });
  check(res, { [`${name} is ${expected.join('/')}`]: (r) => expected.includes(r.status) });
  return res;
}

/**
 * `[path, metric name, known500?]` — one API call of a page load. `known500` is the
 * body `message` of a 500 the app is known to send for a normal empty state (and
 * handles on screen); that one response counts as success, any other 500 still fails.
 */
export type Call = [path: string, name: string, known500?: string];

const ok2xx = http.expectedStatuses({ min: 200, max: 299 });
const ok2xxOr500 = http.expectedStatuses({ min: 200, max: 299 }, 500);

function passes(res: RefinedResponse<ResponseType>, known500?: string): boolean {
  if (res.status >= 200 && res.status < 300) return true;
  if (!known500 || res.status !== 500) return false;
  try {
    return (res.json() as { message?: string })?.message === known500;
  } catch {
    return false;
  }
}

/**
 * Fire a page's API calls in parallel, the way the browser does on navigation.
 * Responses come back in `calls` order.
 */
export function apiBatch(calls: Call[], opts: RequestOptions = {}): RefinedResponse<ResponseType>[] {
  const h = headers(opts);
  const responses = http.batch(
    calls.map(([path, name, known500]) => ({
      method: 'GET',
      url: apiUrl(path),
      params: { headers: h, tags: { name, kind: 'read' }, responseCallback: known500 ? ok2xxOr500 : ok2xx },
    })),
  );
  responses.forEach((res, i) => {
    const [, name, known500] = calls[i];
    check(res, { [`${name} is 2xx${known500 ? ' or known 500' : ''}`]: (r) => passes(r, known500) });
  });
  return responses;
}

/** `YYYY-MM-DD`, `daysAgo` days before today — the date-range params the dashboards send. */
export function isoDate(daysAgo = 0): string {
  return new Date(Date.now() - daysAgo * 86_400_000).toISOString().slice(0, 10);
}

/** `data.data` of Yapp's paginated envelope, or `[]` when the body is not one. */
export function listOf<T>(res: RefinedResponse<ResponseType>): T[] {
  try {
    return ((res.json() as { data?: { data?: T[] } })?.data?.data ?? []) as T[];
  } catch {
    return [];
  }
}
