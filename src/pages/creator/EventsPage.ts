import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { locatorChain, smartLocator } from "@utils/heal-utils";
import { safeClick, safeFill } from "@utils/playwright.utils";
import {
  embedLinkDoneButton,
  embedLinkLabelInput,
  embedLinkUrlInput,
  descriptionEditor,
  galleryInput,
  heroInput,
  nextSetDetailsAction,
  titleInput,
} from "@pages/shared/locators";
import { eventsMediaData } from "@test-data/creator/events.media.data";
import { eventsAfterSalesData } from "@test-data/creator/events.after-sales.data";
import { eventsTicketsData, type EventsTicketDiscountType } from "@test-data/creator/events.tickets.data";
import { productsCreationData } from "@test-data/creator/products.creation.data";

export class EventsPage {
  constructor(
    public readonly page: Page,
    private readonly baseURL: string,
  ) {}

  private readonly pageHeading = smartLocator(this.page, {
    role: "heading",
    name: "New Event Ticket",
    text: "New Event Ticket",
  });

  private readonly nextPublishAction = smartLocator(this.page, {
    role: "button",
    name: "Next: Publish",
    text: "Next: Publish",
    selector: 'button:has-text("Next: Publish")',
  });

  private readonly allDaySwitch = locatorChain(this.page, {
    role: "switch",
    name: "All Day",
    selector: 'xpath=//*[normalize-space()="All Day"]/preceding-sibling::*[@role="switch"][1]',
  });

  private readonly onlineLocationRadio = smartLocator(this.page, {
    role: "radio",
    name: "Online · Virtual",
    text: "Online",
    selector: '[role="radio"]:has-text("Online")',
  });

  private readonly selectEventDateAction = smartLocator(this.page, {
    role: "button",
    name: "Select event date",
    text: "Select event date",
    selector: 'button:has-text("Select event date")',
  });

  private readonly addAnotherTicketTypeAction = smartLocator(this.page, {
    role: "button",
    name: eventsTicketsData.addAnotherTicketType,
    text: eventsTicketsData.addAnotherTicketTypeText,
    selector: 'button:has-text("Add Another Ticket Type")',
  });

  private readonly ticketConfigHeading = locatorChain(this.page, {
    text: "Ticket Configuration",
    selector: 'p:has-text("Ticket Configuration")',
  });

  private readonly percentDiscountError = locatorChain(this.page, {
    text: eventsTicketsData.percentDiscountError,
    selector: `[data-slot="form-message"]:has-text("${eventsTicketsData.percentDiscountError}")`,
  });

  readonly thumbnailSectionHeading = locatorChain(this.page, {
    text: "Thumbnail",
    selector: 'p:has-text("Thumbnail")',
  });

  readonly chooseThumbnailLabel = locatorChain(this.page, {
    text: "Choose Image for Your Thumbnail",
    selector: 'text="Choose Image for Your Thumbnail"',
  });

  readonly thumbnailHelperText = locatorChain(this.page, {
    text: eventsMediaData.helperText,
    selector: `text="${eventsMediaData.helperText}"`,
  });

  readonly heroDropHint = locatorChain(this.page, {
    text: eventsMediaData.heroDropHint,
    selector: `text="${eventsMediaData.heroDropHint}"`,
  });

  readonly galleryChooserHint = locatorChain(this.page, {
    text: eventsMediaData.galleryChooserCopy,
    selector: `text="${eventsMediaData.galleryChooserCopy}"`,
  });

  readonly noImagePlaceholder = locatorChain(this.page, {
    text: "No Image",
    selector: 'text="No Image"',
  });

  private uploadedThumbnailButton(): Locator {
    return locatorChain(this.page, {
      role: "button",
      name: "Uploaded image Thumbnail",
      selector: 'button:has-text("Uploaded image Thumbnail")',
    });
  }

  private uploadedGalleryImage(index: number): Locator {
    return locatorChain(this.page, {
      role: "button",
      name: `Uploaded image ${index}`,
      exact: true,
      text: `Uploaded image ${index}`,
      selector: `button:has-text("Uploaded image ${index}")`,
    });
  }

