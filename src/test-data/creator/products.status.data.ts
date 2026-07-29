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
