import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { locatorChain, smartLocator } from "@utils/heal-utils";
import { safeClick } from "@utils/playwright.utils";
import {
  nextSetDetailsAction,
  textFeedback,
  titleInput,
} from "@pages/shared/locators";
import {
  digitalProductPricingData,
  digitalProductValidationData,
  productsCreationData,
} from "@test-data/creator/products.creation.data";

export class DigitalProductPage {
  constructor(
    public readonly page: Page,
    private readonly baseURL: string,
  ) {}

  private readonly digitalProductThumbnailInput = smartLocator(this.page, {
    // Hidden file input without id/aria-label/label association — getByLabel
    // can never match it and would burn the full 10s waitFor timeout on every
    // setInputFiles. The :not([multiple]) disambiguates from the gallery input.
    selector: 'input[type="file"][accept*="image/jpeg"]:not([multiple]):visible',
  });

  readonly contentDetailsHeading = locatorChain(this.page, {
    text: "Content Details",
    selector: 'text="Content Details"',
  });

  private readonly digitalProductBackAction = smartLocator(this.page, {
    role: "button",
    name: "",
    exact: true,
    selector: 'button:has(svg.lucide-arrow-left)',
  });

  private readonly digitalProductUnsavedChangesDialog = smartLocator(this.page, {
    role: "dialog",
    text: "Unsaved changes",
    selector: '[role="dialog"], [role="alertdialog"]',
  });

  private readonly linksContentTypeAction = smartLocator(this.page, {
    text: "Links",
    selector: "#content-type-links",
  });

  private linksContentTypeCheckbox(): Locator {
    return this.page.locator("#content-type-links");
  }

  private embedLinksSection(): Locator {
    return locatorChain(this.page, {
      text: "Embed Links",
      selector: 'text="Embed Links"',
    });
  }

  /** Buyer-only Content Description editor (second editable-markdown editor) — TC-PD-C-013. */
  private digitalProductContentDescriptionEditor(): Locator {
    return locatorChain(this.page, {
      role: "textbox",
      name: "editable markdown",
      selector: '[role="textbox"][aria-label="editable markdown"]',
    }).nth(1);
  }

  /** Rich text toolbar of the buyer-only Content Description (second toolbar on Add Content). */
  private digitalProductContentDescriptionToolbar(): Locator {
    return this.page.getByRole("toolbar").nth(1);
  }

  private digitalProductContentDescriptionCounter(): Locator {
    return this.page.locator("p").filter({ hasText: /\d+\s*\/\s*500/ }).nth(1);
  }

  private digitalProductContentDescriptionFormatAction(name: string): Locator {
    return this.digitalProductContentDescriptionToolbar().locator(`[aria-label="${name}"]`);
  }

