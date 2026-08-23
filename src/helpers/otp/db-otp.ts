/**
 * OTP fallback source: read the one-time code straight from the dev database.
 *
 * The app persists every code to `otp_codes` in plaintext, so when the
 * testmail.app inbox cannot deliver it (monthly quota reached, delivery delayed)
 * the same code is still readable here. Read-only: the app marks the row used
 * when the code is submitted, so this must not write.
 */
import { queryOne } from '@helpers/db/client';

/** `otp_codes.purpose` values the app writes. */
export type OtpPurpose = 'verify-login-otp' | 'verify-order-otp';

export interface DbOtpOptions {
  /** Which flow the code belongs to. Login OTP by default. */
  purpose?: OtpPurpose;
  /** Give up after this long — matches `fetchOtpCode`'s 30s default. */
  timeoutMs?: number;
  /** Gap between polls. */
  pollMs?: number;
  /**
   * Tolerance for clock skew between this machine and the database server:
   * rows are accepted from `sentAfter - clockSkewMs` onwards. Widening this
   * cannot return a staler code than the one just requested, because the query
   * always takes the newest matching row.
   */
  clockSkewMs?: number;
}

interface OtpCodeRow {
  code: string;
}

/** Newest unused, unexpired code for one email + purpose. */
const SELECT_LATEST_OTP = `
  SELECT code
  FROM otp_codes
  WHERE email = $1
    AND purpose = $2
    AND is_used = false
    AND deleted_at IS NULL
    AND expires_at > NOW()
    AND created_at >= to_timestamp($3)
  ORDER BY created_at DESC
  LIMIT 1
`;

/** Polls `otp_codes` until the code for `email` appears, or the timeout passes. */
export async function fetchOtpCodeFromDb(
  email: string,
  sentAfterMs: number,
  options: DbOtpOptions = {},
): Promise<string> {
  const { purpose = 'verify-login-otp', timeoutMs = 30000, pollMs = 1000, clockSkewMs = 30000 } = options;
  const notBeforeSeconds = Math.max(0, sentAfterMs - clockSkewMs) / 1000;
  const deadline = Date.now() + timeoutMs;

  for (;;) {
    const row = await queryOne<OtpCodeRow>(SELECT_LATEST_OTP, [email, purpose, notBeforeSeconds]);
    if (row) return row.code;
    if (Date.now() >= deadline) {
      throw new Error(`No unused ${purpose} row in otp_codes for ${email} within ${timeoutMs}ms`);
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
}
