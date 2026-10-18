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
  /** A member-only post a viewer is not entitled to (verified 2026-10-16). */
  subscribeToUnlock: "Subscribe to Unlock",
  unlockToComment: "Unlock post to add comments",
  openPostMedia: "Open post media",
  viewProducts: "View Products",
  nextImage: "Next image",
  previousImage: "Previous image",
  guestFollowingEmptyHeading: "You're not following anyone yet",
  guestFollowingEmptySubtext: "Follow creators to see their latest posts here",
  signInBeforeFollowing: "Sign in before following",
  signInNow: "Sign in now!",
  unlockPost: "Unlock Post",
  unlockNow: /Unlock Now/i,
  unlockPaymentDialog: "Unlock Exclusive Post",
  unlockPay: "Pay Rp",
  screenshotWarning: "Screenshot not allowed",
  screenshotWarningBody: "This content is protected.",
  screenshotWarningDismiss: "I Understand",
  writeComment: "Write your comment",
  back: "Back",
  postComment: "Post",
  openCommentActions: "Open comment actions",
  editComment: "Edit",
  deleteComment: "Delete",
  saveComment: "Save",
  cancelEditing: "Cancel editing",
  deleteCommentTitle: "Delete this comment?",
} as const;

/** A comment can only be edited this long after it was posted (toast otherwise). */
export const commentEditWindowMs = 60_000;

export type FeedsTab = keyof typeof feedsTabs;

export const scrollRounds = 3;
export const scrollDelayMs = 1200;

export function generateComment(): string {
  return faker.lorem.sentence();
}
/**
 * A hendrarg tier that Sundanese (token2) holds actively (expires 2027-03-16, verified 2026-10-15),
 * so a member-only post for it opens for that account without a purchase.
 */
export const memberTierFixture = {
  tierUuid: '83510a02-6d4f-4e5e-ad22-ad4a47d7e182',
  name: 'QA Tenure Fixture',
} as const;
