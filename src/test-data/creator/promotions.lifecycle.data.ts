export const promotionsLifecycleData = {
  initialDiscount: 10,
  updatedDiscount: 15,
  /** A second edit, to show the next redemption picks up the newest configuration. */
  reconfiguredDiscount: 20,
  inactiveToast: "Promo set to inactive",
  /** Shown when a search matches nothing — the same copy as an empty promo list. */
  emptyState: "You haven't set any promo code",
  actions: ["Set Inactive", "Edit", "Delete"],
  status: { active: "Active", inactive: "Inactive", expired: "Expired", notStarted: "Not Started" },
  /** Create, edit and delete each toast a success message (create: `Promo code created successfully`; L-52 fixed 2026-10-12). */
  successToast: /success/i,
} as const;

/** Guest buyer details for a promo order paid through the dev deposit webhook. */
export function generatePromotionBuyer() {
  return { name: "Promo Buyer", email: `qa.promo.${Date.now()}@yopmail.com`, phone: "81234567890" };
}
