import { creatorProfile } from "@test-data/buyer/profile.data";

/** Publish, draft, and preview-panel data for Events and Tickets (AUT-FV-316). */
export const eventsPublishData = {
  /** The completion meter only renders below this breakpoint (`md:hidden`). */
  mobileViewport: { width: 390, height: 844 },
  previewBadgeText: "Events and Tickets",
  canonicalProductUrlPattern: new RegExp(`/${creatorProfile}/product/[^/?#]+$`),
} as const;
