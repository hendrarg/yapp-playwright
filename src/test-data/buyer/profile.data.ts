export type CreatorProfileContext = {
  handle: string;
  displayName: string;
  bioTags: readonly string[];
  supportHeading: string;
  tierPricePattern: string;
  tipSuggestions: { idr: readonly string[] };
};

export const creatorProfiles = {
  hendrarg: {
    handle: "hendrarg",
    displayName: "Hendra Rizal",
    bioTags: ["Software Developer", "Tester"],
    supportHeading: "Support Hendra Rizal",
    tierPricePattern: "IDR",
    tipSuggestions: { idr: ["Rp12.000", "Rp50.000", "Rp200.000"] },
  },
  davidalfasunarna: {
    handle: "davidalfasunarna",
    displayName: "David Alfa Sunarna",
    bioTags: [],
    supportHeading: "Support David Alfa Sunarna",
    tierPricePattern: "IDR",
    tipSuggestions: { idr: [] },
  },
} as const satisfies Record<string, CreatorProfileContext>;

export function resolveCreatorProfile(handle: string): CreatorProfileContext {
  return creatorProfiles[handle as keyof typeof creatorProfiles] ?? {
    handle,
    displayName: handle,
    bioTags: [],
    supportHeading: `Support ${handle}`,
    tierPricePattern: "IDR",
    tipSuggestions: { idr: [] },
  };
}

export const creatorProfile = creatorProfiles.hendrarg.handle;
export const membershipCreatorProfile = creatorProfiles.davidalfasunarna.handle;

export const profileTabs = {
  shops: "Shops",
  links: "Links",
  feeds: "Feeds",
  support: "Support",
} as const;

/** Shared profile UI copy — not creator-specific */
export const profileLabels = {
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
  unlockPost: "Unlock Post",
  openPostMedia: "Open post media",
  tierPricePattern: "IDR",
  share: "Share",
  back: "Back",
  follow: "Follow",
  likePost: "Like post",
  unlikePost: "Unlike post",
  signInNow: "Sign in now!",
  signInBeforeFollowing: "Sign in before following",
  signIn: "Sign In",
  noCommentsYet: "No comments yet.",
  signInToComment: "Sign in to drop a comment!",
  guestCommentSignInHeading: "Got something to say?",
  postImageModal: "Post image modal",
} as const;

export const tipLabels = {
  sendTip: "Send Tip",
  inputAmount: "Input Amount",
  yourName: "Your Name or Nickname",
  yourEmail: "Your Email",
  sendAnonymous: "Send as Anonymous",
  giveNotes: "Notes can be seen by public",
  privateNotes: "Notes can only be seen by creator",
  detailTransactions: "Detail Transactions",
  subtotal: "Subtotal",
  total: "Total",
  agreementPrefix: "With this, I declare that this transaction",
} as const;

export const tipCheckoutData = {
  amount: "50000",
  displayAmount: "Rp50.000",
  currency: "IDR",
  usdtCurrency: "USDT",
  usdtAmount: "50",
  usdtDisplayAmount: "USD 50",
  creatorName: "Hendra Rizal",
  paymentMethod: "QRIS",
  publicNote: "AUT-FV-287 public note",
  privateNote: "AUT-FV-287 private note",
  votingOption: "Item A",
} as const;

export const tipAmountBoundary = {
  belowMinimum: "9999",
  minimum: "10000",
  requiredError: "Amount is required",
  minimumError: "Minimum amount is Rp10.000",
} as const;

export type ProfileTab = keyof typeof profileTabs;
