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

/** JWT-backed test accounts mapped to .env token slots + testmail tags. */
export const testAccounts = {
  qa: {
    username: "x7nv1.qa",
    envVar: "YAPP_TEST_ACCESS_TOKEN",
    displayName: "QA Tester",
    testmailTag: "qa",
  },
  sundanese: {
    username: "x7nv1.sdet",
    envVar: "YAPP_TEST_ACCESS_TOKEN_2",
    displayName: "Sundanese",
    testmailTag: "sdet",
  },
} as const;

export type TestAccountKey = keyof typeof testAccounts;
export type TestAccount = (typeof testAccounts)[TestAccountKey];
export type TestTokenEnvVar = TestAccount["envVar"];

// ── Login credentials ────────────────────────────────────────────

/** Primary OTP inbox for token1 (`YAPP_TEST_ACCESS_TOKEN`). */
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
