import { faker } from "@faker-js/faker";
import { digitalProductValidationData } from "@test-data/creator/products.creation.data";

export const eventsAfterSalesData = {
  emptyCounter: "0/1000 characters",
  invalidUrlError: digitalProductValidationData.linkValidation.invalidUrlError,
  firstLinkUrl: "https://example.com/events-guide",
  imageBudgetMinimum: 500,
} as const;

export function generateEventsAfterSalesMessage(): string {
  return faker.string.alpha({ length: 88 });
}

export function generateEventsAfterSalesLabel(): string {
  return faker.string.alpha({ length: 35 });
}

export function generateEventsAfterSalesLinks() {
  return [
    {
      label: faker.commerce.productAdjective(),
      url: eventsAfterSalesData.firstLinkUrl,
    },
    {
      label: faker.commerce.productAdjective(),
      url: `https://example.com/${faker.string.alphanumeric({ length: 8, casing: "lower" })}`,
    },
    {
      label: faker.commerce.productAdjective(),
      url: `https://example.com/${faker.string.alphanumeric({ length: 8, casing: "lower" })}`,
    },
  ] as const;
}
