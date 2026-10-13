export const promotionsPricingData = {
  percentageDiscount: 10,
  fixedDiscount: 5000,
  voucherCodePattern: /^[A-Z0-9]{6,}$/,
  /** Percentage cap is enforced by the API on submit (500 + toast), not while typing. */
  percentageOverCap: 150,
  percentageCap: 100,
  overCapReason: "percentage discount must be at most 100",
  /** 0 reaches the API and is refused (400 "Discount is required"); a negative value never leaves the form. */
  zeroDiscount: 0,
  zeroDiscountReason: "validation failed",
  negativeDiscount: -5,
  negativeDiscountMessage: "Discount must be a positive number",
  /** How many regenerations to compare for a consistent code length (L-55). */
  codeRefreshes: 6,
} as const;
