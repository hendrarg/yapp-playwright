import type { Page } from "@playwright/test";
import { locatorChain, smartLocator } from "@utils/heal-utils";

/**
 * Shared locators — imported by multiple page objects.
 *
 * Usage:
 *   import { inputByLabel, buttonByText } from "../shared/locators";
 *
 *   class MyPage {
 *     readonly nameInput = inputByLabel(this.page, "Name");
 *     readonly saveBtn   = buttonByText(this.page, "Save");
 *   }
 */

// ── Input / Field ────────────────────────────────────────────────

export const inputByLabel = (page: Page, label: string) => page.getByLabel(label);
export const inputByPlaceholder = (page: Page, text: string) => page.getByPlaceholder(text);
export const inputByTestId = (page: Page, testId: string) => page.getByTestId(testId);

// ── Button / Action ──────────────────────────────────────────────

export const buttonByText = (page: Page, name: string) => page.getByRole("button", { name });
export const buttonByTestId = (page: Page, testId: string) => page.getByTestId(testId);
export const linkByText = (page: Page, name: string) => page.getByRole("link", { name });

// ── Generic ──────────────────────────────────────────────────────

export const textByExact = (page: Page, text: string) => page.getByText(text, { exact: true });
export const elementByTestId = (page: Page, testId: string) => page.getByTestId(testId);

// ─── Toast / Notification ────────────────────────────────────────

export const toastMessage = (page: Page) => page.locator("[data-testid='toast'], .toast, [role='alert']");

// ── Product editor (shared across product-type create/edit pages) ─

export const titleInput = (page: Page) =>
  locatorChain(page, {
    role: "textbox",
    name: "Enter title",
    exact: true,
    placeholder: "Enter title",
    selector: 'input[placeholder="Enter title"]',
  });

export const nextSetDetailsAction = (page: Page) =>
  smartLocator(page, {
    role: "button",
    name: "Next: Set Details",
    text: "Next: Set Details",
    selector: 'button:has-text("Next: Set Details")',
  });

export const pricingSwitchAction = (page: Page) =>
  smartLocator(page, {
    role: "switch",
    name: "Add Pricing",
    selector: "#enable-pricing",
  });

export const boldAction = (page: Page) =>
  smartLocator(page, {
    role: "radio",
    name: "Bold",
    selector: '[role="radio"][aria-label="Bold"]',
  });

export const italicAction = (page: Page) =>
  smartLocator(page, {
    role: "radio",
    name: "Italic",
    selector: '[role="radio"][aria-label="Italic"]',
  });

export const underlineAction = (page: Page) =>
  smartLocator(page, {
    role: "radio",
    name: "Underline",
    selector: '[role="radio"][aria-label="Underline"]',
  });

export const italicApplied = (page: Page) =>
  smartLocator(page, {
    role: "radio",
    name: "Remove italic",
    selector: '[role="radio"][aria-label="Remove italic"]',
  });

export const underlineApplied = (page: Page) =>
  smartLocator(page, {
    role: "radio",
    name: "Remove underline",
    selector: '[role="radio"][aria-label="Remove underline"]',
  });

export const addQuestionsAction = (page: Page) =>
  smartLocator(page, {
    role: "button",
    name: "Add Questions",
    text: "Add Questions",
    selector: 'button:has-text("Add Questions")',
  });

export const createQuestionAction = (page: Page) =>
  smartLocator(page, {
    role: "button",
    name: "Create Question",
    text: "Create Question",
    selector: 'button:has-text("Create Question")',
  });

export const saveAsDraftAction = (page: Page) =>
  smartLocator(page, {
    role: "button",
    name: "Save as Draft",
    text: "Save as Draft",
    selector: 'button:has-text("Save as Draft")',
  });

export const addEmbedLinkAction = (page: Page) =>
  smartLocator(page, {
    role: "button",
    name: "Add Link",
    text: "Add Link",
    selector: 'button:has-text("Add Link")',
  });

export const embedLinkUrlInput = (page: Page) =>
  locatorChain(page, {
    role: "textbox",
    name: "https://placeyourlinkhere",
    exact: true,
    placeholder: "https://placeyourlinkhere",
    selector: 'input[type="url"]',
  });

export const embedLinkLabelInput = (page: Page) =>
  locatorChain(page, {
    role: "textbox",
    name: "Get My Latest Product",
    exact: true,
    placeholder: "Get My Latest Product",
    selector: 'input[placeholder="Get My Latest Product"]',
  });

export const embedLinkDoneButton = (page: Page) =>
  locatorChain(page, {
    role: "button",
    name: "Done",
    text: "Done",
    selector: 'button:has-text("Done")',
  });

export const textFeedback = (page: Page, message: string) =>
  locatorChain(page, {
    text: message,
    selector: `text="${message}"`,
  });

export const descriptionEditor = (page: Page) =>
  locatorChain(page, {
    role: "textbox",
    name: "editable markdown",
    selector: '[contenteditable="true"][role="textbox"]',
  }).first();

export const addQuestionDialog = (page: Page) =>
  page.getByRole("dialog", { name: "Add New Question" });

export const questionLabelInput = (page: Page) =>
  locatorChain(page, {
    role: "textbox",
    name: "Question Label",
    placeholder: "Enter your question...",
    selector: '[role="dialog"] input[placeholder="Enter your question..."]',
  });

export const afterSalesSection = (page: Page) => page.getByLabel("Details").or(page.locator("body"));

export const heroInput = (page: Page) =>
  page.locator('input[type="file"][accept*="image/jpeg"]:not([multiple])');

export const galleryInput = (page: Page) => page.locator('input[type="file"][multiple]');

export const productCompleteDialog = (page: Page) =>
  page.getByRole("dialog").filter({ hasText: /Product Complete|consultation is live/i });

export const priceInput = (page: Page) =>
  locatorChain(page, {
    placeholder: "10,000",
    selector: 'input[placeholder="10,000"]',
  });

export const livePreviewCard = (page: Page) =>
  page.getByRole("heading", { level: 3 }).locator("xpath=..");
