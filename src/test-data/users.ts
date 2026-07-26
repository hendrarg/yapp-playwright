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

/** JWT-backed test accounts mapped to .env token slots. */
export const testAccounts = {
  hendra: {
    username: "jendraljohn92",
    envVar: "YAPP_TEST_ACCESS_TOKEN",
    displayName: "Hendra",
  },
  sundanese: {
    username: "x7nv1.sdet",
    envVar: "YAPP_TEST_ACCESS_TOKEN_2",
    displayName: "Sundanese",
  },
} as const;

export type TestTokenEnvVar = (typeof testAccounts)[keyof typeof testAccounts]["envVar"];

// ── Login credentials ────────────────────────────────────────────

/** OTP inbox for Sundanese (`x7nv1.sdet`) — NOT Hendra. Saved token goes to `YAPP_TEST_ACCESS_TOKEN_2`. */
export const otpUser = {
  email: `${process.env.TESTMAIL_NAMESPACE}.sdet@inbox.testmail.app`,
  timeout: 90000,
  account: testAccounts.sundanese,
};
