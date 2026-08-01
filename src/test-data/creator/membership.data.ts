import { faker } from "@faker-js/faker";

export type MembershipTier = {
  name: string;
  price: number;
  description: string;
  benefits: string[];
};

// ── Static templates ─────────────────────────────────────────────

export const membershipTemplates = {
  basic: {
    name: "Basic",
    price: 9.99,
    description: "Access to basic content",
    benefits: ["Exclusive posts", "Community access"],
  },
  premium: {
    name: "Premium",
    price: 19.99,
    description: "Full access including live streams",
    benefits: ["Everything in Basic", "Live streams", "Priority support"],
  },
  vip: {
    name: "VIP",
    price: 49.99,
    description: "All access plus 1-on-1 consultation",
    benefits: ["Everything in Premium", "1-on-1 consultation", "Custom content"],
  },
} as const;

export const discordMembershipValidationData = {
  requiredErrors: ["Title is required", "Description is required", "Duration is required"] as const,
  descriptionLimit: "500 / 500",
  descriptionOverflowWord: " overflow",
  durationUnits: ["Days", "Month", "Years"] as const,
  serverName: "Hendra's server",
  roleName: "Boss",
  linkedServerOption: "Hendra's server",
  connectServerOption: "+ Connect new server",
} as const;

export function generateDiscordMembershipTitle(): string {
  return faker.commerce.productName();
}

export function generateDiscordMembershipDescription(): string {
  return faker.lorem.sentence();
}

export function generateDiscordMembershipLimitDescription(): string {
  return Array.from({ length: 500 }, (_, index) => `w${index}`).join(" ");
}

// ── Factory ──────────────────────────────────────────────────────

export function generateMembershipTier(overrides?: Partial<MembershipTier>): MembershipTier {
  return {
    name: faker.company.buzzNoun() + " Tier",
    price: parseFloat(faker.commerce.price({ min: 5, max: 100 })),
    description: faker.lorem.sentence(),
    benefits: faker.helpers.multiple(() => faker.lorem.words(3), { count: 3 }),
    ...overrides,
  };
}
