export const productsSearchData = {
  nameQuery: "Sikancil",
  excludedName: "Telebot",
  restoredNames: ["Sikancil", "Telebot"] as const,
  emptyQuery: "zzz-no-product-match-aut-fv-212",
  emptyHeading: "Start earning by selling your product",
  emptyHint: "Get started today!",
  /** Observed 2026-07-29: shop products API filters via title= only; URL/slug queries return empty. */
  urlSearchSupported: false,
} as const;
