import { faker } from '@faker-js/faker';

/** Creator Messages copy for one DM thread: report, delete chat and mark badges (verified 2026-10-16). */
export const creatorThreadLabels = {
  composer: 'Write a message...',
  actions: { markAdd: 'Add Mark Badge', markEdit: 'Edit Mark Badge', report: 'Report User', block: 'Block User', delete: 'Delete' },
  report: {
    helpHeading: "Help us understand what's going on.",
    reasons: ['Inappropriate Content and Message', 'Spam', 'Fake Account', 'Breach of Privacy', 'Order Dispute', 'Other'],
    pickFirst: 'Select at least one',
    submit: 'Report',
    detailsPlaceholder: 'Enter the details',
    submittedToast: 'Report submitted',
  },
  deleteChat: {
    dialog: 'Delete Chat',
    body: 'This chat history will be removed from your view, but your messages will still be visible to other participants.',
    cancel: 'Cancel',
    confirm: 'Delete',
  },
  mark: {
    dialog: 'Mark Member',
    labelSearch: 'Search for an option',
    done: 'Done',
    remove: 'Remove',
    markedToast: 'Member marked',
    removedToast: 'Mark removed',
    deleteLabelDialog: 'Delete label?',
    deleteLabelBody: 'This label will be removed from all buyers and cannot be undone.',
    deletedToast: 'Label deleted',
    colors: ['#972AF0', '#FF0090', '#0088FF', '#0DE8C4', '#69E80D', '#E8B90D', '#E80D0D', '#0D27E8'],
  },
} as const;

/**
 * A fresh mark label of exactly `length` characters (max 25). A label removed from a buyer can never be
 * applied to that buyer again (YAP-2007), so every run needs its own.
 */
export function generateMarkLabel(length = 25): string {
  return `qa${faker.string.alphanumeric({ length: length - 2, casing: 'lower' })}`;
}

/** Free text for a report's "Other" details and for the buyer's thread messages. */
export function generateThreadText(): string {
  return faker.lorem.sentence();
}
