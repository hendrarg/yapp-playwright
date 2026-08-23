/**
 * Single entry point for reading a one-time code, with a fallback chain.
 *
 * testmail.app is the primary source because it exercises real email delivery.
 * Its free tier caps the inbox at 100 emails/month, so when the quota runs out
 * every OTP login would fail even though the app generated the code correctly.
 * `otp_codes` in the dev database holds that same code, so it serves as the
 * fallback. `YAPP_OTP_SOURCE` picks the strategy (see `otpSource`).
 */
import { otpSource } from '@config/env';
import { fetchOtpCode, type TestmailInbox } from './testmail';
import { fetchOtpCodeFromDb, type DbOtpOptions } from './db-otp';

export interface ResolveOtpOptions extends DbOtpOptions {
  /** Timeout for the testmail.app poll. Ignored when the source is `db`. */
  testmailTimeoutMs?: number;
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Resolves the OTP for `inbox` using the configured source.
 * In `auto` mode a testmail failure is reported and the database is tried next;
 * if both fail the thrown error names each cause.
 */
export async function resolveOtpCode(
  inbox: TestmailInbox,
  sentAfterMs: number,
  options: ResolveOtpOptions = {},
): Promise<string> {
  const { testmailTimeoutMs, ...dbOptions } = options;
  const source = otpSource();

  if (source === 'db') {
    return fetchOtpCodeFromDb(inbox.email, sentAfterMs, dbOptions);
  }

  try {
    return await fetchOtpCode(inbox, sentAfterMs, testmailTimeoutMs);
  } catch (testmailError) {
    if (source === 'testmail') throw testmailError;

    console.warn(`OTP via testmail.app failed (${describe(testmailError)}); falling back to otp_codes.`);
    try {
      return await fetchOtpCodeFromDb(inbox.email, sentAfterMs, dbOptions);
    } catch (dbError) {
      throw new Error(
        `Could not resolve an OTP for ${inbox.email}. ` +
          `testmail.app: ${describe(testmailError)} | database: ${describe(dbError)}`,
      );
    }
  }
}
