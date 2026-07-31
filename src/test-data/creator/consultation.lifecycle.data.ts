import { faker } from "@faker-js/faker";

/** Lifecycle / CRUD data for consultation (AUT-FV-024). */
export const consultationLifecycleData = {
  unsavedTitleSuffix: " u",
  savedTitleSuffix: " s",
  price: "10000",
  /** UI validation requires at least 1 hour; 0 keeps Save and Publish disabled. */
  minimumNoticeHours: 1,
  availabilityRangeLabel: "3 months",
  noSessionsCopy: /No sessions available right now/i,
} as const;

export function generateConsultationLifecycleTitle(): string {
  return faker.commerce.productName();
}

export function generateConsultationLifecycleDescription(): string {
  return faker.lorem.sentence();
}

export function generateConsultationAfterSalesMessage(): string {
  return faker.lorem.sentence();
}

export function consultationWeekdayLabel(date = new Date()): string {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()];
}
