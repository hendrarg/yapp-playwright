import { faker } from "@faker-js/faker";
import { getAiText } from "@test-data/ai";

/** After-sales preview / inactive access data (AUT-FV-025, AUT-FV-026). */
export const consultationConfigData = {
  previewDialogHeadingPattern: /yapp|preview|after sales/i,
  price: 15000,
} as const;

export function generateConsultationConfigTitle(): string {
  return getAiText("consultation:title", () => faker.commerce.productName());
}

export function generateConsultationConfigDescription(): string {
  return getAiText("consultation:description", () => faker.lorem.sentence());
}

export function generateConsultationAfterSalesPreviewMessage(): string {
  return faker.lorem.sentence();
}

export function generateConsultationAfterSalesLink() {
  return {
    label: faker.commerce.productAdjective(),
    url: `https://example.com/${faker.string.alphanumeric({ length: 8, casing: "lower" })}`,
  };
}

/** After Sales copy and counter on the consultation form. */
export const consultationAfterSalesData = {
  purposeCopy: "Turn this on to create personalized messages for your buyers with custom notes and links.",
  emptyCounter: "0/1000 characters",
} as const;
