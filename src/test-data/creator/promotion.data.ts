import { faker } from '@faker-js/faker';
import type { CreatePromotionOptions } from '@helpers/api/promotion';

export type PromotionStatus = 'expired' | 'active' | 'inactive';

const DAY_MS = 24 * 60 * 60 * 1000;
const generatedCodes = new Set<string>();
let promotionNameCounter = 0;

function generatePromotionCode(): string {
  let code: string;
  do {
    const letters = faker.string.alpha({ length: 4, casing: 'upper' });
    const numbers = faker.string.numeric(4);
    code = faker.helpers.shuffle([...letters, ...numbers]).join('');
  } while (generatedCodes.has(code));

  generatedCodes.add(code);
  return code;
}

export function generatePromotionData(
  status: PromotionStatus = 'active',
  overrides?: Partial<CreatePromotionOptions>,
): CreatePromotionOptions {
  const now = Date.now();
  const code = generatePromotionCode();
  const name = `promo${String(++promotionNameCounter).padStart(3, '0')}`;
  const periodStartAt = status === 'expired'
    ? new Date(now - 14 * DAY_MS)
    : status === 'inactive'
      ? new Date(now + 7 * DAY_MS)
      : new Date(now);
  const periodEndAt = status === 'expired'
    ? new Date(now - 7 * DAY_MS)
    : new Date(periodStartAt.getTime() + 7 * DAY_MS);

  return {
    name,
    discountType: 'percentage',
    discount: 11,
    code,
    promoProductType: 'all_product',
    periodStartAt: periodStartAt.toISOString(),
    periodEndAt: periodEndAt.toISOString(),
    isSetAffiliate: false,
    ...overrides,
  };
}
