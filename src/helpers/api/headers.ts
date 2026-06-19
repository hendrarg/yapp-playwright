// Yapp's API sits behind a WAF that rejects requests without browser-like
// Origin/Referer/User-Agent headers (403 "not allowed to access this API"),
// independent of and upstream of any captcha check.
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36';

export function buildBrowserLikeHeaders(origin: string): Record<string, string> {
  return {
    Origin: origin,
    Referer: `${origin}/`,
    'User-Agent': USER_AGENT,
  };
}
