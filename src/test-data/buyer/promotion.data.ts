export type PurchaseProduct = {
  title: string;
  path: string;
  option?: string;
};

export const promotionData = {
  /** Reason shown under the voucher (and returned by POST /orders/quote/estimation as a 400). */
  rejection: {
    notFound: 'Promo code not found. Please check the code and try again.',
    expired: 'This promo code is no longer active.',
    usageLimit: 'This promo code has reached its usage limit.',
    notApplicable: 'This promo code does not apply to this product.',
  },
  /** Seeded course price; with the 11% promo the checkout reads Discount -Rp10.890 / Total Rp92.560. */
  coursePrice: 99000,
  activeDiscountPercent: 11,
} as const;
