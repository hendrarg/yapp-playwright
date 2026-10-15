import { faker } from '@faker-js/faker';
import { getAiText } from '@test-data/ai';

export type PostVisibility = 'public' | 'pay_per_view' | 'exclusive' | 'membership_only';

export interface PostData {
  content: string;
  visibility: PostVisibility;
  price: number;
  isFlexiblePrice: boolean;
  productUuids: string[];
}

export const testImages = {
  claude: 'src/test-data/assets/claude.png',
  gemini: 'src/test-data/assets/gemini.png',
  gpt: 'src/test-data/assets/gpt.png',
  deepseek: 'src/test-data/assets/deepseek.png',
  hermes: 'src/test-data/assets/hermes.jpg',
  openclaw: 'src/test-data/assets/openclaw.png',
  qwen: 'src/test-data/assets/qwen.png',
  /**
   * Gallery fixtures: 600x600 solid colours, each with a marker block in a different
   * corner, so a carousel slide is identifiable in a trace. 600px clears the app's
   * "at least 500 x 500 pixels" rule, and each file is ~2 KB.
   */
  gallery1: 'src/test-data/assets/gallery-1.png',
  gallery2: 'src/test-data/assets/gallery-2.png',
  gallery3: 'src/test-data/assets/gallery-3.png',
} as const;

export const testVideos = {
  sample: 'src/test-data/assets/video.mp4',
} as const;

export function generatePostData(overrides?: Partial<PostData>): PostData {
  return {
    content: getAiText("post:content", () => faker.lorem.sentence()),
    visibility: 'public',
    price: 0,
    isFlexiblePrice: false,
    productUuids: [],
    ...overrides,
  };
}

/** Creator /feeds composer copy (verified 2026-10-06). */
export const creatorFeedsLabels = {
  composerPlaceholder: 'Post something here...',
  composerTitle: 'Create Post',
  visibilityPublic: 'Public',
  payPerView: 'Pay per view',
  priceDialogHeading: 'Pay per view price',
  confirmPrice: /^Confirm/,
  publish: 'Post',
  configureLifetime: 'Configure Lifetime',
  lifetimeDialog: 'Lifetime Configuration',
  lifetimeSwitch: 'Lifetime access',
  lifetimePriceLabel: 'Set lifetime price',
  minPriceHint: 'Min. price: Rp10.000',
  save: 'Save',
  selectProductDialog: 'Select Product',
  addProducts: /^Add \(\d+\) Products?$/,
  postMenuEdit: 'Edit',
  editDialog: 'Edit Post',
  editPrice: 'Edit Price',
  zeroPriceToast: 'Price must be greater than 0 for exclusive posts',
  publishedToast: 'Post published successfully',
  /** The PPV and lifetime price floors the forms state ("Min. price: Rp10.000"). */
  minPrice: 10000,
  // ── Post list, menus and dialogs (verified 2026-10-15) ──
  postOptions: 'Post options',
  tabs: { published: 'Published', draft: 'Draft', scheduled: 'Scheduled' },
  close: 'Close',
  saveDraftDialog: 'Save to Draft?',
  saveDraft: 'Save Draft',
  draftSavedToast: 'Draft saved successfully',
  draftPostsDialog: 'Draft Posts',
  publishDraftDialog: 'Publish Post',
  schedulePost: 'Schedule Post',
  scheduledToast: 'Post scheduled successfully',
  /** Composer and Edit Post say `Posting on 15 Oct 2026, 11:28 AM`; the Scheduled tab card says `Posted on` (L-15). */
  postingOn: 'Posting on',
  menu: { insights: 'Insights', edit: 'Edit', pin: 'Pin to top', unpin: 'Unpin', delete: 'Delete' },
  pinnedToast: 'Post pinned',
  pinnedLabel: 'Pinned',
  replacePinDialog: 'Replace pinned post?',
  replace: 'Replace',
  cancel: 'Cancel',
  deleteDialog: 'Delete Post',
  deleteWarning: "If you delete this post, you won't be able to restore it",
  deletePinnedNote: 'This post is pinned. Deleting it also removes it from the top of your Feeds.',
  insightsDialog: 'Insights',
  memberOnly: 'Member only',
  selectTierDialog: 'Select Membership Tier',
  confirm: 'Confirm',
  pastScheduleToast: 'Cannot schedule post with past date/time',
  /** Visibility radios with their descriptions, in menu order (verified 2026-10-15). */
  visibilityOptions: [
    'Public Visible to anyone on the platform.',
    'Pay per view Unlock access with a one-time payment.',
    'Member only Visible to your subscribers.',
  ],
  addProduct: 'Add product',
  /** The composer's media input: wider than product thumbnails (adds BMP and SVG), several files at once. */
  composerMediaAccept: 'image/jpeg,image/png,image/gif,image/webp,image/bmp,image/svg+xml,video/*',
} as const;

/** A schedule as the composer prints it: `15 Oct 2026, 11:28 AM` (local time). */
export function formatScheduleLabel(when: Date): string {
  const month = when.toLocaleString('en-US', { month: 'short' });
  const hour = ((when.getHours() + 11) % 12) + 1;
  const minutes = String(when.getMinutes()).padStart(2, '0');
  return `${when.getDate()} ${month} ${when.getFullYear()}, ${hour}:${minutes} ${when.getHours() >= 12 ? 'PM' : 'AM'}`;
}

/** A schedule `minutesAhead` from now, on a whole minute — the picker has no seconds. */
export function scheduleTimeAhead(minutesAhead: number): Date {
  const when = new Date(Date.now() + minutesAhead * 60_000);
  when.setSeconds(0, 0);
  return when;
}

/** Title of a course seeded to be linked to a post. */
export function generateLinkedProductTitle(): string {
  return `${faker.commerce.productName()} ${faker.string.alphanumeric(6)}`;
}

/** Post text for creator feeds tests — free text from the AI-aware factory, made unique per call. */
export function generatePostContent(): string {
  return `${getAiText('post:content', () => faker.lorem.sentence())} ${faker.string.alphanumeric(6)}`;
}
