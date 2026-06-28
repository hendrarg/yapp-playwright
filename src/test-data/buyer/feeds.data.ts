export const feedsTabs = {
  following: "Following",
  yourPost: "Your Post",
  exclusive: "Exclusive",
} as const;

export const feedsLabels = {
  creatorsYouMightLike: "Creators you might like",
  follow: "Follow",
  following: "Following",
  unfollow: "Unfollow",
  memberOnly: "Member Only",
  openPostMedia: "Open post media",
} as const;

export type FeedsTab = keyof typeof feedsTabs;

export const scrollRounds = 3;
export const scrollDelayMs = 1200;