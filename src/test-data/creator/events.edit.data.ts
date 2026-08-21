import { faker } from "@faker-js/faker";

export function generateEventsEditData() {
  return {
    baselineTitle: faker.commerce.productName(),
    baselineDescription: faker.lorem.sentence(),
    baselineVenue: faker.location.city(),
    baselineAddress: faker.location.streetAddress(),
    baselineTicketDescription: faker.lorem.sentence(),
    editedTitle: faker.commerce.productName(),
    editedDescription: faker.lorem.sentence(),
    editedVenue: faker.location.city(),
    editedAddress: faker.location.streetAddress(),
    baselineStartTime: "09:00",
    baselineEndTime: "10:00",
    editedStartTime: "14:00",
    editedEndTime: "15:00",
  } as const;
}
