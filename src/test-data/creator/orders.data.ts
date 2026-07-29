export const ordersFilterData = {
  productTypes: [
    "All Products",
    "Digital Download",
    "Online Course",
    "Discord Membership",
    "Consultations",
    "Events and Tickets",
    "Telegram Membership",
  ] as const,
  multiSelectTypes: ["Digital Download", "Telegram Membership"] as const,
  excludedWhenMultiSelect: ["Events and Tickets"] as const,
  timeRange: "Last 7 days",
  emptySearch: "zzz-no-match-aut-fv-187",
  emptyHeading: "Looks empty here",
  emptyHint: "Try changing your filters or showing all orders.",
};
