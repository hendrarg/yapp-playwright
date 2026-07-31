import { faker } from "@faker-js/faker";

/** Navigation / unsaved-warning data for consultation create (AUT-FV-019). */
export const consultationNavigationData = {
  mobileViewport: { width: 390, height: 844 } as const,
  nextCtaName: "Next: Set Availability",
  backButtonName: "Back",
  unsavedDialogPattern: /unsaved|leave|discard|save your changes|are you sure|lose your changes/i,
} as const;

export function generateConsultationNavigationTitle(): string {
  return faker.commerce.productName();
}

export function generateConsultationNavigationDescription(): string {
  return faker.lorem.sentence();
}
