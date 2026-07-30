import { generatePromotionData } from "@test-data/creator/promotion.data";

export type PromotionValidationFormData = {
  name: string;
  discount: number;
  code: string;
  maximumUsage?: number;
  startDateDay: string;
  endDateDay: string;
};

export const promotionValidationData = {
  requiredError: "Required",
  discount: 10,
  maximumUsage: 5,
} as const;

const DAY_MS = 24 * 60 * 60 * 1000;

export function formatPromotionDateDay(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
}

export function generatePromotionValidationData(
  overrides: Partial<PromotionValidationFormData> = {},
): PromotionValidationFormData {
  const basePromotion = generatePromotionData("active", {
    discount: promotionValidationData.discount,
    periodEndAt: new Date(Date.now() + DAY_MS).toISOString(),
  });

  return {
    name: basePromotion.name,
    discount: basePromotion.discount,
    code: basePromotion.code,
    maximumUsage: promotionValidationData.maximumUsage,
    startDateDay: formatPromotionDateDay(new Date(basePromotion.periodStartAt)),
    endDateDay: formatPromotionDateDay(new Date(basePromotion.periodEndAt)),
    ...overrides,
  };
}
