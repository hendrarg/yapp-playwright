import { faker } from "@faker-js/faker";
import { creatorProfiles } from "@test-data/buyer/profile.data";

/** Buyer consultation product-detail data (AUT-FV-027 / AUT-FV-028). */
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
  nextSlideName: "Next slide",
  previousSlideName: "Previous slide",
  slideButtonName: (index: number) => `Go to slide ${index}`,
  /** Hero + 10 gallery images from create flow → 11 slides. */
  expectedSlideCount: 11,
  activeSlideClassPattern: /(?:^|\s)bg-white(?:\s|$)/,
  inactiveSlideClassPattern: /bg-white\/50/,
} as const;

export function generateConsultationBuyerTitle(): string {
  return faker.commerce.productName();
}

export function generateConsultationBuyerDescription(): string {
  return faker.lorem.sentence();
}
