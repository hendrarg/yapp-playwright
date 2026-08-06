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
  thumbnailImagePath: testImages.hermes,
  /** Gallery images seeded via `productImagePaths`; thumbnail renders as the first carousel slide. */
  carouselImagePaths: [testImages.claude, testImages.gemini] as const,
  /** Carousel slides = 1 thumbnail + 2 gallery images. */
  expectedSlideCount: 3,
} as const;

export function generateOnlineCourseBuyerTitle(): string {
  return faker.commerce.productName();
}

export function generateOnlineCourseBuyerDescription(): string {
  return faker.lorem.sentence();
}
