export const creatorProfileHandle = "hendrarg";

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

export type ProfileTab = keyof typeof profileTabs;