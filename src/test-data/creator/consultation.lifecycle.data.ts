import { faker } from "@faker-js/faker";

/** Lifecycle / CRUD data for consultation (AUT-FV-024). */
export const consultationLifecycleData = {
  titlePrefix: "AUT-FV-024",
  description: "Consultation lifecycle draft description",
  savedDescription: "Consultation lifecycle saved description",
  unsavedTitleSuffix: " unsaved-edit",
  savedTitleSuffix: " saved-edit",
  afterSalesMessageV1: "After sales message for future bookings v1",
  afterSalesMessageV2: "After sales message for future bookings v2",
  price: "10000",
  /** UI validation requires at least 1 hour; 0 keeps Save and Publish disabled. */
  minimumNoticeHours: 1,
  availabilityRangeLabel: "3 months",
  noSessionsCopy: /No sessions available right now/i,
} as const;

export function generateConsultationLifecycleTitle(
  prefix = consultationLifecycleData.titlePrefix,
): string {
  return `${prefix} ${faker.string.alphanumeric(8)}`;
}

export function consultationWeekdayLabel(date = new Date()): string {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()];
}
