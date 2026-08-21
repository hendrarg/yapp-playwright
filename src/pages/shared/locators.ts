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
  locatorChain(page, {
    role: "dialog",
    name: "Add New Question",
    selector: '[role="dialog"][data-slot="dialog-content"]:has-text("Add New Question")',
  });

export const editQuestionDialog = (page: Page) =>
  locatorChain(page, {
    role: "dialog",
    name: "Edit Question",
    selector: '[role="dialog"][data-slot="dialog-content"]:has-text("Edit Question")',
  });

export const questionLabelInput = (page: Page) =>
  locatorChain(page, {
    role: "textbox",
    name: "Question Label",
    placeholder: "Enter your question...",
    selector: '[role="dialog"] input[placeholder="Enter your question..."]',
  });

export const questionPlaceholderInput = (page: Page) =>
  locatorChain(page, {
    role: "textbox",
    name: "Placeholder",
    placeholder: "Enter placeholder text...",
    selector: '[role="dialog"] input[placeholder="Enter placeholder text..."]',
  });

export const questionInputTypeCombobox = (page: Page) =>
  page
    .getByRole("dialog")
    .getByRole("combobox")
    .filter({ hasText: /^(Text|Select|Multi Select)$/ })
    .or(
      page
        .locator('[role="dialog"] [data-slot="select-trigger"]')
        .filter({ hasText: /^(Text|Select|Multi Select)$/ }),
    );

export const questionInputTypeOption = (page: Page, name: string) =>
  page
    .getByRole("listbox")
    .getByRole("option", { name, exact: true })
    .or(
      page
        .locator('[role="listbox"] [role="option"][data-slot="select-item"]')
        .filter({ hasText: new RegExp(`^${name}$`) }),
    );

export const questionOptionInput = (page: Page, index: number) =>
  locatorChain(page, {
    role: "textbox",
    name: `Option ${index}`,
    label: `Option ${index}`,
    selector: `[role="dialog"] input[aria-label="Option ${index}"]`,
  });

export const addOptionAction = (page: Page) =>
  smartLocator(page, {
    role: "button",
    name: "Add Option",
    text: "Add Option",
    selector: '[role="dialog"] button:has-text("Add Option")',
  });

export const makeQuestionRequiredCheckbox = (page: Page) =>
  locatorChain(page, {
    role: "checkbox",
    name: "Make this required",
    label: "Make this required",
    selector: '[role="dialog"] [role="checkbox"]',
  });

export const emptyQuestionLabelFeedback = (page: Page) =>
  locatorChain(page, {
    text: "Question cannot be empty",
    selector: '[role="dialog"] [data-slot="form-message"]:has-text("Question cannot be empty")',
  });

export const updateQuestionAction = (page: Page) =>
  locatorChain(page, {
    role: "button",
    name: "Update Question",
    text: "Update Question",
    selector: '[role="dialog"] button:has-text("Update Question")',
  });

export const cancelQuestionAction = (page: Page) =>
  locatorChain(page, {
    role: "button",
    name: "Cancel",
    text: "Cancel",
    selector: '[role="dialog"] button:has-text("Cancel")',
  });

export const addQuestionsButton = (page: Page) =>
  locatorChain(page, {
    role: "button",
    name: "Add Questions",
    text: "Add Questions",
    selector: 'button:has-text("Add Questions")',
  });

export const additionalQuestionsHeading = (page: Page) =>
  locatorChain(page, {
    role: "heading",
    name: "Additional Questions | Max 5",
    text: "Additional Questions | Max 5",
  });

export const createQuestionButton = (page: Page) =>
  locatorChain(page, {
    role: "button",
    name: "Create Question",
    text: "Create Question",
    selector: '[role="dialog"] button:has-text("Create Question")',
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

/**
 * The product live-preview card, whose only `h3` is the product title. Browser-verified
 * to resolve to the same single element as the previous `xpath=..` parent step.
 */
export const livePreviewCard = (page: Page) => page.locator("div:has(> h3)");

/**
 * A post card in the feed or on a creator profile.
 *
 * Browser-verified: the card is a bare `<div>` — no role, no link, no heading, nothing
 * addressable. Tailwind classes are the only handle the app offers, so this stays a
 * class selector, but it lives here as the single definition instead of the identical
 * constant that used to sit in both FeedsPage and ProfilePage. When the app gains a
 * `data-testid` on post cards, this is the one line to change.
 */
export const POST_CARD_SELECTOR =
  "[class*='cursor-pointer'][class*='flex-row'][class*='items-start']";

/**
 * The row that directly contains a label, so the value beside it can be asserted.
 *
 * Replaces `getByText(label).locator("..")`. Playwright reads a leading `..` as the XPath
 * engine, so that was an axis step; `:has(> …)` names the parent directly and is
 * tag-agnostic. Browser-verified on the tip form and the product checkout, where each
 * summary row is a label span and an amount span inside one div, resolving to the same
 * single element the parent step did.
 */
export const amountRow = (page: Page, label: string) =>
  page.locator(`:has(> :text-is("${label}"))`);
