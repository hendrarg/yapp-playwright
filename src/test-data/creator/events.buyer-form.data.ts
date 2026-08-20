import { faker } from "@faker-js/faker";
import { consultationValidationData } from "@test-data/creator/consultation.validation.data";

/** Buyer-form copy and factories for Events and Tickets create (AUT-FV-313). */
export const eventsBuyerFormData = {
  additionalQuestionsHeading: consultationValidationData.additionalQuestionsHeading,
  emptyLabelError: "Question cannot be empty",
  inputTypes: ["Text", "Select", "Multi Select"] as const,
  optionalBadge: "Optional",
  requiredBadge: "Mandatory",
  addQuestionDialogTitle: "Add New Question",
  editQuestionDialogTitle: "Edit Question",
  createQuestionAction: "Create Question",
  updateQuestionAction: "Update Question",
  makeRequiredLabel: "Make this required",
  inputTypeLabel: "Input Type",
  questionLabel: "Question Label",
  placeholderLabel: "Placeholder",
  cancelAction: "Cancel",
} as const;

export type EventsBuyerQuestionInputType = (typeof eventsBuyerFormData.inputTypes)[number];

export function generateEventsBuyerQuestionLabel(): string {
  return faker.lorem.words(3);
}

export function generateEventsBuyerQuestionLabels(count: number): string[] {
  const labels = new Set<string>();
  while (labels.size < count) {
    labels.add(generateEventsBuyerQuestionLabel());
  }
  return [...labels];
}

export function generateEventsBuyerQuestionOption(): string {
  return faker.commerce.productAdjective();
}

export function generateEventsBuyerQuestionOptions(count: number): string[] {
  const options = new Set<string>();
  while (options.size < count) {
    options.add(generateEventsBuyerQuestionOption());
  }
  return [...options];
}
