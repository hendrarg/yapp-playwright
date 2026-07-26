export const creatorProfile = "hendrarg";

/** Creator with membership tiers for @AUT-FV-128 */
export const membershipCreatorProfile = "davidalfasunarna";

export const profileTabs = {
  shops: "Shops",
  links: "Links",
  feeds: "Feeds",
  support: "Support",
} as const;

export const profileLabels = {
  supportHeading: "Support Hendra Rizal Gunawan",
  sendTip: "Send Tip",
  inputTipPlaceholder: "Input tip amount here...",
  idr: "IDR",
  usdt: "USDT",
  membership: "Membership",
  showMore: "Show More",
  rewards: "Rewards",
  allFeeds: "All Feeds",
  exclusiveOnly: "Exclusive Only",
  memberOnly: "Member Only",
  openPostMedia: "Open post media",
  tipSuggestion: {
    idr: ["Rp12.000", "Rp50.000", "Rp200.000"],
  },
  tierPricePattern: "IDR",
} as const;

export const tipCheckoutData = {
  amount: "50000",
  displayAmount: "Rp50.000",
  currency: "IDR",
  creatorName: "Hendra Rizal",
  paymentMethod: "QRIS",
  publicNote: "AUT-FV-287 public note",
  privateNote: "AUT-FV-287 private note",
  votingOption: "Item A",
} as const;

export const tipAmountBoundary = {
  belowMinimum: "9999",
  minimum: "10000",
  minimumError: "Minimum amount is Rp10.000",
} as const;

export type ProfileTab = keyof typeof profileTabs;
