import { faker } from "@faker-js/faker";
import { getAiText } from "@test-data/ai";

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

export function generateCampaignTitle(): string {
  return getAiText("campaign:name", () => `${faker.commerce.productName()} Drive`);
}

export const campaignEditorData = {
  goal: "100000",
  updatedGoal: "150000",
  cardColor: "#112233",
  progressBackground: "#334455",
  progressBar: "#667788",
  columns: ["IMAGE", "CAMPAIGN NAME", "GOALS", "CURRENT", "STATUS", "ACTION"],
  statusTabs: ["All", "Active", "Inactive", "Collaboration"],
  titleRequired: "Campaign title is required",
  emptyCollaboration: "No results.",
  coverHint: /500\s*×\s*500|50\s*MB/i,
} as const;

export function generateCampaign(overrides?: Partial<CampaignInput>): CampaignInput {
  const start = faker.date.future();
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);

  return {
    name: getAiText("campaign:name", () => faker.commerce.department() + " Campaign"),
    description: getAiText("campaign:description", () => faker.lorem.sentence()),
    discountPercent: faker.number.int({ min: 5, max: 70 }),
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
    ...overrides,
  };
}
