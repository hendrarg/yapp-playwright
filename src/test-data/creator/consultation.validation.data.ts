/** Validation & boundary data for consultation create (AUT-FV-017). */

export const consultationValidationData = {
  createPath: /\/products\/create\/consultation/,
  titleRequiredError: "Title is required",
  descriptionCounterMax: "500 / 500",
  /** UI counter tracks words (not characters) toward a 500 limit. */
  descriptionWordsAtLimit: Array.from({ length: 500 }, (_, i) => `w${i}`).join(" "),
  descriptionOverflowWord: " overflowword",
  mandatoryFields: ["Your name", "Email", "Phone"] as const,
  customQuestions: ["Probe Q1", "Probe Q2", "Probe Q3", "Probe Q4", "Probe Q5"] as const,
  additionalQuestionsHeading: "Additional Questions | Max 5",
  afterSalesLinksLabel: "max. 3 links",
} as const;
