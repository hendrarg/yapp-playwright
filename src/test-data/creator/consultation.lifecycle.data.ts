import { faker } from "@faker-js/faker";
import { getAiText } from "@test-data/ai";

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
  return getAiText("consultation:title", () => faker.commerce.productName());
}

export function generateConsultationLifecycleDescription(): string {
  return getAiText("consultation:description", () => faker.lorem.sentence());
}

export function generateConsultationAfterSalesMessage(): string {
  return faker.lorem.sentence();
}

export function consultationWeekdayLabel(date = new Date()): string {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()];
}

/** Save/publish controls and modal copy across the create and edit flows. */
export const consultationPublishData = {
  createSaveControls: ["Create Consultation", "Save"],
  editSaveControls: ["Save as Draft", "Save and Publish"],
  firstPublish: { heading: "Product Complete", body: "Your product has been successfully created." },
  republish: { heading: "Your consultation is live!", body: "Your consultation is ready for bookings." },
} as const;
