/**
 * k6 runs on its own Go runtime, not Node — `config/env.ts`, `dotenv` and the
 * Playwright helpers cannot be imported here. `scripts/perf-run.mjs` loads `.env`
 * and passes the values through `-e`, which k6 exposes as `__ENV`.
 */
function required(name: string): string {
  const value = __ENV[name];
  if (!value) throw new Error(`${name} must be set (run through \`npm run perf -- ...\`, which loads .env)`);
  return value;
}

function trimSlash(url: string): string {
  return url.replace(/\/$/, '');
}

function token(name: string): string {
  return (__ENV[name] ?? '').replace(/"/g, '');
}

export const env = {
  apiBaseURL: trimSlash(required('YAPP_API_BASE_URL')),
  buyerOrigin: trimSlash(required('YAPP_BASE_URL')),
  creatorOrigin: trimSlash(required('YAPP_CREATORS_BASE_URL')),
  /** QA buyer `anthony_mosciski`. Empty → the scenario runs as a guest. */
  buyerToken: token('YAPP_TEST_ACCESS_TOKEN_BUYER'),
  /** Creator `hendrarg`. */
  creatorToken: token('YAPP_TEST_ACCESS_TOKEN'),
  /** Sundanese — the second account buyer/comments seeds its post with and creator/follow targets. */
  sundaneseToken: token('YAPP_TEST_ACCESS_TOKEN_2'),
  profile: __ENV.PROFILE || 'smoke',
};
