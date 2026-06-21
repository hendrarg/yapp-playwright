import { faker } from "@faker-js/faker";

// ── Address ──────────────────────────────────────────────────────

export const addressTemplate = {
  street: "123 Test Street",
  city: "Jakarta",
  state: "DKI Jakarta",
  zip: "12345",
  country: "Indonesia",
} as const;

export function generateAddress(overrides?: Partial<typeof addressTemplate>) {
  return {
    street: faker.location.streetAddress(),
    city: faker.location.city(),
    state: faker.location.state(),
    zip: faker.location.zipCode(),
    country: "Indonesia",
    ...overrides,
  };
}

// ── Contact ──────────────────────────────────────────────────────

export const contactTemplate = {
  phone: "+6281234567890",
  fullName: "John Doe",
  email: "john@test.com",
} as const;

export function generateContact(overrides?: Partial<typeof contactTemplate>) {
  return {
    phone: faker.phone.number(),
    fullName: faker.person.fullName(),
    email: faker.internet.email(),
    ...overrides,
  };
}

// ── Payment ──────────────────────────────────────────────────────

export const paymentTemplate = {
  cardName: "John Doe",
  cardNumber: "4111111111111111",
  expiryMonth: "12",
  expiryYear: "2028",
  cvv: "123",
} as const;

// ── Form text ────────────────────────────────────────────────────

export const formLabels = {
  name: "Name",
  email: "Email",
  phone: "Phone",
  password: "Password",
  confirmPassword: "Confirm Password",
  save: "Save",
  cancel: "Cancel",
  delete: "Delete",
  submit: "Submit",
} as const;
