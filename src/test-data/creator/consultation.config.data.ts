import { faker } from "@faker-js/faker";

/** After-sales preview / inactive access data (AUT-FV-025, AUT-FV-026). */
export const consultationConfigData = {
  previewDialogHeadingPattern: /yapp|preview|after sales/i,
  price: 15000,
} as const;

export function generateConsultationConfigTitle(): string {
  return faker.commerce.productName();
}

export function generateConsultationConfigDescription(): string {
  return faker.lorem.sentence();
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
