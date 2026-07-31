import { faker } from "@faker-js/faker";

/** Pricing / notice data for consultation (AUT-FV-020). */
export const consultationPricingData = {
  titlePrefix: "AUT-FV-020",
  description: "Consultation pricing and minimum notice validation",
  validPrice: "12000",
  zeroPrice: "0",
  previewPaidPricePattern: /Rp12\.000,00/,
  previewZeroPricePattern: /Rp0,00/,
  zeroPriceErrorPattern: /greater than zero|must be greater|positive|cannot be zero|invalid price/i,
  minimumNoticeHoursShort: 1,
  minimumNoticeHoursLong: 168,
  slotStartTime: "09:00",
  slotEndTime: "17:00",
  /** Long-notice first bookable day should be at least this many days after short-notice. */
  minimumNoticeDayGap: 6,
  buyerFreeLabel: "Free",
} as const;

export function generateConsultationPricingTitle(
  prefix = consultationPricingData.titlePrefix,
): string {
  return `${prefix} ${faker.string.alphanumeric(8)}`;
}

const monthIndex: Record<string, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

/** Parse buyer day chip text such as `Fri Aug 7` into a calendar date. */
export function parseConsultationDayButtonLabel(label: string, reference = new Date()): Date {
  const normalized = label.replace(/\s+/g, " ").trim();
  const match = normalized.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})/i);
  if (!match) {
    throw new Error(`Could not parse consultation day label: ${label}`);
  }

  const monthKey = match[1].slice(0, 3);
  const monthKeyNormalized = (monthKey.charAt(0).toUpperCase() +
    monthKey.slice(1).toLowerCase()) as keyof typeof monthIndex;
  const monthNum = monthIndex[monthKeyNormalized];
  if (monthNum === undefined) {
    throw new Error(`Unknown month in consultation day label: ${label}`);
  }

  const day = Number(match[2]);
  let year = reference.getFullYear();
  let candidate = new Date(year, monthNum, day);
  if (candidate.getTime() < reference.getTime() - 24 * 60 * 60 * 1000) {
    year += 1;
    candidate = new Date(year, monthNum, day);
  }
  return candidate;
}
