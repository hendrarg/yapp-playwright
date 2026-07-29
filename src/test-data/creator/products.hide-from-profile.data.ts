import { creatorProfile } from "@test-data/buyer/profile.data";

/** Hide from Profile flow for Hendra-owned active product (AUT-FV-215). */
export const productsHideFromProfileData = {
  creatorHandle: creatorProfile,
  productName: "Sikancil",
  productTitle: "Sikancil",
  productPath: "/hendrarg/product/Vq1tn3yMA2",
  productUuid: "35b47697-fd89-4979-aced-85bc64f7e6b7",
  hideFromProfileButtonId: "hide-from-profile",
  hideFromProfileAction: "Hide from Profile",
  restoreVisibilityAction: "Restore Visibility",
} as const;
