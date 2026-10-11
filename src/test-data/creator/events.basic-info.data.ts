import { faker } from "@faker-js/faker";

/** Step 1 (Basic Info, Schedule, Location) data for Events and Tickets. */
export const eventsBasicInfoData = {
  /** Inline errors after `Next: Set Details` on an untouched Step 1 (On-site is the default location). */
  emptyStep1Errors: [
    "Title is required",
    "Description is required",
    "Event date is required",
    "Start time is required",
    "Venue name is required",
    "Venue address is required",
  ],
  /** The time picker lists every 15-minute slot of the day, none disabled. */
  timeSlotCount: 96,
  /** An end time before the start rewrites the start to one hour earlier, and vice versa. */
  timeAutoCorrection: {
    start: "14:00",
    earlierEnd: "12:00",
    correctedStart: "11:00",
    laterStart: "20:00",
    correctedEnd: "21:00",
  },
  platformOptions: ["Google Meet", "Custom"],
  invalidMeetingLink: "not-a-valid-url",
  invalidMeetingLinkError: "Invalid URL",
  validMeetingLink: "https://zoom.us/j/1234567890",
  overlongTitleLength: 556,
  descriptionToolbar: ["Bold", "Italic", "Underline", "Bulleted list", "Numbered list", "Block type", "Insert image", "Insert YouTube video", "Create link"],
  defaultTimezone: "Jakarta (GMT+07:00)",
  timezonePicker: { label: "Jakarta (GMT+07:00)", options: 112, searchPlaceholder: "Search timezone..." },
  /** 72 characters, 14 words: the counter should read characters. */
  counterSample: "Live QA test event for validating the Event and Tickets end to end flow.",
  timedSchedule: { start: "09:00", end: "17:00" },
  meetingLinkRequiredError: "Meeting link is required",
  detailsSections: ["Thumbnail", "Buyer Form", "Ticket Configuration", "After Sales"],
  allDayText: "All Day",
  /** Google Meet links are generated on save, through the creator's Google Calendar. */
  generatedMeetLinkPattern: /^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/,
  mapsHrefPattern: /google\.com\/maps\/search/,
  eventStatusPattern: /Event start in \d+ days? : \d+h : \d+m|Event has started|Event is ongoing/,
} as const;

const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const longMonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** The creator picker reads `31 October 2026`; the buyer page shows the same day as `31 Oct`. */
export function buyerEventDatePattern(creatorDateText: string): RegExp {
  const [day, month] = creatorDateText.trim().split(" ");
  return new RegExp(`\\b${Number(day)} ${shortMonths[longMonths.indexOf(month)]}\\b`);
}

export function generateEventsVenue() {
  return { name: faker.location.city(), address: faker.location.streetAddress() };
}
