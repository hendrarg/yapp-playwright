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

// ── Login credentials ────────────────────────────────────────────

/** For OTP login tests only. Prefer token injection for feature tests. */
export const otpUser = {
  email: `${process.env.TESTMAIL_NAMESPACE}.sdet@inbox.testmail.app`,
  timeout: 90000,
};
