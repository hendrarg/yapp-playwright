import { faker } from "@faker-js/faker";

// ── Cart items ───────────────────────────────────────────────────

export const cartItemTemplates = [
  { name: "Digital E-Book", price: 29.99, quantity: 1, type: "digital" as const },
  { name: "Premium T-Shirt", price: 49.99, quantity: 2, type: "physical" as const },
  { name: "Video Course", price: 99.99, quantity: 1, type: "digital" as const },
] as const;

export function generateCartItem(overrides?: Partial<{ name: string; price: number; quantity: number }>) {
  return {
    name: faker.commerce.productName(),
    price: parseFloat(faker.commerce.price()),
    quantity: faker.number.int({ min: 1, max: 5 }),
    ...overrides,
  };
}

// ── Checkout ─────────────────────────────────────────────────────

export const checkoutData = {
  shippingAddress: {
    street: "456 Buyer Street",
    city: "Bandung",
    state: "West Java",
    zip: "40115",
    country: "Indonesia",
  },
  note: "Leave at front desk",
} as const;

export function generateCheckoutData(overrides?: Partial<{
  note: string;
}>) {
  return {
    shippingAddress: {
      street: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state(),
      zip: faker.location.zipCode(),
      country: "Indonesia",
    },
    note: faker.lorem.sentence(),
    ...overrides,
  };
}

// ── Search / Explore ─────────────────────────────────────────────

export const searchQueries = {
  validProduct: "digital art",
  categoryFilter: "digital",
  emptyResult: "zzz_nonexistent_xyz",
} as const;

export const exploreFilters = {
  sortBy: ["newest", "popular", "price-asc", "price-desc"] as const,
  category: ["digital", "physical", "service", "all"] as const,
};
