/** `/referral` copy and the shapes the referral tests check. */
export const referralCopy = {
  codePattern: /^[A-Z0-9]{6}$/,
  /** The shared link is always the production creators host, whatever the environment. */
  linkPrefix: 'https://creators.yapp.ink/auth?c=',
  inviter: {
    steps: ['1. Share your link', '2. Your friend sign up', '3.Start earning'],
    reward: "Get rewarded with 1% commission when your fans or friends transact.",
  },
  referredBy: {
    title: 'Get 10% OFF Your Payout with a Referral!',
    body: "Want to save on your next payout? It's easy, use a referral link and get 10% OFF!",
    placeholder: 'Enter Referral Code',
    invalidMessage: 'Invalid referral code',
  },
  shareTargets: ['Facebook', 'Twitter', 'LinkedIn', 'WhatsApp', 'Telegram', 'Reddit'],
  shareText: 'Join me on Yapp.ink',
  columns: ['USER', 'DATE JOINED', 'COMMISSION IDR', 'COMMISSION USDT'],
  empty: { title: "You're so close to earning", hint: 'Get started today!' },
} as const;

/** Codes the Referred By field must refuse: unknown, too long, and a real code in lowercase. */
export const invalidReferralCodes = ['ZZZZZZ', 'ABC123456789'] as const;

/** Free-form input the field keeps verbatim (it has no maxlength and no sanitising). */
export const freeFormReferralInputs = ['abc def', '  PADDED  ', '#$%^&*'] as const;

/** Join dates for the two referrals the list tests attach to the creator (newest first in the list). */
export const referralJoinDates = {
  older: { at: '2026-09-01T03:00:00Z', label: '01 September 2026' },
  newer: { at: '2026-10-01T03:00:00Z', label: '01 October 2026' },
} as const;