  private heroFileInput(): Locator {
    return this.page
      .getByText(eventsMediaData.heroDropHint, { exact: true })
      .locator("xpath=ancestor::*[.//input[@type='file']][1]//input[@type='file']")
      .or(heroInput(this.page));
  }

  private galleryFileInput(): Locator {
    return this.page
      .getByText(eventsMediaData.galleryChooserCopy, { exact: true })
      .locator("xpath=ancestor::*[.//input[@type='file']][1]//input[@type='file']")
      .or(galleryInput(this.page));
  }

  private afterSalesLabel(text: "Customize Message" | "Links" | "Customize after-sales for this tier"): Locator {
    return locatorChain(this.page, {
      text,
      selector: `text="${text}"`,
    });
  }

  private afterSalesCustomizeMessageSwitch(): Locator {
    return this.afterSalesLabel("Customize Message").locator("xpath=preceding::*[@role='switch'][1]");
  }

  private afterSalesMessageEditor(): Locator {
    return this.afterSalesLabel("Customize Message").locator("xpath=following::*[@contenteditable='true'][1]");
  }

  private afterSalesMessageToolbar(): Locator {
    return this.afterSalesLabel("Customize Message").locator("xpath=following::*[@role='toolbar'][1]");
  }

  private afterSalesImageButton(): Locator {
    return this.afterSalesMessageToolbar().getByRole("button", { name: "Insert image" });
  }

  private afterSalesLinksCheckbox(): Locator {
    return this.afterSalesLabel("Links").locator("xpath=preceding::*[@role='checkbox'][1]");
  }

  private afterSalesAddLinkButton(): Locator {
    return this.afterSalesLinksCheckbox().locator("xpath=following::button[normalize-space()='Add Link'][1]");
  }

  private perTierAfterSalesSwitch(): Locator {
    return this.afterSalesLabel("Customize after-sales for this tier")
      .locator("xpath=preceding::*[@role='switch'][1]");
  }

  private perTierAfterSalesEditor(): Locator {
    return this.afterSalesLabel("Customize after-sales for this tier")
      .locator("xpath=following::*[@contenteditable='true'][1]");
  }

  private perTierAfterSalesAddLinkButton(): Locator {
    return this.afterSalesLabel("Customize after-sales for this tier")
      .locator("xpath=following::button[normalize-space()='Add Link'][1]");
  }

  private linkRow(label: string): Locator {
    return locatorChain(this.page, {
      text: label,
      selector: `text="${label}"`,
    }).locator("xpath=ancestor::div[3]");
  }

  private linkEditButton(label: string): Locator {
    return this.linkRow(label).getByRole("button", { name: "edit", exact: true });
  }

  private linkDeleteButton(label: string): Locator {
    return this.linkRow(label).getByRole("button").nth(1);
  }

  private afterSalesPreviewButton() {
    return smartLocator(this.page, {
      role: "button",
      name: "Preview",
      exact: true,
      text: "Preview",
      selector: 'button:has-text("Preview")',
    });
  }

  private afterSalesPreviewDialog(): Locator {
    return this.page.getByRole("dialog").filter({ hasText: "Links" });
  }

