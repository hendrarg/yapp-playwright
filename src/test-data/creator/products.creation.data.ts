import { faker } from "@faker-js/faker";
import { testImages } from "@test-data/creator/post.data";

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
} as const;

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

export function generateOnlineCourseProductData(
  overrides?: Partial<OnlineCourseProductData>,
): OnlineCourseProductData {
  return {
    title: `AUT-FV-218 ${faker.string.alphanumeric(8)}`,
    description: faker.lorem.sentence(),
    thumbnailImagePath: testImages.hermes,
    price: 0,
    ...overrides,
  };
}
