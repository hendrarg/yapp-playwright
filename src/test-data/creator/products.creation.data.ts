import { faker } from "@faker-js/faker";
import { getAiText } from "@test-data/ai";
import { testImages, testVideos } from "@test-data/creator/post.data";

export interface OnlineCourseProductData {
  title: string;
  description: string;
  thumbnailImagePath: string;
  price: number;
  status?: "active" | "inactive" | "draft";
}

/** PRD product types shown in the Add New Product sheet (TC-PROD-C-015). */
export const productsCreationData = {
  productTypes: [
    {
      label: "Digital Product",
      buttonName: /Digital Products Digital Product Downloadable files/i,
    },
    {
      label: "Online Course",
      buttonName: /Digital Products Online Course Provide interactive courses/i,
    },
    {
      label: "Consultation",
      buttonName: /Appointment Consultation Create and manage paid bookings/i,
    },
    {
      label: "Discord Membership",
      buttonName: /Memberships Discord Membership Sell access to private Discord/i,
    },
    {
      label: "Events and Tickets",
      buttonName: /Appointment Events and Tickets Ideal for webinars/i,
    },
  ] as const,
  digitalProductCreatePath: /\/products\/create\/digital-downloads/,
  discordMembershipCreatePath: /\/products\/create\/discord-membership/,
  consultationCreatePath: /\/products\/create\/consultation/,
  onlineCourseCreatePath: /\/products\/create\/online-course/,
} as const;

/** Online Course content editor labels and defaults (AUT-FV-161 / TC-OC-C-001..033). */
export const onlineCourseStructureData = {
  contentTypes: ["Video", "File", "Free Text"] as const,
  defaultChapterName: "Chapter title",
  defaultEpisodeName: "New Episode",
} as const;

export type OnlineCourseContentType =
  (typeof onlineCourseStructureData.contentTypes)[number];

export function generateOnlineCourseChapterTitle(): string {
  return getAiText("chapter:title", () => faker.commerce.productName());
}

export function generateOnlineCourseEpisodeTitle(): string {
  return getAiText("episode:title", () => faker.commerce.productName());
}

export function generateOnlineCourseEpisodeContent(): string {
  return getAiText("episode:content", () => faker.lorem.sentence());
}

export const onlineCourseValidationData = {
  requiredErrors: {
    title: "Title is required",
    description: "Description is required",
    thumbnail: "Thumbnail is required",
    summary: "Please fill in all required fields before proceeding",
  },
  descriptionLimit: 500,
  fiveCustomQuestions: [
    "Question 1",
    "Question 2",
    "Question 3",
    "Question 4",
    "Question 5",
  ],
} as const;

export const onlineCourseMediaData = {
  videoPath: testVideos.sample,
  thumbnailPaths: [
    testImages.claude,
    testImages.claude,
    testImages.claude,
    testImages.claude,
    testImages.claude,
    testImages.claude,
    testImages.claude,
    testImages.claude,
    testImages.claude,
    testImages.claude,
    testImages.claude,
  ] as const,
  tinyThumbnailPath: "src/test-data/assets/tiny-1x1.png",
} as const;

export const onlineCoursePricingData = {
  validPrice: "10000",
  zeroPrice: "0",
  belowMinimumPrice: "9999",
  invalidPriceErrorPattern: /Price must be either 0 or at least Rp10\.000/i,
} as const;

/** Digital Product pricing boundary data (AUT-FV-193 / TC-PD-C-018..019). */
export const digitalProductPricingData = {
  freeLabel: "Free",
  idrZeroPattern: /IDR\s*0/,
  validPrice: "10000",
  /** Creator-side live preview formats price as "IDR 10,000". */
  validPriceDisplayPattern: /IDR\s*10[,.]000/,
  zeroPrice: "0",
  belowMinimumPrice: "9999",
  invalidPriceErrorPattern: /Price must be either 0 or at least Rp10\.000/i,
} as const;

export const onlineCourseAfterSalesData = {
  defaultOffCopyPattern: /turn this on|default.*email|email.*default/i,
  previewDialogPattern: /after sales|preview|links/i,
} as const;

export function generateOnlineCourseAfterSalesMessage(): string {
  return faker.lorem.sentence();
}

export function generateOnlineCourseAfterSalesLink() {
  return {
    label: faker.commerce.productAdjective(),
    url: `https://example.com/${faker.string.alphanumeric({ length: 8, casing: "lower" })}`,
  };
}

export const digitalProductValidationData = {
  requiredErrors: {
    title: "Title is required",
    description: "Description is required",
    content: "At least one of Upload Files or Embed Links is required",
    thumbnail: "Thumbnail is required",
    summary: "Please fill in all required fields before proceeding",
  },
  linkValidation: {
    invalidUrl: "not-a-url",
    invalidUrlError:
      "Invalid URL format. Please include http:// or https:// (Example: https://yourlink.com)",
    longLabel: "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890LONG-LABEL",
    truncatedLongLabel: "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890LONG",
    maxLabelCounter: "40/40 characters",
    validLinks: [
      {
        label: "Creator Guide",
        url: "https://example.com/creator-guide",
      },
      {
        label: "Bonus Resource",
        url: "https://example.com/bonus-resource",
      },
    ],
  },
} as const;

export function generateDigitalProductTitle(): string {
  return getAiText("product:name", () => faker.commerce.productName());
}

export function generateDigitalProductDescription(): string {
  return getAiText("product:description", () => faker.lorem.sentence());
}

/** Buyer-only post-purchase description content (TC-PD-C-013). The UI counter counts words (max 500). */
export function generateDigitalProductBuyerOnlyDescription(wordCount = 500): string {
  const words: string[] = [];
  while (words.length < wordCount) {
    words.push(...faker.lorem.words(3).split(' '));
  }
  return words.slice(0, wordCount).join(' ');
}

export function generateOnlineCourseProductData(
  overrides?: Partial<OnlineCourseProductData>,
): OnlineCourseProductData {
  return {
    title: getAiText("product:name", () => faker.commerce.productName()),
    description: getAiText("product:description", () => faker.lorem.sentence()),
    thumbnailImagePath: testImages.hermes,
    price: 0,
    ...overrides,
  };
}
