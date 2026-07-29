import { apiBaseURL } from '@config/env';

export function apiUrl(path: string) {
  return `${apiBaseURL.replace(/\/$/, '')}${path}`;
}

export function getHeaders(token?: string, origin = 'https://yapp-dev.yapp.ink') {
  const t = (token ?? process.env.YAPP_TEST_ACCESS_TOKEN ?? '').replace(/"/g, '');
  return {
    Authorization: `Bearer ${t}`,
    'Content-Type': 'application/json',
    Origin: origin,
    Referer: `${origin}/`,
  };
}
