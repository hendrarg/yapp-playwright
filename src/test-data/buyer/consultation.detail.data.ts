import { faker } from "@faker-js/faker";
import { getAiText } from "@test-data/ai";
import { creatorProfiles } from "@test-data/buyer/profile.data";

/** Buyer consultation product-detail data (AUT-FV-027 / AUT-FV-028 / AUT-FV-029). */
export const consultationBuyerDetailData = {
  creatorHandle: creatorProfiles.hendrarg.handle,
  price: "15000",
  priceDisplayPattern: /Rp15\.000/,
  productBadge: "Consultation",
  detailHeading: "Consultation Detail",
  overviewTab: "Overview",
  aboutCreatorTab: "About Creator",
  availableSessionLabel: "Available session",
  meetingLinkHint: /Meeting link will be sent to your email after booking completed/i,
  meetingPlatform: "Google Meet",
  nextSlideName: "Next slide",
  previousSlideName: "Previous slide",
  slideButtonName: (index: number) => `Go to slide ${index}`,
  /** Hero + 10 gallery images from create flow → 11 slides. */
  expectedSlideCount: 11,
  activeSlideClassPattern: /(?:^|\s)bg-white(?:\s|$)/,
  inactiveSlideClassPattern: /bg-white\/50/,
} as const;

/** Scheduling / availability / booking summary (AUT-FV-029 / AUT-FV-030). */
export const consultationBuyerSchedulingData = {
  dayOfWeek: "friday",
  dayChipPrefix: "Fri",
  weekdayIndex: 5,
  startTime: "09:00",
  endTime: "11:00",
  appointmentDurationValue: 60,
  appointmentDurationUnit: "minutes" as const,
  availabilityRangeValue: 1,
  availabilityRangeUnit: "months" as const,
  minimumNoticeValue: 1,
  minimumNoticeUnit: "days" as const,
  /** 60-min slots inside 09:00–11:00. */
  expectedSlots: ["09:00", "10:00"] as const,
  /** Outside configured window — must not be selectable. */
  unavailableSlots: ["08:00", "11:00", "12:00", "13:00"] as const,
  freePrice: 0,
  saveMySpotCtaPrefix: "Save my spot",
  totalAmountLabel: "Total Amount",
  addToCartCta: "Add To Cart",
  checkoutHeading: "Checkout",
  meetingPlatform: "Google Meet",
  consultationDetailsLabel: "Consultation details",
  dateAndTimeLabel: "Date and Time",
  meetingPlatformLabel: "Meeting platform",
  /** Consultation checkout shows one session slot (implicit quantity 1). */
  singleSessionLabel: /1 hour session/i,
} as const;

/** Map day-chip text like `Fri Aug 7 2 slots left` → `Aug 7` for Save my spot CTA. */
export function formatConsultationSaveMySpotDate(dayLabel: string): string {
  const match = dayLabel
    .replace(/\s+/g, " ")
    .trim()
    .match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})/i);
  if (!match) {
    throw new Error(`Could not parse Save my spot date from day label: ${dayLabel}`);
  }
  const month = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
  return `${month} ${Number(match[2])}`;
}

export function generateConsultationBuyerTitle(): string {
  return getAiText("consultation:title", () => faker.commerce.productName());
}

export function generateConsultationBuyerDescription(): string {
  return getAiText("consultation:description", () => faker.lorem.sentence());
}
