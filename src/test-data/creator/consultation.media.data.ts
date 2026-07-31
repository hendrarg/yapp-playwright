import { faker } from "@faker-js/faker";
import { testImages } from "@test-data/creator/post.data";

/** Media / publish data for consultation create (AUT-FV-018). */
export const consultationMediaData = {
  description: "Formatted consultation media description",
  updatedDescription: "Updated consultation description after republish",
  heroImagePath: testImages.claude,
  additionalImagePaths: [
    testImages.claude,
    testImages.qwen,
    testImages.claude,
    testImages.qwen,
    testImages.claude,
    testImages.qwen,
    testImages.claude,
    testImages.qwen,
    testImages.claude,
    testImages.qwen,
  ] as const,
  undersizedImagePath: testImages.hermes,
  tinyImagePath: "src/test-data/assets/tiny-1x1.png",
  oversizedFileName: "huge.png",
  oversizedBytes: 524288000,
  errors: {
    heroRequired: "Hero image is required",
    tooSmall: /is too small\. Image must be at least 500 × 500 pixels\./i,
    tooLarge: /File is larger than 524288000 bytes/i,
    requiredSummary: "Please fill in all required fields before proceeding",
  },
  productCompleteHeading: "Product Complete",
  productCompleteBody: "Your product has been successfully created.",
  republishLiveHeading: /Your consultation is live!/i,
  maxAdditionalImages: 10,
} as const;

export function generateConsultationTitle(prefix = "AUT-FV-018"): string {
  return `${prefix} ${faker.string.alphanumeric(8)}`;
}
