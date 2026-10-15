/** Creator Orders (`/orders`) copy and filter options, verified on dev 2026-10-07. */
export const ordersFilterData = {
  /** Product filter options, in order. "Digital Product" joined the list in Oct 2026. */
  productTypes: [
    "All Products",
    "Digital Product",
    "Digital Download",
    "Online Course",
    "Discord Membership",
    "Consultations",
    "Events and Tickets",
    "Telegram Membership",
  ] as const,
  /** Two types whose checkboxes are independent (Digital Product/Download/Online Course are coupled). */
  multiSelectTypes: ["Telegram Membership", "Discord Membership"] as const,
  multiSelectApiTypes: ["telegram_membership", "discord_membership"] as const,
  timeRanges: ["All Time", "Last 7 days", "Last 14 days", "Last 30 days", "Last 60 days"] as const,
  customDate: "Custom Date",
  timeRange: "Last 30 days",
  timeRangeDays: 30,
  narrowRange: "Last 60 days",
  pagingRange: "Last 14 days",
  pagingRangeDays: 14,
  emptySearch: "zzz-no-match-orders",
  emptyHeading: "Looks empty here",
  emptyHint: "Try changing your filters or showing all orders.",
};

/** Overview cards and the zero-order state of a creator with no sales. */
export const ordersOverview = {
  lifetime: "Lifetime Earnings",
  allTime: "All time earnings",
  periodEarnings: (days: number) => `${days} days earnings`,
  noOrdersHeading: "Start earning by selling your product",
  noOrdersHint: "Get started today!",
  createProduct: "Create Product",
} as const;

/** Product type badge on an order row / detail, keyed by the API `productType`. */
export const orderTypeLabels: Record<string, string> = {
  digital_download: "Digital Download",
  digital_product: "Digital Product",
  online_course: "Online Course",
  discord_membership: "Discord Membership",
  telegram_membership: "Telegram Membership",
  appointment: "Consultation",
  ticket_event: "Events & Tickets",
};

/** Order Details labels. */
export const orderDetailLabels = {
  customer: "Customer Details",
  paymentMethod: "Payment Method",
  purchaseDate: "Purchase Date",
  revenue: "Revenue",
  productPrice: "Product Price",
  promoCodeDiscount: "Promo Code Discount",
  subtotal: "Subtotal",
  receivedBySeller: "Received By Seller",
} as const;

/** Orders CSV export dialog options and headers. */
export const ordersExportData = {
  options: ["30 days", "60 days", "90 days", "Custom Days"] as const,
  presets: ["30 days", "60 days", "90 days"] as const,
  expectedHeaders: [
    "Order ID",
    "Asset Name",
    "Product ID",
    "Product Name",
    "Payment Method",
    "Price Paid By Buyer",
    "Received By Seller",
    "Purchase Date (UTC)",
    "Buyer Email",
    "Buyer Name",
    "Buyer Phone Number",
  ] as const,
  productHeaders: ["Asset Name", "Product ID", "Product Name", "Product Type"] as const,
  /** Badge labels the list shows; the CSV `Product Type` column uses the same words (OM-8). */
  productTypeLabels: ["Consultation", "Digital Product", "Online Course", "Digital Download", "Events and Tickets", "Discord Membership", "Telegram Membership"] as const,
  buyerHeaders: ["Buyer Email", "Buyer Name", "Buyer Phone Number"] as const,
  paymentHeaders: ["Payment Method", "Price Paid By Buyer", "Received By Seller"] as const,
  promoHeaders: ["Promo Code Name", "Promo Code Discount"] as const,
  affiliateHeaders: [
    "Commission ID",
    "Affiliator Username",
    "Affiliator Name",
    "Public Affiliate Username",
    "Public Affiliate Name",
    "Public Affiliate Commission Amount",
  ] as const,
};