  async goto() {
    await this.page.goto(new URL("products/create/events-ticket", this.baseURL).toString(), {
      waitUntil: "domcontentloaded",
    });
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/products\/(?:create|update)\/events-ticket/, {
      timeout: 30000,
    });
    expect(this.page.url()).not.toContain("/auth");
    await expect(titleInput(this.page)).toBeVisible({ timeout: 30000 });
    await this.pageHeading.text({ timeout: 10000 });
    await nextSetDetailsAction(this.page).text({ timeout: 10000 });
  }

  async expectEventsCreateFlow() {
    await expect(this.page).toHaveURL(productsCreationData.eventsTicketCreatePath, {
      timeout: 15000,
    });
    await expect(titleInput(this.page)).toBeVisible({ timeout: 10000 });
    await this.pageHeading.text({ timeout: 10000 });
    await nextSetDetailsAction(this.page).text({ timeout: 10000 });
  }

  async fillEventsTitle(title: string) {
    await safeFill(titleInput(this.page), title);
  }

  async fillEventsDescription(text: string) {
    const editor = descriptionEditor(this.page);
    await editor.click({ timeout: 10000 });
    await this.page.keyboard.press("Control+A");
    await this.page.keyboard.press("Backspace");
    await this.page.keyboard.insertText(text);
  }

  async enableAllDaySchedule() {
    if ((await this.allDaySwitch.getAttribute("aria-checked")) !== "true") {
      await safeClick(this.allDaySwitch);
    }
    await expect(this.allDaySwitch).toHaveAttribute("aria-checked", "true", { timeout: 10000 });
  }

  async selectOnlineLocation() {
    await this.onlineLocationRadio.click({ timeout: 10000 });
  }

  async selectFutureEventDate() {
    await this.selectEventDateAction.click({ timeout: 10000 });
    await this.pickEnabledCalendarDay("last");
    await expect(this.page.getByRole("button", { name: "Select event date" })).toHaveCount(0, {
      timeout: 10000,
    });
  }

  private async pickEnabledCalendarDay(position: "first" | "last") {
    const calendar = this.page.getByRole("dialog").getByRole("grid");
    await expect(calendar).toBeVisible({ timeout: 10000 });
    const days = calendar.getByRole("button", { disabled: false });
    await safeClick(position === "first" ? days.first() : days.last());
    await expect(calendar).toBeHidden({ timeout: 10000 });
  }

  private ticketRenameButton(name: string): Locator {
    return this.page
      .getByText(name, { exact: true })
      .locator("xpath=ancestor::div[1]/following-sibling::button[1]")
      .or(
        this.page.locator(
          `xpath=//*[normalize-space()="${name}"]/ancestor::div[1]/following-sibling::button[1]`,
        ),
      );
  }

  private ticketTitleInput(index: number): Locator {
    const nameAttr = `ticketPriceConfigurations.${index}.title`;
    return locatorChain(this.page, {
      selector: `input[name="${nameAttr}"]`,
    }).or(this.page.locator(`[data-slot="input"][name="${nameAttr}"]`));
  }

  private ticketDescriptionInput(index: number): Locator {
    return locatorChain(this.page, {
      role: "textbox",
      name: eventsTicketsData.descriptionPlaceholder,
      placeholder: eventsTicketsData.descriptionPlaceholder,
      selector: 'textarea[name^="ticketPriceConfigurations."][name$=".description"]',
    }).nth(index);
  }

  private ticketPriceInput(index: number): Locator {
    return locatorChain(this.page, {
      role: "textbox",
      name: "10,000",
      placeholder: "10,000",
      selector: 'input[placeholder="10,000"]',
    }).nth(index);
  }

  private ticketQuantityInput(index: number): Locator {
    return locatorChain(this.page, {
      text: eventsTicketsData.quantityHelper,
      selector: `p:has-text("${eventsTicketsData.quantityHelper}")`,
    }).nth(index).locator("xpath=preceding::input[1]");
  }

  private setDiscountSwitch(index: number): Locator {
    return locatorChain(this.page, {
      text: eventsTicketsData.setDiscountLabel,
      selector: `text="${eventsTicketsData.setDiscountLabel}"`,
    }).nth(index)
      .locator("xpath=preceding::*[@role='switch'][1]")
  }

  private discountTypeCombobox(index: number): Locator {
    return locatorChain(this.page, {
      text: "Discount",
      selector: 'text="Discount"',
    }).nth(index).locator("xpath=following::button[@role='combobox'][1]");
  }

  private discountAmountInput(type: EventsTicketDiscountType): Locator {
    const placeholder = type === "Rp" ? "1.000" : "0";
    return locatorChain(this.page, {
      role: "textbox",
      name: placeholder,
      placeholder,
      selector: `input[placeholder="${placeholder}"]`,
    }).last();
  }

  private discountTypeOption(type: EventsTicketDiscountType): Locator {
    return this.page
      .getByRole("listbox")
      .getByRole("option", { name: type, exact: true })
      .or(
        this.page
          .locator('[role="listbox"] [role="option"][data-slot="select-item"]')
          .filter({ hasText: new RegExp(`^${type === "%" ? "%" : "Rp"}$`) }),
      );
  }

  private salesPeriodStartButton(index: number): Locator {
    return locatorChain(this.page, {
      role: "button",
      name: "Select date",
      text: "Select date",
      selector: 'button:has-text("Select date")',
    }).nth(index * 2);
  }

  private salesPeriodEndButton(index: number): Locator {
    return locatorChain(this.page, {
      role: "button",
      name: "Select date",
      text: "Select date",
      selector: 'button:has-text("Select date")',
    }).last();
  }

  private ticketTierHeader(name: string): Locator {
    return locatorChain(this.page, {
      text: name,
      selector: `text="${name}"`,
    }).locator("xpath=ancestor::div[3]");
  }

  private ticketExpandButton(name: string): Locator {
    return locatorChain(this.page, {
      text: name,
      selector: `text="${name}"`,
    }).locator("xpath=following::button[3]");
  }

  private ticketDeleteButton(name: string): Locator {
    return locatorChain(this.page, {
      text: name,
      selector: `text="${name}"`,
    }).locator("xpath=following::button[2]");
  }

  async expectTicketConfiguration() {
    await expect(this.ticketConfigHeading).toBeVisible({ timeout: 10000 });
    await expect(this.page.getByText(eventsTicketsData.defaultTierName(0), { exact: true })).toBeVisible({
      timeout: 10000,
    });
    await this.addAnotherTicketTypeAction.text({ timeout: 10000 });
  }

  async renameTicketTier(index: number, currentName: string, newName: string) {
    await this.ticketRenameButton(currentName).click({ timeout: 10000 });
    const title = this.ticketTitleInput(index);
    await expect(title).toBeVisible({ timeout: 10000 });
    await expect(title).toHaveValue(currentName, { timeout: 10000 });
    await safeFill(title, newName);
    await this.page.keyboard.press("Tab");
    await expect(this.page.getByText(newName, { exact: true })).toBeVisible({ timeout: 10000 });
  }

  async expectAfterSalesUsesTicketName(name: string) {
    await expect(this.page.getByText(eventsTicketsData.afterSalesOff(name), { exact: true })).toBeVisible({
      timeout: 10000,
    });
  }

  async fillTicketDescription(index: number, description: string) {
    await safeFill(this.ticketDescriptionInput(index), description);
  }

  async fillTicketPrice(index: number, amount: string) {
    await safeFill(this.ticketPriceInput(index), amount);
  }

  async expectTicketPriceValue(index: number, value: string) {
    await expect(this.ticketPriceInput(index)).toHaveValue(value, { timeout: 10000 });
  }

  async expectTicketQuantity(index: number, value: string) {
    await expect(this.ticketQuantityInput(index)).toHaveValue(value, { timeout: 10000 });
    await expect(this.page.getByText(eventsTicketsData.quantityHelper, { exact: true }).nth(index)).toBeVisible({
      timeout: 10000,
    });
  }

  async fillTicketSalesPeriod(index: number) {
    await this.salesPeriodStartButton(index).click({ timeout: 10000 });
    await this.pickEnabledCalendarDay("first");
    await this.salesPeriodEndButton(index).click({ timeout: 10000 });
    await this.pickEnabledCalendarDay("last");
    await expect(this.page.getByRole("button", { name: "Select date" })).toHaveCount(0, {
      timeout: 10000,
    });
  }

  async setTicketDiscountEnabled(index: number, enabled: boolean) {
    const discountSwitch = this.setDiscountSwitch(index);
    if ((await discountSwitch.getAttribute("aria-checked")) !== String(enabled)) {
      await safeClick(discountSwitch);
    }
    await expect(discountSwitch).toHaveAttribute("aria-checked", String(enabled), { timeout: 10000 });
  }

  async expectDiscountTypes(index: number) {
    await this.discountTypeCombobox(index).click({ timeout: 10000 });
    const listbox = this.page.getByRole("listbox");
    await expect(listbox).toBeVisible({ timeout: 10000 });
    await expect(listbox.getByRole("option")).toHaveCount(eventsTicketsData.discountTypes.length, {
      timeout: 10000,
    });
    for (const type of eventsTicketsData.discountTypes) {
      await expect(this.discountTypeOption(type)).toBeVisible({ timeout: 10000 });
    }
    await this.discountTypeOption(eventsTicketsData.discountTypes[0]).click({ timeout: 10000 });
    await expect(listbox).toBeHidden({ timeout: 10000 });
  }

  async selectDiscountType(index: number, type: EventsTicketDiscountType) {
    const combobox = this.discountTypeCombobox(index);
    if (!(await combobox.textContent())?.includes(type)) {
      await combobox.click({ timeout: 10000 });
      await this.discountTypeOption(type).click({ timeout: 10000 });
    }
    await expect(combobox).toContainText(type, { timeout: 10000 });
  }

  async fillTicketDiscountAmount(type: EventsTicketDiscountType, amount: string) {
    const input = this.discountAmountInput(type);
    await safeFill(input, amount);
    await input.press("Tab");
  }

  async expectTicketDiscountAmount(type: EventsTicketDiscountType, amount: string) {
    await expect(this.discountAmountInput(type)).toHaveValue(amount, { timeout: 10000 });
  }

  async expectPercentDiscountBlocked() {
    await expect(this.percentDiscountError).toBeVisible({ timeout: 10000 });
  }

  async expectPercentDiscountAllowed() {
    await expect(this.percentDiscountError).toHaveCount(0, { timeout: 10000 });
  }

  async addAnotherTicketType() {
    await this.addAnotherTicketTypeAction.click({ timeout: 10000 });
  }

  async expectTicketTier(name: string) {
    await expect(this.page.getByText(name, { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(this.ticketDeleteButton(name)).toBeVisible({ timeout: 10000 });
    await expect(this.ticketExpandButton(name)).toBeVisible({ timeout: 10000 });
  }

  async collapseTicketTier(name: string) {
    const toggle = this.ticketExpandButton(name);
    if ((await toggle.getAttribute("aria-expanded")) === "true") {
      await safeClick(toggle);
    }
    await expect(toggle).toHaveAttribute("aria-expanded", "false", { timeout: 10000 });
  }

  async expandTicketTier(name: string) {
    const toggle = this.ticketExpandButton(name);
    if ((await toggle.getAttribute("aria-expanded")) !== "true") {
      await safeClick(toggle);
    }
    await expect(toggle).toHaveAttribute("aria-expanded", "true", { timeout: 10000 });
  }

  async expectPreviewStartFrom(pattern: RegExp) {
    await expect(this.page.getByText("Start From", { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(this.page.getByText(pattern)).toBeVisible({ timeout: 10000 });
  }

  async expectAfterSalesDefaultState() {
    await expect(this.afterSalesCustomizeMessageSwitch()).toHaveAttribute("aria-checked", "true", {
      timeout: 10000,
    });
    await expect(this.afterSalesMessageEditor()).toBeVisible({ timeout: 10000 });
    await this.expectAfterSalesMessageCounter(eventsAfterSalesData.emptyCounter);
  }

  async fillAfterSalesMessage(message: string) {
    await safeFill(this.afterSalesMessageEditor(), message);
  }

  async expectAfterSalesMessageCounter(expected: string) {
    await expect(
      locatorChain(this.page, {
        text: expected,
        selector: `text="${expected}"`,
      }),
    ).toBeVisible({ timeout: 10000 });
  }

  async expectAfterSalesImageBudgetConsumed() {
    const counter = locatorChain(this.page, {
      text: "/1000 characters",
      selector: 'text=/^\\d+\\/1000 characters$/',
    });
    const value = await counter.textContent({ timeout: 10000 });
    const count = Number(value?.match(/(\d+)\/1000/)?.[1] ?? 0);
    expect(count, "embedded image should consume more than half of the character budget").toBeGreaterThan(
      eventsAfterSalesData.imageBudgetMinimum,
    );
  }

  async insertAfterSalesImage(filePath: string) {
    const chooser = this.page.waitForEvent("filechooser");
    await this.afterSalesImageButton().click({ timeout: 10000 });
    await (await chooser).setFiles(filePath);
    await expect(this.afterSalesMessageEditor().getByRole("img", { name: /.+/ })).toBeVisible({ timeout: 15000 });
  }

  async removeAfterSalesImage() {
    await safeFill(this.afterSalesMessageEditor(), "");
    await this.afterSalesMessageEditor().getByRole("button", { name: "Delete image" }).click({
      timeout: 10000,
    });
    await this.expectAfterSalesMessageCounter(eventsAfterSalesData.emptyCounter);
  }

  async enableAfterSalesLinks() {
    if ((await this.afterSalesLinksCheckbox().getAttribute("aria-checked")) !== "true") {
      await safeClick(this.afterSalesLinksCheckbox());
    }
    await expect(this.afterSalesLinksCheckbox()).toHaveAttribute("aria-checked", "true", { timeout: 10000 });
    await expect(this.afterSalesAddLinkButton()).toBeVisible({ timeout: 10000 });
  }

  async openGlobalAfterSalesLinkDialog() {
    await this.afterSalesAddLinkButton().click({ timeout: 10000 });
    await this.expectAfterSalesLinkDialog();
  }

  async expectAfterSalesLinkDialog() {
    const dialog = this.page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Add Link", exact: true })).toBeVisible({
      timeout: 10000,
    });
    await expect(embedLinkUrlInput(this.page)).toBeVisible({ timeout: 10000 });
    await expect(embedLinkLabelInput(this.page)).toBeVisible({ timeout: 10000 });
  }

  async fillAfterSalesLink(url: string, label: string) {
    await safeFill(embedLinkUrlInput(this.page), url);
    await safeFill(embedLinkLabelInput(this.page), label);
  }

  async expectInvalidAfterSalesLink(labelLength: number) {
    await expect(this.page.getByText(eventsAfterSalesData.invalidUrlError, { exact: true })).toBeVisible({
      timeout: 10000,
    });
    await expect(
      locatorChain(this.page, {
        text: `${labelLength}/40 characters`,
        selector: `text="${labelLength}/40 characters"`,
      }),
    ).toBeVisible({ timeout: 10000 });
    await expect(embedLinkDoneButton(this.page)).toBeDisabled();
  }

  async saveAfterSalesLink() {
    await expect(embedLinkDoneButton(this.page)).toBeEnabled({ timeout: 10000 });
    await embedLinkDoneButton(this.page).click({ timeout: 10000 });
  }

  async expectAfterSalesLinks(labels: readonly string[]) {
    for (const label of labels) {
      await expect(
        locatorChain(this.page, {
          text: label,
          selector: `text="${label}"`,
        }),
      ).toBeVisible({ timeout: 10000 });
    }
  }

  async expectGlobalAfterSalesLinkLimit() {
    await expect(this.afterSalesAddLinkButton()).toBeDisabled({ timeout: 10000 });
  }

  async editAfterSalesLink(label: string) {
    await this.linkEditButton(label).click({ timeout: 10000 });
    await this.expectAfterSalesLinkDialog();
    await expect(embedLinkUrlInput(this.page)).toHaveValue(eventsAfterSalesData.firstLinkUrl, { timeout: 10000 });
    await expect(embedLinkLabelInput(this.page)).toHaveValue(label, { timeout: 10000 });
  }

  async deleteAfterSalesLink(label: string) {
    await this.linkDeleteButton(label).click({ timeout: 10000 });
    await expect(this.page.getByText(label, { exact: true })).toHaveCount(0, { timeout: 10000 });
  }

  async enablePerTierAfterSales(name: string) {
    const toggle = this.perTierAfterSalesSwitch();
    if ((await toggle.getAttribute("aria-checked")) !== "true") {
      await safeClick(toggle);
    }
    await expect(toggle).toHaveAttribute("aria-checked", "true", { timeout: 10000 });
    await expect(
      this.page.getByText(eventsTicketsData.afterSalesOn(name), { exact: true }),
    ).toBeVisible({ timeout: 10000 });
    await expect(this.perTierAfterSalesEditor()).toBeVisible({ timeout: 10000 });
    await expect(this.perTierAfterSalesAddLinkButton()).toBeVisible({ timeout: 10000 });
  }

  async fillPerTierAfterSalesMessage(message: string) {
    await safeFill(this.perTierAfterSalesEditor(), message);
  }

  async openPerTierAfterSalesLinkDialog() {
    await this.perTierAfterSalesAddLinkButton().click({ timeout: 10000 });
    await this.expectAfterSalesLinkDialog();
  }

  async openAfterSalesLinkEditAndAssertKnownTitle(label: string) {
    await this.linkEditButton(label).click({ timeout: 10000 });
    await expect(this.page.getByRole("dialog").getByRole("heading", { name: "Add Link", exact: true }))
      .toBeVisible({ timeout: 10000 });
    await expect(embedLinkLabelInput(this.page)).toHaveValue(label, { timeout: 10000 });
  }

  async closeAfterSalesLinkDialog() {
    await embedLinkDoneButton(this.page).click({ timeout: 10000 });
  }

  async openAfterSalesPreview() {
    await this.afterSalesPreviewButton().click({ timeout: 10000 });
    await expect(this.afterSalesPreviewDialog()).toBeVisible({ timeout: 10000 });
  }

  async expectAfterSalesPreviewReadOnly(message: string, labels: readonly string[]) {
    const dialog = this.afterSalesPreviewDialog();
    await expect(dialog.getByText(message, { exact: true })).toBeVisible({ timeout: 10000 });
    for (const label of labels) {
      await expect(dialog.getByRole("link", { name: label, exact: true })).toBeVisible({ timeout: 10000 });
    }
    await expect(dialog.locator('[contenteditable="true"]')).toHaveCount(0);
    await expect(dialog.getByRole("textbox")).toHaveCount(0);
  }

  async fillMinimalEventsStep1(options: { title: string; description: string }) {
    await this.fillEventsTitle(options.title);
    await this.fillEventsDescription(options.description);
    await this.enableAllDaySchedule();
    await this.selectOnlineLocation();
    await this.selectFutureEventDate();
  }

  async continueToEventsDetails() {
    await nextSetDetailsAction(this.page).click({ timeout: 10000 });
    await this.expectEventsDetailsStep();
  }

  async expectEventsDetailsStep() {
    await expect(this.ticketConfigHeading).toBeVisible({ timeout: 20000 });
    await this.nextPublishAction.text({ timeout: 15000 });
    await expect(this.thumbnailSectionHeading).toBeVisible({ timeout: 10000 });
    await expect(this.chooseThumbnailLabel).toBeVisible({ timeout: 10000 });
    await expect(this.thumbnailHelperText).toBeVisible({ timeout: 10000 });
  }

  async submitEventsPublishDetails() {
    await this.nextPublishAction.click({ timeout: 10000 });
  }

  async expectThumbnailRequired() {
    const feedback = locatorChain(this.page, {
      selector: `[data-slot="form-message"]:has-text("${eventsMediaData.thumbnailRequired}")`,
    }).or(this.page.getByRole("main").getByText(eventsMediaData.thumbnailRequired, { exact: true }));
    await expect(feedback).toBeVisible({ timeout: 10000 });
  }

  async expectHeroAndGalleryFileInputRules() {
    await expect(this.heroDropHint).toBeVisible({ timeout: 10000 });
    await expect(this.galleryChooserHint).toBeVisible({ timeout: 10000 });

    const hero = this.heroFileInput();
    const gallery = this.galleryFileInput();
    await expect(hero).toHaveAttribute("accept", eventsMediaData.acceptList);
    await expect(gallery).toHaveAttribute("accept", eventsMediaData.acceptList);
    await expect(hero).toHaveJSProperty("multiple", false);
    await expect(gallery).toHaveJSProperty("multiple", true);
  }

  async expectEmptyAdditionalImageGallery() {
    await expect(this.galleryChooserHint).toBeVisible({ timeout: 10000 });
    await expect(this.noImagePlaceholder).toHaveCount(eventsMediaData.emptyGalleryNoImageCount, {
      timeout: 10000,
    });
    await expect(this.uploadedThumbnailButton()).toBeVisible({ timeout: 10000 });
    await expect(this.uploadedGalleryImage(1)).toHaveCount(0);
  }

  async expectGalleryAfterOneUpload() {
    await expect(this.uploadedThumbnailButton()).toBeVisible({ timeout: 10000 });
    await expect(this.uploadedGalleryImage(1)).toBeVisible({ timeout: 15000 });
    await expect(this.galleryChooserHint).toBeVisible({ timeout: 10000 });
    await expect(this.noImagePlaceholder).toHaveCount(eventsMediaData.afterOneUploadNoImageCount, {
      timeout: 10000,
    });
  }
}
