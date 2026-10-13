export const productsStatusData = {
  tabs: ["Active", "Inactive", "Draft"] as const,
  rowStatusByTab: {
    Active: "ACTIVE",
    Inactive: "INACTIVE",
    Draft: "DRAFT",
  } as const,
  sampleProductByTab: {
    Active: "Ternak Uang",
    Inactive: "Zoom Meeting",
    Draft: "PERSIB",
  } as const,
} as const;

export type ProductStatusTab = (typeof productsStatusData.tabs)[number];

/** Actions menu for a non-event product. The same six items on Active, Inactive, and Draft. */
export const productRowActions = ["Set Inactive", "Hide from Profile", "Edit", "Share", "Hide", "Delete"] as const;
