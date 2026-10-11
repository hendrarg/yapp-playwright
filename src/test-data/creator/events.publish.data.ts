import { creatorProfile } from "@test-data/buyer/profile.data";

/** Publish, draft, and preview-panel data for Events and Tickets (AUT-FV-316). */
export const eventsPublishData = {
  /** The completion meter only renders below this breakpoint (`md:hidden`). */
  mobileViewport: { width: 390, height: 844 },
  previewBadgeText: "Events and Tickets",
  /** The row action menu of an event product, in order. */
  rowActions: ["Set Inactive", "Hide from Profile", "Edit", "See Attendances", "Share", "Hide", "Delete"],
  canonicalProductUrlPattern: new RegExp(`/${creatorProfile}/product/[^/?#]+$`),
} as const;
