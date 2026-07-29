import { faker } from "@faker-js/faker";
import { testImages } from "@test-data/creator/post.data";

export interface OnlineCourseProductData {
  title: string;
  description: string;
  thumbnailImagePath: string;
  price: number;
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
  discordMembershipCreatePath: /\/products\/create\/discord-membership/,
} as const;

export function generateOnlineCourseProductData(
  overrides?: Partial<OnlineCourseProductData>,
): OnlineCourseProductData {
  return {
    title: `AUT-FV-218 ${Date.now()} ${faker.string.alphanumeric(6)}`,
    description: faker.lorem.sentence(),
    thumbnailImagePath: testImages.hermes,
    price: 0,
    ...overrides,
  };
}
