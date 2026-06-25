function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be set (see .env.example)`);
  }
  return value;
}

export const baseURL = requireEnv('YAPP_BASE_URL');
export const creatorsBaseURL = requireEnv('YAPP_CREATORS_BASE_URL');

export function testmailEnv() {
  return {
    apiKey: requireEnv('TESTMAIL_API_KEY'),
    namespace: requireEnv('TESTMAIL_NAMESPACE'),
  };
}
