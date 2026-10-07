import { faker } from "@faker-js/faker";

// ── User profiles ────────────────────────────────────────────────

export const buyerUser = {
  name: "Test Buyer",
  email: faker.internet.email({ provider: "test.buyer" }),
} as const;

export const creatorUser = {
  name: "Test Creator",
  email: faker.internet.email({ provider: "test.creator" }),
  username: faker.internet.username(),
} as const;

/**
 * JWT-backed test accounts mapped to .env token slots.
 *
 * Ownership is checked by the JWT `uuid` claim — Yapp tokens carry `id` + `uuid` only, no
 * username — so a refresh can never silently swap one account's token into another's slot.
 *
 * - `creator` (token1) — hendrarg, the creator under test: `creatorAuthTest` and API seeding.
 *   Logs in with a personal email kept out of the repo (`YAPP_CREATOR_LOGIN_EMAIL`); its OTP is
 *   read from the dev DB (`otp_codes`) because that inbox is not a testmail inbox.
 * - `qa` (buyer token) — anthony_mosciski, the login behind the testmail QA inbox: `authTest`.
 * - `sundanese` (token2) — creator-post seeding and second-account flows.
 */
export const testAccounts = {
  creator: {
    uuid: "84ae3e39-ffe3-4d90-994c-413eb3435768",
    username: "hendrarg",
    envVar: "YAPP_TEST_ACCESS_TOKEN",
    displayName: "Creator (hendrarg)",
    loginEmailEnv: "YAPP_CREATOR_LOGIN_EMAIL",
  },
  qa: {
    uuid: "5bad6f80-dc4a-436e-b7ef-28293b32fa7b",
    username: "anthony_mosciski",
    envVar: "YAPP_TEST_ACCESS_TOKEN_BUYER",
    displayName: "QA buyer (anthony_mosciski)",
    testmailTag: "qa",
  },
  sundanese: {
    uuid: "184bfcbc-80eb-427d-923d-fd558e4462de",
    username: "sundanese",
    envVar: "YAPP_TEST_ACCESS_TOKEN_2",
    displayName: "Sundanese",
    testmailTag: "sdet",
  },
} as const;

export type TestAccountKey = keyof typeof testAccounts;
export type TestAccount = (typeof testAccounts)[TestAccountKey];
export type TestTokenEnvVar = TestAccount["envVar"];
/**
 * Inbox-only accounts: no token slot in `.env`, signed in through OTP when a test needs them.
 * `emptyCreator` is the guest-buyer inbox — onboarded as a creator with no products and no
 * orders, so it is the only account that shows the Orders empty states.
 */
export const inboxAccounts = {
  emptyCreator: { displayName: "Empty creator (guest buyer inbox)", testmailTag: "guestbuyer" },
} as const;
export type InboxAccount = (typeof inboxAccounts)[keyof typeof inboxAccounts];

/** Accounts whose OTP arrives in a testmail.app inbox. */
export type TestmailAccount = Extract<TestAccount, { testmailTag: string }> | InboxAccount;

/** Email the account signs in with: the testmail inbox, or the env-provided address for `creator`. */
export function accountLoginEmail(account: TestAccount | InboxAccount): string {
  if ("loginEmailEnv" in account) {
    const email = process.env[account.loginEmailEnv]?.trim();
    if (!email) throw new Error(`${account.loginEmailEnv} must be set in .env to sign ${account.displayName} in via OTP.`);
    return email;
  }
  return `${process.env.TESTMAIL_NAMESPACE}.${account.testmailTag}@inbox.testmail.app`;
}

// ── Login credentials ────────────────────────────────────────────

/** OTP inbox of the QA buyer (`YAPP_TEST_ACCESS_TOKEN_BUYER`). */
export const otpUser = {
  email: `${process.env.TESTMAIL_NAMESPACE}.${testAccounts.qa.testmailTag}@inbox.testmail.app`,
  timeout: 90000,
  account: testAccounts.qa,
};

/** Secondary OTP inbox for token2 (`YAPP_TEST_ACCESS_TOKEN_2`). */
export const otpUserSundanese = {
  email: `${process.env.TESTMAIL_NAMESPACE}.${testAccounts.sundanese.testmailTag}@inbox.testmail.app`,
  timeout: 90000,
  account: testAccounts.sundanese,
};
