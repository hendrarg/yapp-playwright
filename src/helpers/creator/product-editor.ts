import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { safeClick, safeFill } from "@utils/playwright.utils";
import { consultationMediaData } from "@test-data/creator/consultation.media.data";
import { consultationValidationData } from "@test-data/creator/consultation.validation.data";
import { digitalProductValidationData } from "@test-data/creator/products.creation.data";
import {
  addEmbedLinkAction,
  addQuestionDialog,
  addQuestionsAction,
  afterSalesSection,
  createQuestionAction,
  descriptionEditor,
  embedLinkDoneButton,
  embedLinkLabelInput,
  embedLinkUrlInput,
  galleryInput,
  heroInput,
  livePreviewCard,
  priceInput,
  pricingSwitchAction,
  productCompleteDialog,
  questionLabelInput,
  saveAsDraftAction,
  textFeedback,
} from "@pages/shared/locators";

/**
 * Shared create/edit step sequences across product types (consultation,
 * discord membership, digital product, online course). Each helper owns the
 * title input, pricing switch, hero/gallery media, buyer form, after-sales
 * links, embed links and the Product Complete modal. Page objects call these
 * with their own `page`; specs may call them directly.
 */

function afterSalesLinksCheckbox(page: Page) {
  return afterSalesSection(page)
    .getByText(consultationValidationData.afterSalesLinksLabel)
    .first()
    .locator("xpath=preceding::*[@role='checkbox'][1]");
}

// ── Pricing ──────────────────────────────────────────────────────

export async function readPricingEnabled(page: Page): Promise<boolean> {
  return (await pricingSwitchAction(page).getAttribute("aria-checked")) === "true";
}

export async function fillPrice(page: Page, amount: string) {
  await safeFill(priceInput(page), amount);
}

export async function setPricingEnabled(page: Page, enabled: boolean) {
  const checked = await pricingSwitchAction(page).getAttribute("aria-checked");
  if ((checked === "true") !== enabled) {
    await pricingSwitchAction(page).click();
  }
  await expect(await pricingSwitchAction(page).getAttribute("aria-checked")).toBe(
    enabled ? "true" : "false",
  );
}

export async function expectPreviewWithoutPaidPrice(page: Page) {
  const preview = livePreviewCard(page);
  await expect(preview).toBeVisible({ timeout: 10000 });
  await expect(preview.getByText(/Rp[\d.,]+/)).toHaveCount(0, { timeout: 10000 });
}

export async function expectPreviewPaidPrice(page: Page, pattern: RegExp) {
  const preview = livePreviewCard(page);
  await expect(preview).toBeVisible({ timeout: 10000 });
  await expect(preview.getByText(pattern)).toBeVisible({ timeout: 10000 });
}

// ── Buyer form ───────────────────────────────────────────────────

export async function expectMandatoryBuyerFieldsProtected(page: Page) {
  for (const label of consultationValidationData.mandatoryFields) {
    await expect(page.getByText(label, { exact: false }).first()).toBeVisible({
      timeout: 10000,
    });
  }
  await expect(page.getByText("Mandatory", { exact: true })).toHaveCount(3, {
    timeout: 10000,
  });

  for (const label of consultationValidationData.mandatoryFields) {
    const row = page.getByText(label, { exact: false }).first().locator("xpath=ancestor::div[2]");
    await expect(row.getByRole("button", { name: "Remove" })).toHaveCount(0);
  }
}

export async function addCustomBuyerQuestion(page: Page, label: string) {
  await addQuestionsAction(page).click({ timeout: 10000 });
  const dialog = addQuestionDialog(page);
  await expect(dialog).toBeVisible({ timeout: 10000 });
  await safeFill(questionLabelInput(page), label);
  await createQuestionAction(page).click({ timeout: 10000 });
  await expect(dialog).toBeHidden({ timeout: 10000 });
  await expect(page.getByText(label, { exact: true })).toBeVisible({ timeout: 10000 });
}

export async function expectAddQuestionsEnabled(page: Page) {
  await expect(page.getByRole("button", { name: "Add Questions" })).toBeEnabled({
    timeout: 10000,
  });
}

