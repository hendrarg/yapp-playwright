import { testmailEnv } from '../../../config/env';

export interface TestmailInbox {
  apiKey: string;
  namespace: string;
  tag: string;
  email: string;
}

interface TestmailEmail {
  text?: string;
  html?: string;
  subject?: string;
}

interface TestmailResponse {
  result: 'success' | 'fail';
  message?: string | null;
  emails?: TestmailEmail[];
}

export function testmailConfig(): TestmailInbox {
  const { apiKey, namespace } = testmailEnv();
  const tag = 'sdet';
  return {
    apiKey,
    namespace,
    tag,
    email: `${namespace}.${tag}@inbox.testmail.app`,
  };
}

/** Records the start time (ms since epoch) used to filter only emails received after this point. */
export function markInboxStart(): number {
  return Date.now();
}

/** Polls testmail.app (live query) for the OTP email and extracts the 5-digit verification code. */
export async function fetchOtpCode(
  inbox: TestmailInbox,
  sentAfterMs: number,
  timeoutMs = 30000
): Promise<string> {
  const url = new URL('https://api.testmail.app/api/json');
  url.searchParams.set('apikey', inbox.apiKey);
  url.searchParams.set('namespace', inbox.namespace);
  url.searchParams.set('tag', inbox.tag);
  url.searchParams.set('timestamp_from', String(sentAfterMs));
  url.searchParams.set('livequery', 'true');
  url.searchParams.set('limit', '1');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url.toString(), { signal: controller.signal });
    if (!resp.ok) {
      throw new Error(`testmail.app API ${resp.status}: ${await resp.text()}`);
    }
    const data = (await resp.json()) as TestmailResponse;
    if (data.result !== 'success') {
      throw new Error(`testmail.app query failed: ${data.message ?? 'unknown error'}`);
    }
    const emails = data.emails ?? [];
    if (emails.length === 0) {
      throw new Error('No OTP email received within timeout');
    }
    const email = emails[0];
    const text = email.text ?? (email.html ? String(email.html).replace(/<[^>]*>/g, ' ') : '');
    const match = text.match(/\b(\d{5})\b/);
    if (!match) {
      throw new Error('Expected to find a 5-digit one-time code in the OTP email');
    }
    return match[1];
  } finally {
    clearTimeout(timer);
  }
}
