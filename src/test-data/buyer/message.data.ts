/** Buyer inbox (`/direct`) copy and card labels, verified on dev 2026-10-07. */
export const messageLabels = {
  composer: "Write a message...",
  send: "Send message",
  attach: "Attach media",
  composerHint: "Tip: Press Enter to send, Shift + Enter for new line",
  messageActions: "Message actions",
  emptyHeading: "Let's start the chat!",
  directoryHeading: "Your Subscribed Creators",
  directoryMessage: "Message",
  profileMessage: "Direct Message",
  readOnlyHeading: "You can't send a message right now",
  dmDisabledReason: "This person is not accepting messages right now. Your chat history is saved.",
  subscribersOnlyReason: "Messages only accept from subscribers. Your chat history is saved.",
  subscriptionEnded: (creator: string) => `Your subscription to ${creator} ended, resubscribe to keep chatting`,
  subscribe: "Subscribe",
  photoPreview: "You sent a photo",
  buyNow: "Buy Now",
  donateNow: "Donate Now",
  sendTip: (amount: string) => `Send Tip ${amount}`,
  campaignActive: "Active",
  membershipBadge: "Membership",
  memberOnly: "Member Only",
  subscribed: "Subscribed",
  subscribeNow: "Subscribe Now",
  unlockPost: "Unlock Post",
  selectMembershipDialog: "Select Membership to Unlock",
  myMemberships: "My Memberships",
  /** Bubble timestamps are 24-hour clock times. */
  time: /\d{1,2}:\d{2}/,
} as const;

/** The buyer composer's file input: images, and videos since 2026-10. */
export const buyerAttachAccept = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;

/** One tip request amount: the API takes the number, the card shows it in Rp. */
export const tipRequest = { amount: 25000, label: "Rp25.000" } as const;