  async goto() {
    await this.page.goto(
      new URL("products/create/digital-downloads", this.baseURL).toString(),
      { waitUntil: "domcontentloaded" },
    );
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/products\/(?:create|update)\/digital-downloads\//, {
      timeout: 30000,
    });
    await expect(titleInput(this.page)).toBeVisible({ timeout: 30000 });
    await expect(this.contentDetailsHeading).toBeVisible({ timeout: 10000 });
  }

  async expectDigitalProductCreateFlow() {
    await expect(this.page).toHaveURL(productsCreationData.digitalProductCreatePath);
    await expect(titleInput(this.page)).toBeVisible({ timeout: 10000 });
    await expect(this.contentDetailsHeading).toBeVisible({ timeout: 10000 });
  }

  async uploadDigitalProductThumbnail(filePath: string) {
    await this.digitalProductThumbnailInput.setInputFiles(filePath, { timeout: 15000 });
  }

  async navigateAwayFromDigitalProductViaBack() {
    await this.digitalProductBackAction.click({ timeout: 10000 });
  }

  async expectDigitalProductUnsavedChangesDialog() {
    const dialogText = await this.digitalProductUnsavedChangesDialog.text({ timeout: 10000 });
    expect(dialogText).toMatch(/unsaved|leave|discard|lose your changes|are you sure/i);
  }

  async submitEmptyDigitalProductAddContent() {
    await nextSetDetailsAction(this.page).click({ timeout: 10000 });
  }

  async expectDigitalProductRequiredFeedback() {
    const { requiredErrors } = digitalProductValidationData;
    await expect(textFeedback(this.page, requiredErrors.title)).toBeVisible({ timeout: 10000 });
    await expect(textFeedback(this.page, requiredErrors.description)).toBeVisible({ timeout: 10000 });
    await expect(textFeedback(this.page, requiredErrors.content)).toBeVisible({ timeout: 10000 });
    await expect(textFeedback(this.page, requiredErrors.thumbnail)).toBeVisible({ timeout: 10000 });
    await expect(textFeedback(this.page, requiredErrors.summary)).toBeVisible({ timeout: 10000 });
  }

  async fillDigitalProductContentDescription(text: string) {
    const editor = this.digitalProductContentDescriptionEditor();
    await editor.click({ timeout: 10000 });
    await this.page.keyboard.press("Control+A");
    await this.page.keyboard.press("Backspace");
    if (text) await this.page.keyboard.insertText(text);
  }

  async expectDigitalProductContentDescriptionCounter(expectedText: string) {
    await expect(this.digitalProductContentDescriptionCounter()).toContainText(expectedText, {
      timeout: 10000,
    });
  }

  async applyDigitalProductContentDescriptionFormatting() {
    const editor = this.digitalProductContentDescriptionEditor();
    await editor.click({ timeout: 10000 });
    await this.page.keyboard.press("Control+A");
    await this.digitalProductContentDescriptionFormatAction("Bold").click({ timeout: 10000 });
    await this.digitalProductContentDescriptionFormatAction("Italic").click({ timeout: 10000 });
    await this.digitalProductContentDescriptionFormatAction("Underline").click({ timeout: 10000 });
  }

  async expectDigitalProductContentDescriptionFormatted() {
    const html = await this.digitalProductContentDescriptionEditor().innerHTML();
    expect(html).toMatch(/_bold_|_italic_|_underline_|strong|em|u/i);
  }

  async expectDigitalProductSetDetailsLoaded() {
    await expect(this.page.getByRole("button", { name: "Next: Publish" })).toBeVisible({
      timeout: 15000,
    });
  }

  /** Digital Product pricing (AUT-FV-193 / TC-PD-C-018..019) — shares the online-course pricing UI. */

  async readDigitalProductPricingEnabled(): Promise<boolean> {
    return (await this.page.getByRole("switch", { name: "Add Pricing" }).getAttribute("aria-checked")) === "true";
  }

  /** Free default: pricing either OFF (input hidden) or ON with IDR 0 — preview must show IDR 0. */
  async expectDigitalProductPricingFreeDefault() {
    await expect
      .poll(() => this.page.locator("main").innerText(), { timeout: 10000 })
      .toMatch(digitalProductPricingData.idrZeroPattern);
  }

  async enableDigitalProductPricing() {
    const toggle = this.page.getByRole("switch", { name: "Add Pricing" });
    if ((await toggle.getAttribute("aria-checked")) !== "true") {
      await safeClick(toggle);
    }
    await expect(toggle).toHaveAttribute("aria-checked", "true", { timeout: 10000 });
    await expect(this.page.getByRole("textbox", { name: "10,000" })).toBeVisible({ timeout: 10000 });
  }

  async fillDigitalProductPrice(price: string) {
    const input = this.page.getByRole("textbox", { name: "10,000" });
    await input.click({ timeout: 10000 });
    await input.fill(price);
    // Blur to trigger client-side pricing validation.
    await this.page.getByText("Add pricing to charge viewers").click({ timeout: 10000 });
  }

  async expectDigitalProductInvalidPriceFeedback() {
    await expect
      .poll(() => this.page.locator("main").innerText(), { timeout: 10000 })
      .toMatch(digitalProductPricingData.invalidPriceErrorPattern);
  }

  async expectDigitalProductValidPrice() {
    await expect
      .poll(() => this.page.locator("main").innerText(), { timeout: 10000 })
      .toMatch(digitalProductPricingData.validPriceDisplayPattern);
  }

  async enableLinksContentType() {
    const checkbox = this.linksContentTypeCheckbox();
    await this.linksContentTypeAction.click({ timeout: 10000 });

    if ((await checkbox.getAttribute("aria-checked")) !== "true") {
      await safeClick(this.page.locator("#content-type-links"));
    }

    await expect(checkbox).toHaveAttribute("aria-checked", "true", { timeout: 10000 });
    await expect(this.embedLinksSection()).toBeVisible({ timeout: 10000 });
  }

}
