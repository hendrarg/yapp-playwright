function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be set (see .env.example)`);
  }
  return value;
}

export const baseURL = requireEnv('YAPP_BASE_URL');
export const creatorsBaseURL = requireEnv('YAPP_CREATORS_BASE_URL');
export const apiBaseURL = requireEnv('YAPP_API_BASE_URL');

export function testmailEnv() {
  return {
    apiKey: requireEnv('TESTMAIL_API_KEY'),
    namespace: requireEnv('TESTMAIL_NAMESPACE'),
  };
}

/**
 * Optional AI-assisted test-data config (Google Gemini). Never required: when the
 * key is absent the factories fall back to seeded Faker. Reads env at call time so
 * unit tests can set/clear it.
 */
export function geminiConfig() {
  return {
    apiKey: process.env.GEMINI_API_KEY ?? '',
    model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
  };
}
