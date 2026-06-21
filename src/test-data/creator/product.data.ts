import { faker } from "@faker-js/faker";

export type ProductInput = {
  name: string;
  description: string;
  price: number;
  category: "digital" | "physical";
  stock?: number;
  tags?: string[];
};

// ── Static templates ─────────────────────────────────────────────

export const productTemplates = {
  digital: {
    name: "Digital E-Book",
    description: "A comprehensive digital guide",
    price: 29.99,
    category: "digital" as const,
  },
  physical: {
    name: "Premium T-Shirt",
    description: "High-quality cotton t-shirt",
    price: 49.99,
    category: "physical" as const,
  },
} as const;

// ── Factory ──────────────────────────────────────────────────────

export function generateProduct(overrides?: Partial<ProductInput>): ProductInput {
  return {
    name: faker.commerce.productName(),
    description: faker.commerce.productDescription(),
    price: parseFloat(faker.commerce.price({ min: 5, max: 200 })),
    category: faker.helpers.arrayElement(["digital", "physical"]),
    stock: faker.number.int({ min: 1, max: 100 }),
    tags: faker.helpers.multiple(() => faker.commerce.department(), { count: 3 }),
    ...overrides,
  };
}

// ── Edit data ────────────────────────────────────────────────────

export const productEditData = {
  newName: "Updated Product Name",
  newPrice: 39.99,
  newDescription: "Updated description for the product",
} as const;
