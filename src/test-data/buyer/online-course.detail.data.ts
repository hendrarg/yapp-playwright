import { faker } from "@faker-js/faker";
import { testImages } from "@test-data/creator/post.data";

/** Buyer Online Course product-detail data (AUT-FV-169 / TC-OC-B-001). */
export const onlineCourseBuyerDetailData = {
  creatorName: "Tester",
  price: 100000,
  priceDisplayPattern: /Rp100\.000/,
  productBadge: "Online Course",
  detailHeading: "Product Detail",
  overviewTab: "Overview",
  aboutCreatorTab: "About Creator",
  nextSlideName: "Next slide",
  previousSlideName: "Previous slide",
  slideButtonName: (index: number) => `Go to slide ${index}`,
  /** Active thumbnail dot is fully opaque; inactive dots are half-opacity. */
  activeSlideClassPattern: /(?:^|\s)bg-white(?:\s|$)/,
  inactiveSlideClassPattern: /bg-white\/50/,
  thumbnailImagePath: testImages.hermes,
  /** Gallery images seeded via `productImagePaths`; thumbnail renders as the first carousel slide. */
  carouselImagePaths: [testImages.claude, testImages.gemini] as const,
  /** Carousel slides = 1 thumbnail + 2 gallery images. */
  expectedSlideCount: 3,
} as const;

/** Online Course checkout copy and validators (AUT-FV-171 / TC-OC-B-003..007). */
export const onlineCourseCheckoutData = {
  quantityLabelPattern: /Quantity:\s*1/,
  buyerNameRequiredError: "Buyer name is required",
  phoneNumberRequiredError: "Phone number is required",
  checkoutHeading: "Checkout",
  freeTotalLabel: "Free",
  freeCheckoutBadge: "FREE",
  payCtaPattern: /^Pay IDR/,
  /** 11% promo from `generatePromotionData('active')` used in the voucher step. */
  activePromotionDiscountPercent: 11,
} as const;

export function generateOnlineCourseInvalidVoucherCode(): string {
  return faker.string.alphanumeric({ length: 8, casing: "upper" });
}

export function generateOnlineCourseBuyerTitle(): string {
  return faker.commerce.productName();
}

export function generateOnlineCourseBuyerDescription(): string {
  return faker.lorem.sentence();
}
