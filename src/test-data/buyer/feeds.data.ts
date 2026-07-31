import { faker } from "@faker-js/faker";

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
  likePost: "Like post",
  unlikePost: "Unlike post",
  memberOnly: "Member Only",
  openPostMedia: "Open post media",
  guestFollowingEmptyHeading: "You're not following anyone yet",
  guestFollowingEmptySubtext: "Follow creators to see their latest posts here",
  signInBeforeFollowing: "Sign in before following",
  signInNow: "Sign in now!",
  unlockPost: "Unlock Post",
  writeComment: "Write your comment",
  back: "Back",
  postComment: "Post",
} as const;

export type FeedsTab = keyof typeof feedsTabs;

export const scrollRounds = 3;
export const scrollDelayMs = 1200;

export function generateComment(): string {
  return faker.lorem.sentence();
}