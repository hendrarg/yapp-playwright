import { faker } from "@faker-js/faker";

/** Ticket tier pricing / discount data for Events and Tickets create (AUT-FV-314). */
export const eventsTicketsData = {
  defaultTierName: (index: number) =>
    index === 0 ? "Ticket Name 1" : `Ticket name ${index + 1}`,
  currency: "IDR",
  rawPrice: "150000",
  formattedPrice: "150.000",
  zeroPrice: "0",
  quantity: "100",
  quantityHelper:
    "*this is the maximum quantity of tickets that can be sold for this ticket type",
  descriptionPlaceholder: "Describe this ticket type, its benefits, or access details",
  setDiscountLabel: "Set discount",
  discountTypes: ["%", "Rp"] as const,
  overPercentDiscount: "150",
  validPercentDiscount: "20",
  rpDiscountAmount: "20000",
  rpDiscountAtTicketPrice: "150000",
  percentDiscountError: "Percentage discount cannot exceed 100%",
  addAnotherTicketType: "+ Add Another Ticket Type",
  addAnotherTicketTypeText: "Add Another Ticket Type",
  previewZeroPricePattern: /IDR\s*0/,
  afterSalesOff: (name: string) =>
    `Off — buyers of ${name} get the default after-sales content below.`,
  afterSalesOn: (name: string) =>
    `On — buyers of ${name} get the message and links below instead of the default.`,
} as const;

export type EventsTicketDiscountType = (typeof eventsTicketsData.discountTypes)[number];

export function generateEventsTicketName(): string {
  return faker.commerce.productName();
}

export function generateEventsTicketDescription(): string {
  return faker.lorem.sentence();
}
