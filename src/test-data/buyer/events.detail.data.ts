import { faker } from "@faker-js/faker";
import { eventsMediaData, generateEventsDescription, generateEventsTitle } from "@test-data/creator/events.media.data";
import { generateEventsTicketDescription, generateEventsTicketName } from "@test-data/creator/events.tickets.data";

/** Stable shared-dev event fixtures used by AUT-FV-319. */
export const buyerEventsDetailData = {
  exploreFilter: {
    label: "Events and Tickets",
    query: "ticket_event",
  },
  discountedEvent: {
    path: "/geri/product/o2Slv6ZlQf",
    title: "GoTC Youth Conference",
    creator: "geri",
    datePattern: /Saturday 26 Sept/,
    timePattern: /07:00 - 16:00/,
    countdownPattern: /Event start in \d+ days? : \d+h : \d+m/,
    venue: "Nusantara Hall, ICE BSD CITY",
    address: "Jl. BSD Grand Boulevard No.1",
    mapsHref: /google\.com\/maps\/search\/\?api=1&query=Nusantara%20Hall%2C%20ICE%20BSD%20CITY%20Jl\.%20BSD%20Grand%20Boulevard%20No\.1/,
    cardPricePattern: /Rp130\.500.*Rp145\.000/,
    tierPricePattern: /IDR130,500\s*\/per pax/,
    originalPrice: 145000,
    discountPercent: 10,
    discountedPrice: 130500,
  },
  carouselEvent: {
    path: "/geri/product/X7pCTrW5_p",
    title: "Test New Ticket UI Nama",
    creator: "geri",
    slideCount: 3,
    soldOutTier: "VVIP",
    availableTier: "Early Bird",
    soldOutPricePattern: /IDR100,000\s*\/per pax/,
    availablePricePattern: /IDR50,000\s*\/per pax/,
    quantityPattern: /Max 100 tix\/user/,
  },
  hybridEvent: {
    path: "/iyansr/product/Y80qneWf54",
    title: "Hybrid Check",
    creator: "Iyan Saputraaaaaaaaaaa",
    datePattern: /Monday 31 Aug/,
    allDayText: "All Day",
    venue: "GBK",
    address: "Jakarta",
    platform: "Google Meet",
    meetingLinkNotice: "The Meeting link sent after booking",
    onlineTier: "Onlinee",
    offlineTier: "Offline",
  },
  ownerEvent: {
    path: "/hendrarg/product/PgpEmiRMdU",
    title: "Mendaki gunung salak",
  },
  checkout: {
    heading: "Checkout",
    contactNamePlaceholder: "Enter your name",
    phonePlaceholder: "Enter phone number",
    emailPlaceholder: "Enter email address",
    invalidPhone: "123",
    validPhone: "81234567890",
    cartAttendeePhone: "6281234567890",
    attendeeName: "hendrarg",
    attendeeEmail: "jendraljohn92@gmail.com",
    phoneError: "Phone number must be 10-15 digits long",
    attendeeDetailsHeading: "Attendee Details",
    useContactDetails: "Use with contact detail",
    subtotalLabel: "Subtotal (1 ticket)",
    subtotalAmount: "Rp10.000",
    productAddedHeading: "Product Added",
    seeCartAction: "See Cart",
    recommendationsHeading: "You Might Also Like!",
    cartTotal: "IDR 10.000",
  },
  eventBadge: "Events and Tickets",
  overviewTab: "Overview",
  aboutCreatorTab: "About Creator",
  detailHeading: "Product Detail",
  ticketDetailHeading: "Ticket Detail",
  editProductAction: "Edit Product",
  addToCartAction: "Add To Cart",
  selectTicketAction: "Select Ticket",
} as const;