export async function expectAddQuestionsDisabled(page: Page) {
  await expect(page.getByRole("button", { name: "Add Questions" })).toBeDisabled({
    timeout: 10000,
  });
}

export async function removeCustomBuyerQuestion(page: Page, label: string) {
  const questionCard = page
    .locator("div")
    .filter({ has: page.getByText(label, { exact: true }) })
    .filter({ has: page.getByRole("button", { name: "Remove", exact: true }) })
    .last();
  const removeButton = questionCard.getByRole("button", { name: "Remove", exact: true });
  await removeButton.scrollIntoViewIfNeeded();
  await expect(removeButton).toBeVisible({ timeout: 10000 });
  await removeButton.click({ timeout: 10000, force: true });

  const confirm = page
    .getByRole("alertdialog")
    .or(page.getByRole("dialog"))
    .filter({ hasText: /delete|remove|sure/i })
    .first();
  if (await confirm.isVisible({ timeout: 1500 }).catch(() => false)) {
    await safeClick(confirm.getByRole("button", { name: /confirm|delete|remove|yes/i }).last());
  }

  await expect(page.getByText(label, { exact: true })).toHaveCount(0, { timeout: 10000 });
}

// ── After-sales links ────────────────────────────────────────────

export async function enableAfterSalesLinks(page: Page) {
  const checkbox = afterSalesLinksCheckbox(page);
  await afterSalesSection(page)
    .getByText(consultationValidationData.afterSalesLinksLabel)
    .first()
    .scrollIntoViewIfNeeded();
  if ((await checkbox.getAttribute("aria-checked")) !== "true") {
    await safeClick(checkbox);
  }
  await expect(checkbox).toHaveAttribute("aria-checked", "true", { timeout: 10000 });
  await expect(afterSalesSection(page).getByRole("button", { name: "Add Link" }).first()).toBeVisible(
    { timeout: 10000 },
  );
}

// ── Hero / gallery media ─────────────────────────────────────────

export async function expectHeroRequired(page: Page) {
  await expect(textFeedback(page, consultationMediaData.errors.heroRequired)).toBeVisible({
    timeout: 10000,
  });
}

export async function chooseHeroFile(page: Page, filePath: string) {
  await heroInput(page).setInputFiles(filePath);
}

export async function chooseGalleryFiles(page: Page, filePaths: readonly string[]) {
  await galleryInput(page).setInputFiles([...filePaths]);
}

export async function uploadHero(page: Page, filePath: string) {
  await chooseHeroFile(page, filePath);
  await expect(page.getByRole("button", { name: /Uploaded image Thumbnail/i })).toBeVisible({
    timeout: 30000,
  });
}

export async function uploadGallery(page: Page, filePaths: readonly string[]) {
  await chooseGalleryFiles(page, filePaths);
  await expect(page.getByRole("button", { name: "Uploaded image 1", exact: true })).toBeVisible({
    timeout: 60000,
  });
}

export async function expectHeroNotUploaded(page: Page) {
  await expect(page.getByRole("button", { name: /Uploaded image Thumbnail/i })).toHaveCount(0, {
    timeout: 10000,
  });
}

export async function expectGalleryCount(page: Page, count: number) {
  for (let i = 1; i <= count; i++) {
    await expect(page.getByRole("button", { name: `Uploaded image ${i}`, exact: true })).toBeVisible(
      { timeout: 15000 },
    );
  }
  await expect(page.getByText("No Image")).toHaveCount(0, { timeout: 10000 });
}

export async function expectGalleryInputUnavailable(page: Page) {
  await expect(galleryInput(page)).toHaveCount(0, { timeout: 10000 });
}

export async function expectImageTooSmall(page: Page, fileName: string) {
  const pattern = new RegExp(
    `${fileName.replace(".", "\\.")} is too small\\. Image must be at least 500 × 500 pixels\\.`,
    "i",
  );
  await expect(page.getByText(pattern)).toBeVisible({ timeout: 10000 });
}

export async function expectImageTooLarge(page: Page) {
  await expect(page.getByText(consultationMediaData.errors.tooLarge)).toBeVisible({
    timeout: 10000,
  });
}

