/**
 * Seeded QA-environment event with a guest list spanning multiple pages.
 * This product already exists in the shared dev environment (owned by the
 * QA Tester account) — it is not created by this suite, only read.
 */
export const eventsGuestsData = {
  seededEventProductUuid: "1a18e717-8fd7-4258-a95f-633eda8c72d7",
  seededEventTitle: "Mendaki gunung salak",
  guestTableColumns: ["Name", "Email", "Phone", "Status", "Checked-in Time", "Registered Time"] as const,
  filterStatusOptions: ["Active", "Used", "Cancelled"] as const,
  rowsPerPage: 10,
} as const;
