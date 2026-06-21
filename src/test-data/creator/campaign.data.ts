import { faker } from "@faker-js/faker";

export type CampaignInput = {
  name: string;
  description: string;
  discountPercent: number;
  startDate: string;
  endDate: string;
};

// ── Static templates ─────────────────────────────────────────────

export const campaignTemplates = {
  seasonal: {
    name: "Summer Sale",
    description: "Seasonal discount campaign",
    discountPercent: 20,
  },
  flash: {
    name: "Flash Deal",
    description: "Limited time flash sale",
    discountPercent: 50,
  },
} as const;

// ── Factory ──────────────────────────────────────────────────────

export function generateCampaign(overrides?: Partial<CampaignInput>): CampaignInput {
  const start = faker.date.future();
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);

  return {
    name: faker.commerce.department() + " Campaign",
    description: faker.lorem.sentence(),
    discountPercent: faker.number.int({ min: 5, max: 70 }),
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
    ...overrides,
  };
}
