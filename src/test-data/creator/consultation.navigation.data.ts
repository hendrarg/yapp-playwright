import { faker } from "@faker-js/faker";
import { getAiText } from "@test-data/ai";

/** Navigation / unsaved-warning data for consultation create (AUT-FV-019). */
export const consultationNavigationData = {
  mobileViewport: { width: 390, height: 844 } as const,
  nextCtaName: "Next: Set Availability",
  backButtonName: "Back",
  unsavedDialogPattern: /unsaved|leave|discard|save your changes|are you sure|lose your changes/i,
} as const;

export function generateConsultationNavigationTitle(): string {
  return getAiText("consultation:title", () => faker.commerce.productName());
}

export function generateConsultationNavigationDescription(): string {
  return getAiText("consultation:description", () => faker.lorem.sentence());
}