function formatEventDate(date: Date): string {
  return `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function generateBuyerEventSeedData() {
  const today = new Date();
  const eventDate = addDays(today, 14);
  const periodStart = addDays(today, -1);
  const periodEnd = addDays(today, 7);

  return {
    title: generateEventsTitle(),
    description: generateEventsDescription(),
    thumbnailImagePath: eventsMediaData.heroImagePath,
    eventDate: formatEventDate(eventDate),
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    timezone: "Asia/Jakarta",
    venueType: "hybrid" as const,
    venueName: faker.location.city(),
    venueAddress: faker.location.streetAddress(),
    platform: "custom" as const,
    meetingLink: "https://meet.google.com/test-event-link",
    onlineTier: {
      title: generateEventsTicketName(),
      description: generateEventsTicketDescription(),
      price: 10000,
      maxQuantity: 100,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      venueType: "online" as const,
    },
    offlineTier: {
      title: generateEventsTicketName(),
      description: generateEventsTicketDescription(),
      price: 20000,
      maxQuantity: 100,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      venueType: "on_site" as const,
    },
  };
}

const eventMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];
const eventWeekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function displayEventDate(date: Date): string {
  return `${eventWeekdays[date.getDay()]} ${date.getDate()} ${eventMonths[date.getMonth()]}`;
}

function generateUniqueEventTitle(): string {
  return `${generateEventsTitle()} ${faker.string.alphanumeric(8)}`;
}

export function generateBuyerEventDiscoverySeedData() {
  const today = new Date();
  const eventDate = addDays(today, 14);
  const activePeriodStart = addDays(today, -7).toISOString();
  const activePeriodEnd = addDays(today, 7).toISOString();
  const expiredPeriodStart = addDays(today, -14).toISOString();
  const expiredPeriodEnd = addDays(today, -1).toISOString();
  const timedVenue = `${faker.location.streetAddress()}, ${faker.location.city()}`;
  const timedAddress = faker.location.streetAddress();
  const carouselVenue = faker.location.city();
  const carouselAddress = faker.location.streetAddress();
  const hybridVenue = faker.location.city();
  const hybridAddress = faker.location.streetAddress();

  return {
    thumbnailImagePath: eventsMediaData.heroImagePath,
    timedEvent: {
      title: generateUniqueEventTitle(),
      description: generateEventsDescription(),
      eventDate: formatEventDate(eventDate),
      dateLabel: displayEventDate(eventDate),
      timeStart: "07:00",
      timeEnd: "16:00",
      venueName: timedVenue,
      venueAddress: timedAddress,
      ticket: {
        title: generateEventsTicketName(),
        description: generateEventsTicketDescription(),
        price: 145000,
        maxQuantity: 100,
        periodStart: activePeriodStart,
        periodEnd: activePeriodEnd,
        venueType: "on_site" as const,
        isSetDiscount: true,
        discount: 10,
        discountType: "percentage" as const,
      },
    },
    carouselEvent: {
      title: generateUniqueEventTitle(),
      description: generateEventsDescription(),
      eventDate: formatEventDate(eventDate),
      venueName: carouselVenue,
      venueAddress: carouselAddress,
      slideCount: 3,
      soldOutTier: {
        title: generateEventsTicketName(),
        description: generateEventsTicketDescription(),
        price: 100000,
        maxQuantity: 100,
        periodStart: expiredPeriodStart,
        periodEnd: expiredPeriodEnd,
        venueType: "on_site" as const,
      },
      availableTier: {
        title: generateEventsTicketName(),
        description: generateEventsTicketDescription(),
        price: 50000,
        maxQuantity: 100,
        periodStart: activePeriodStart,
        periodEnd: activePeriodEnd,
        venueType: "on_site" as const,
      },
    },
    hybridEvent: {
      title: generateUniqueEventTitle(),
      description: generateEventsDescription(),
      eventDate: formatEventDate(eventDate),
      dateLabel: displayEventDate(eventDate),
      allDayText: "All Day",
      venueName: hybridVenue,
      venueAddress: hybridAddress,
      platform: "Online",
      meetingLinkNotice: "The Meeting link sent after booking",
      onlineTier: {
        title: generateEventsTicketName(),
        description: generateEventsTicketDescription(),
        price: 10000,
        maxQuantity: 100,
        periodStart: activePeriodStart,
        periodEnd: activePeriodEnd,
        venueType: "online" as const,
      },
      offlineTier: {
        title: generateEventsTicketName(),
        description: generateEventsTicketDescription(),
        price: 20000,
        maxQuantity: 100,
        periodStart: activePeriodStart,
        periodEnd: activePeriodEnd,
        venueType: "on_site" as const,
      },
    },
    ownerEvent: {
      title: generateUniqueEventTitle(),
      description: generateEventsDescription(),
      eventDate: formatEventDate(eventDate),
      ticket: {
        title: generateEventsTicketName(),
        description: generateEventsTicketDescription(),
        price: 10000,
        maxQuantity: 100,
        periodStart: activePeriodStart,
        periodEnd: activePeriodEnd,
        venueType: "online" as const,
      },
    },
  };
}
