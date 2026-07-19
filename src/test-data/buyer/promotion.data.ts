export type PurchaseProduct = {
  title: string;
  path: string;
  option?: string;
};

export const promotionData = {
  eligibleProduct: {
    title: 'Telebot',
    path: '/hendrarg/product/0vSgNJ49co',
    option: 'plan b',
  },
  creatorIneligibleProduct: {
    title: 'Test Discounted Product',
    path: '/geri/product/XJJwewhm_U',
  },
  invalid: [
    { label: 'nonexistent', code: 'ZZZ205206ZZ' },
    { label: 'expired', code: 'NOB4GFYHHHX' },
    { label: 'maximum-usage', code: 'GWA0AG3G' },
  ],
  creatorIneligible: {
    code: '27NZ6DYXETP',
    error: 'Invalid promo code',
  },
} as const;