// ── Product Complete modal ───────────────────────────────────────

export async function expectProductCompleteModal(page: Page) {
  const dialog = productCompleteDialog(page);
  await expect(dialog).toBeVisible({ timeout: 60000 });
  await expect(dialog.getByRole("heading", { name: /Product Complete|live/i })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "View Product Page" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: /Copy Link/i }).first()).toBeVisible();
  await expect(dialog.getByRole("img", { name: /Product Complete|consultation/i }).first()).toBeVisible();
}

export async function readProductCompleteSharePath(page: Page): Promise<string> {
  const dialog = productCompleteDialog(page);
  await expect(dialog).toBeVisible({ timeout: 60000 });
  const text = await dialog.innerText();
  const match = text.match(/\/s\/[A-Za-z0-9_-]+/);
  expect(match?.[0], "expected share path in Product Complete modal").toBeTruthy();
  return match![0];
}

export async function copyProductCompleteLink(page: Page): Promise<string> {
  const dialog = productCompleteDialog(page);
  await dialog.getByRole("button", { name: /Copy Link/i }).first().click();
  const copied = await page.evaluate(() =>
    (navigator as Navigator & { clipboard: { readText(): Promise<string> } }).clipboard.readText(),
  );
  expect(copied).toMatch(/\/s\/[A-Za-z0-9_-]+/);
  return copied;
}

export async function closeProductCompleteModal(page: Page) {
  const dialog = productCompleteDialog(page);
  await safeClick(dialog.getByRole("button", { name: "Close" }));
  await expect(dialog).toBeHidden({ timeout: 15000 });
}

// ── Draft / title / description ──────────────────────────────────

export async function saveAsDraft(page: Page) {
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/shop/products") &&
      !response.url().includes("/hide-from-profile") &&
      ["PATCH", "POST", "PUT"].includes(response.request().method()),
    { timeout: 15000 },
  );

  await saveAsDraftAction(page).click({ timeout: 15000 });
  const response = await responsePromise;
  expect(response.ok(), await response.text()).toBeTruthy();
}

export async function expectTitleValue(page: Page, title: string) {
  await expect(page.getByRole("textbox", { name: "Enter title", exact: true }).first()).toHaveValue(
    title,
    { timeout: 10000 },
  );
}

export async function expectDescriptionContains(page: Page, text: string) {
  await expect(descriptionEditor(page)).toContainText(text, { timeout: 10000 });
}

// ── Embed links ──────────────────────────────────────────────────

export async function openEmbedLinkDialog(page: Page) {
  await addEmbedLinkAction(page).click({ timeout: 10000 });
  await expect(embedLinkUrlInput(page)).toBeVisible({ timeout: 10000 });
  await expect(embedLinkLabelInput(page)).toBeVisible({ timeout: 10000 });
}

export async function fillEmbedLink(page: Page, label: string, url: string) {
  await embedLinkUrlInput(page).fill(url, { timeout: 10000 });
  await embedLinkLabelInput(page).fill(label, { timeout: 10000 });
}

export async function expectInvalidEmbedLinkFeedback(page: Page) {
  const { linkValidation } = digitalProductValidationData;
  await expect(textFeedback(page, linkValidation.invalidUrlError)).toBeVisible({
    timeout: 10000,
  });
  await expect(embedLinkLabelInput(page)).toHaveValue(linkValidation.truncatedLongLabel);
  await expect(textFeedback(page, linkValidation.maxLabelCounter)).toBeVisible({
    timeout: 10000,
  });
  await expect(embedLinkDoneButton(page)).toBeDisabled();
}

export async function saveCurrentEmbedLink(page: Page) {
  await expect(embedLinkDoneButton(page)).toBeEnabled({ timeout: 10000 });
  await safeClick(embedLinkDoneButton(page));
  await expect(embedLinkUrlInput(page)).toBeHidden({ timeout: 10000 });
}

export async function expectEmbedLinksSaved(page: Page, labels: readonly string[]) {
  for (const label of labels) {
    await expect(textFeedback(page, label)).toBeVisible({ timeout: 10000 });
  }
}
