/** Availability-tab data for Consultation (weekly schedule, presets, buffer, reschedule, timezone). */
export const consultationAvailabilityData = {
  weekdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  /** One start and one end control per day once every day has a range. */
  weeklyTimeControls: 14,
  /** Every 15-minute slot of the day, 00:00 to 23:45. */
  timeOptionCount: 96,
  dayRange: ["09:00", "17:00"],
  eveningRange: ["18:00", "19:00"],
  availabilityRangeOptions: ["2 weeks", "1 month", "3 months", "6 months", "1 year"],
  defaultAvailabilityRange: "3 months",
  durationOptions: ["15 minutes", "30 minutes", "45 minutes", "1 hour", "1.5 hours", "2 hours"],
  defaultDuration: "1 hour",
  noticeUnits: ["Minutes", "Hours", "Days"],
  bufferOptions: ["5 minutes", "10 minutes", "15 minutes", "30 minutes", "1 hour"],
  defaultBuffer: "5 minutes",
  rescheduleDays: 2,
  timezone: "Jakarta (GMT+07:00)",
  /**
   * 1 hour sessions plus 5 minutes before and after: 70 minutes apart inside 09:00–17:00, the 16:00
   * slot ending exactly at 17:00, then the 18:00–19:00 evening range.
   */
  bufferedMondaySlots: ["09:00", "10:10", "11:20", "12:30", "13:40", "14:50", "16:00", "18:00"],
} as const;

/** The first given weekday (0 = Sunday … 6 = Saturday) at least a week out, clear of any notice window. */
export function weekdayAtLeastAWeekAhead(weekday: number, from = new Date()): Date {
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 7);
  while (date.getDay() !== weekday) date.setDate(date.getDate() + 1);
  return date;
}

/** Booking-rule data: notice, range and frequency, checked against a guest booking a free slot. */
export const consultationBookingRulesData = {
  morningRange: ["09:00", "12:00"],
  defaultNotice: { value: 12, unit: "Hours", min: 0 },
  notice: { value: 3, unit: "Days" },
  range: "2 weeks",
  frequencyPeriods: ["Per Day", "Per Week", "Per Month"],
  frequencyLimit: 1,
  noAvailabilityError: "At least one day must have availability",
  bookedSlot: "09:00",
  /** Days from today: inside the 3-day notice, bookable, and past the 2-week range. */
  insideNoticeDays: 1,
  bookableDays: 8,
  beyondRangeDays: 20,
} as const;

export function daysFromToday(days: number, from = new Date()): Date {
  return new Date(from.getFullYear(), from.getMonth(), from.getDate() + days);
}

/** Editing a consultation that already has a booking, then pausing new bookings. */
export const consultationLifecycleRulesData = {
  originalRange: ["09:00", "12:00"],
  movedRange: ["13:00", "15:00"],
  movedSlots: ["13:00", "14:00"],
  bookedSlot: "09:00",
  pauseConfirmCopy: "Scheduled sessions will still run as planned.",
} as const;

export const weekdayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

/** Buffer, reschedule copy, frequency period and timezone data. */
export const consultationScheduleOptionsData = {
  frequencyPeriod: "Per Week",
  timezonePicker: { label: "Jakarta (GMT+07:00)", options: 112, searchPlaceholder: "Search timezone...", search: "Tokyo" },
  checkoutTimezone: "In your local timezone, Asia/Jakarta (GMT +7:00)",
  checkoutOffset: /consultationStartTime=[^&]*%2B07%3A00/,
  rescheduleDays: 1,
} as const;
