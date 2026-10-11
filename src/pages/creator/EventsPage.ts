import type { Dialog, Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { locatorChain, smartLocator } from "@utils/heal-utils";
import { safeClick, safeFill } from "@utils/playwright.utils";
import { boldAction, embedLinkDoneButton, embedLinkLabelInput, embedLinkUrlInput, descriptionEditor, italicAction, underlineAction, galleryInput, heroInput, livePreviewCard, nextSetDetailsAction, saveAsDraftAction, titleInput } from "@pages/shared/locators";
import { eventsMediaData } from "@test-data/creator/events.media.data";
import { eventsAfterSalesData } from "@test-data/creator/events.after-sales.data";
import { eventsTicketsData, type EventsTicketDiscountType } from "@test-data/creator/events.tickets.data";
import { eventsPublishData } from "@test-data/creator/events.publish.data";
import { productsCreationData } from "@test-data/creator/products.creation.data";
import { creatorProfile } from "@test-data/buyer/profile.data";

type SalesDay = { month: "current" | "next"; day: "first" | "last" };

export class EventsPage {
  constructor(
    public readonly page: Page,
    private readonly baseURL: string,
  ) {}

  private readonly pageHeading = smartLocator(this.page, {
    role: "heading",
    name: "Event Ticket",
    text: "Event Ticket",
    selector: 'h1:has-text("Event Ticket")',
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

  private eventDateAction(): Locator {
    return this.page
      .getByRole("button", { name: "Select event date", exact: true })
      .or(this.page.getByRole("button", { name: /^\d{1,2} [A-Za-z]+ \d{4}$/ }))
      .filter({ visible: true })
      .first();
  }

  private eventTimeButton(index: number): Locator {
    return this.page
      .getByRole("button", { name: /^(Event (start|end) time|\d{2}:\d{2})$/ })
      .filter({ visible: true })
      .nth(index);
  }

  private venueNameInput(): Locator {
    return locatorChain(this.page, {
      role: "textbox",
      name: "Venue Name *",
      placeholder: "Enter venue name",
      selector: 'input[placeholder="Enter venue name"]',
    });
  }

  private venueAddressInput(): Locator {
    return locatorChain(this.page, {
      role: "textbox",
      name: "Address *",
      placeholder: "Enter venue address",
      selector: 'input[placeholder="Enter venue address"]',
    });
  }

  private onSiteRadio(): Locator {
    return locatorChain(this.page, {
      role: "radio",
      name: "On-site · In-person attendances",
      text: "On-site",
      selector: '[role="radio"]:has-text("On-site")',
    });
  }

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
    // The single-file thumbnail input. It only renders while no thumbnail is set, which
    // is why the old text-anchored XPath resolved to nothing on an edit form that
    // already had one — the shared attribute locator identifies it on its own.
    return heroInput(this.page);
  }

  private galleryFileInput(): Locator {
    // The multi-file input is unique on the form; browser-verified to be the same
    // element the old text-anchored XPath resolved to.
    return galleryInput(this.page);
  }

  private afterSalesLabel(text: "Customize Message" | "Links" | "Customize after-sales for this tier"): Locator {
    return locatorChain(this.page, {
      text,
      selector: `text="${text}"`,
    });
  }

  /**
   * The row holding one after-sales toggle: the `div` whose direct child is that
   * section's `<label>`. Browser-verified to contain exactly one switch, which is why
   * this replaces the old `preceding::*[@role='switch'][1]` document-wide axis walk.
   */
  private afterSalesToggleRow(label: string): Locator {
    return this.page.locator(`div:has(> label:has-text("${label}"))`);
  }

  /**
   * The whole after-sales block for a section: the innermost `div` holding both the
   * section label and its rich-text editor. Browser-verified to contain exactly one
   * editor, toolbar, checkbox, and Add Link button — so the previous `following::`
   * axes, which scanned the rest of the document, are unnecessary.
   */
  private afterSalesBlock(label: string): Locator {
    return this.page
      .locator("div")
      .filter({ has: this.page.locator(`label:has-text("${label}")`) })
      .filter({ has: this.page.locator('[contenteditable="true"]') })
      .last();
  }

  private afterSalesCustomizeMessageSwitch(): Locator {
    return this.afterSalesToggleRow("Customize Message").getByRole("switch");
  }

  private afterSalesMessageEditor(): Locator {
    return this.afterSalesBlock("Customize Message").locator('[contenteditable="true"]');
  }

  private afterSalesMessageToolbar(): Locator {
    return this.afterSalesBlock("Customize Message").getByRole("toolbar");
  }

  private afterSalesImageButton(): Locator {
    return this.afterSalesMessageToolbar().getByRole("button", { name: "Insert image" });
  }

  private afterSalesLinksCheckbox(): Locator {
    // The Links checkbox lives in the same after-sales block as the message editor.
    return this.afterSalesBlock("Customize Message").getByRole("checkbox");
  }

  private afterSalesAddLinkButton(): Locator {
    return this.afterSalesBlock("Customize Message").getByRole("button", { name: "Add Link", exact: true });
  }

  private perTierAfterSalesSwitch(): Locator {
    return this.afterSalesToggleRow("Customize after-sales for this tier").getByRole("switch");
  }

  private perTierAfterSalesEditor(): Locator {
    return this.afterSalesBlock("Customize after-sales for this tier").locator('[contenteditable="true"]');
  }

  private perTierAfterSalesAddLinkButton(): Locator {
    return this.afterSalesBlock("Customize after-sales for this tier")
      .getByRole("button", { name: "Add Link", exact: true });
  }

  /**
   * The row wrapping a labelled cell. Both after-sales link rows and ticket tier headers
   * share one shape: the label lives in a `span` beside its own icon button, and the
   * remaining actions sit on ancestors. Browser-verified to resolve to the same element
   * as the previous `ancestor::div[3]` step, for every row on the form.
   */
  private labelledRow(label: string): Locator {
    const cell = this.page
      .locator("div")
      .filter({ has: this.page.locator(`span:text-is("${label}")`) })
      .filter({ has: this.page.getByRole("button") })
      .last();
    return this.page.locator("div").filter({ has: cell }).last();
  }

  private linkRow(label: string): Locator {
    return this.labelledRow(label);
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

  /** The preview opens as the only dialog on the page; its text is the staged message and links. */
  private afterSalesPreviewDialog(): Locator {
    return this.page.getByRole("dialog").filter({ visible: true }).last();
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
    await this.selectEventDate("last");
  }

  async selectEventDate(position: "first" | "last") {
    await this.eventDateAction().click({ timeout: 10000 });
    await this.pickEnabledCalendarDay(position);
    await expect(this.page.getByRole("button", { name: "Select event date", exact: true })).toHaveCount(0, {
      timeout: 10000,
    });
  }

  async selectEventDateNextMonth(position: "first" | "last" = "first") {
    await this.eventDateAction().click({ timeout: 10000 });
    const calendarDialog = this.page.getByRole("dialog").last();
    await calendarDialog.getByRole("button", { name: "Go to the Next Month" }).click({ timeout: 10000 });
    await this.pickEnabledCalendarDay(position);
    await expect(this.page.getByRole("button", { name: "Select event date", exact: true })).toHaveCount(0, {
      timeout: 10000,
    });
  }

  async selectEventTime(index: 0 | 1, time: string) {
    await this.eventTimeButton(index).click({ timeout: 10000 });
    const dialog = this.page.getByRole("dialog").last();
    const pickerInput = dialog.getByRole("combobox").first();
    await safeFill(pickerInput, time);
    const suggestions = dialog.getByRole("listbox", { name: "Suggestions" }).first();
    await expect(suggestions.getByRole("option", { name: time, exact: true })).toBeVisible({ timeout: 10000 });
    await suggestions.getByRole("option", { name: time, exact: true }).click({ timeout: 10000 });
    await expect(this.eventTimeButton(index)).toContainText(time, { timeout: 10000 });
  }

  async readEventDateText() {
    return this.eventDateAction().innerText({ timeout: 10000 });
  }

  async readEventTimeText(index: 0 | 1) {
    return this.eventTimeButton(index).innerText({ timeout: 10000 });
  }

  private async pickEnabledCalendarDay(position: "first" | "last") {
    const calendar = this.page.getByRole("dialog").last().getByRole("grid");
    await expect(calendar).toBeVisible({ timeout: 10000 });
    const days = calendar.getByRole("button", { disabled: false });
    await safeClick(position === "first" ? days.first() : days.last());
    await expect(calendar).toBeHidden({ timeout: 10000 });
  }

  /**
   * One ticket's field block, identified by that ticket's description textarea — the
   * only ticket field the app gives a stable `name` attribute.
   */
  private ticketBlock(index: number): Locator {
    return this.page
      .locator("div")
      .filter({ has: this.page.locator(`textarea[name="ticketPriceConfigurations.${index}.description"]`) })
      .filter({ has: this.page.getByRole("switch") })
      .last();
  }

  /** A labelled row inside one ticket's block. */
  private ticketFieldRow(index: number, label: string): Locator {
    return this.ticketBlock(index).locator(`div:has(> label:has-text("${label}"))`);
  }

  /**
   * The rename (pencil) button for a ticket tier. The tier name sits in a `span` inside
   * its own wrapper, and the rename button is that wrapper's next sibling — verified in
   * the browser to resolve to the same element as the previous ancestor/sibling XPath,
   * for every tier on the form.
   */
  private ticketRenameButton(name: string): Locator {
    return this.page.locator(`div:has(> span:text-is("${name}")) + button`);
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
    return this.ticketFieldRow(index, "Ticket Quantity").getByRole("textbox");
  }

  private setDiscountSwitch(index: number): Locator {
    return this.ticketFieldRow(index, eventsTicketsData.setDiscountLabel).getByRole("switch");
  }

  /**
   * Within the ticket's block two rows match "Discount" — `:has-text` is case-insensitive so
   * "Set discount" matches as well. The discount row is the one carrying a combobox (the type);
   * the other carries the switch.
   */
  private discountRow(index: number): Locator {
    return this.ticketBlock(index)
      .locator('div:has(> label:has-text("Discount"))')
      .filter({ has: this.page.getByRole("combobox") });
  }

  private discountTypeCombobox(index: number): Locator {
    return this.discountRow(index).getByRole("combobox");
  }

  /**
   * The amount box beside the type select. Scoped to the discount row because the `%` box's
   * placeholder `0` is shared with Ticket Quantity, so a page-wide placeholder match lands on
   * the quantity field instead.
   */
  private discountAmountInput(index: number): Locator {
    return this.discountRow(index).getByRole("textbox");
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

  private salesPeriodEndButton(_index: number): Locator {
    return locatorChain(this.page, {
      role: "button",
      name: "Select date",
      text: "Select date",
      selector: 'button:has-text("Select date")',
    }).last();
  }

  private ticketTierHeader(name: string): Locator {
    return this.labelledRow(name);
  }

  /**
   * The tier's header block: the rename button plus the two unlabelled icon buttons.
   * The app gives those two no accessible name, so they can only be told apart by
   * position — but the position is now indexed within this tier's own block instead of
   * walking the whole document as `following::button[N]` did.
   */
  private ticketHeaderBlock(name: string): Locator {
    return this.page.locator("div").filter({ has: this.ticketTierHeader(name) }).last();
  }

  private ticketExpandButton(name: string): Locator {
    return this.ticketHeaderBlock(name).getByRole("button").nth(2);
  }

  private ticketDeleteButton(name: string): Locator {
    return this.ticketHeaderBlock(name).getByRole("button").nth(1);
  }

  /**
   * On a hybrid event each tier says which part it sells. The required `Location` select offers
   * `Offline venue`, `Online venue` and `Hybrid venue`, each followed by the venue or platform.
   */
  async selectTicketLocation(index: number, location: "Offline venue" | "Online venue" | "Hybrid venue") {
    const select = this.ticketFieldRow(index, "Location").getByRole("combobox");
    await safeClick(select);
    await this.page.getByRole("option", { name: new RegExp(`^${location}`) }).click({ timeout: 10000 });
    await expect(select).toContainText(location, { timeout: 10000 });
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

  /** The tier's own Start and End date buttons, in that order. */
  private ticketSalesPeriodButtons(index: number): Locator {
    return this.ticketBlock(index).getByRole("button", { name: /^(Select date|\d{1,2} [A-Za-z]+ \d{4})$/ });
  }

  /** Open a calendar, page forward to this month or next month, and pick its first or last open day. */
  private async pickSalesDay(button: Locator, pick: SalesDay) {
    await safeClick(button);
    const target = new Date();
    target.setDate(1);
    if (pick.month === "next") target.setMonth(target.getMonth() + 1);
    const caption = target.toLocaleString("en-US", { month: "long", year: "numeric" });
    const dialog = this.page.getByRole("dialog").last();
    for (let i = 0; i < 3 && !(await dialog.getByText(caption, { exact: true }).isVisible()); i++) {
      await dialog.getByRole("button", { name: "Go to the Next Month" }).click({ timeout: 10000 });
    }
    await expect(dialog.getByText(caption, { exact: true })).toBeVisible({ timeout: 10000 });
    await this.pickEnabledCalendarDay(pick.day);
  }

  /** Set one tier's sales window, scoped to that tier so other tiers' dates are untouched. */
  async setTicketSalesPeriod(index: number, period: { start: SalesDay; end: SalesDay }) {
    await this.pickSalesDay(this.ticketSalesPeriodButtons(index).nth(0), period.start);
    await this.pickSalesDay(this.ticketSalesPeriodButtons(index).nth(1), period.end);
    await expect(this.ticketSalesPeriodButtons(index).filter({ hasText: "Select date" })).toHaveCount(0, { timeout: 10000 });
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

  async fillTicketDiscountAmount(type: EventsTicketDiscountType, amount: string, index = 0) {
    await expect(this.discountTypeCombobox(index)).toContainText(type, { timeout: 10000 });
    const input = this.discountAmountInput(index);
    await safeFill(input, amount);
    await input.press("Tab");
  }

  async expectTicketDiscountAmount(type: EventsTicketDiscountType, amount: string, index = 0) {
    await expect(this.discountTypeCombobox(index)).toContainText(type, { timeout: 10000 });
    await expect(this.discountAmountInput(index)).toHaveValue(amount, { timeout: 10000 });
  }

  async expectPercentDiscountBlocked() {
    await expect(this.percentDiscountError).toBeVisible({ timeout: 10000 });
  }

  async fillTicketQuantity(index: number, quantity: string) {
    await safeFill(this.ticketQuantityInput(index), quantity);
    await this.expectTicketQuantity(index, quantity);
  }

  /** A non-image file picked as the thumbnail is refused with the accepted types listed. */
  async expectThumbnailTypeRejected(fileName: string) {
    await expect(this.page.getByText(new RegExp(`${fileName.replace(/\./g, "\\.")}: ${eventsMediaData.unsupportedTypeMessage}`))).toBeVisible({ timeout: 10000 });
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

  async expectPreviewPanelDetails(title: string) {
    const preview = livePreviewCard(this.page);
    await expect(preview).toBeVisible({ timeout: 10000 });
    await expect(preview.getByRole("img").first()).toBeVisible({ timeout: 15000 });
    await expect(preview.getByText(eventsPublishData.previewBadgeText, { exact: true })).toBeVisible({
      timeout: 10000,
    });
    await expect(preview.getByRole("heading", { name: title, exact: true })).toBeVisible({ timeout: 10000 });
    await expect(preview.getByText(creatorProfile)).toBeVisible({ timeout: 10000 });
  }

  async expectSaveAsDraftAbsent() {
    await expect.poll(() => saveAsDraftAction(this.page).count(), { timeout: 5000 }).toBe(0);
  }

  async expectSaveAsDraftAvailable() {
    await expect
      .poll(() => saveAsDraftAction(this.page).visibleCount(), { timeout: 10000 })
      .toBeGreaterThan(0);
  }

  private completionMeterText(): Locator {
    return this.page.getByText(/^\d+% completed$/).filter({ visible: true });
  }

  /**
   * The "% completed" meter only renders below the `md` breakpoint, so this
   * temporarily resizes to a mobile viewport to read it, then restores the
   * original size for the rest of the test.
   */
  async readCompletionPercentage(): Promise<number> {
    const originalViewport = this.page.viewportSize();
    await this.page.setViewportSize(eventsPublishData.mobileViewport);
    try {
      const meter = this.completionMeterText().first();
      await expect(meter).toBeVisible({ timeout: 10000 });
      const text = await meter.textContent();
      const match = text?.match(/(\d+)% completed/);
      expect(match?.[1], "expected a completion percentage on the mobile completion meter").toBeTruthy();
      return Number(match![1]);
    } finally {
      if (originalViewport) {
        await this.page.setViewportSize(originalViewport);
      }
    }
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
    // Clearing the editor sometimes takes the image with it; only then is there no button left.
    const deleteImage = this.afterSalesMessageEditor().getByRole("button", { name: "Delete image" });
    if (await deleteImage.isVisible()) await deleteImage.click({ timeout: 10000 });
    await expect(this.afterSalesMessageEditor().getByRole("img")).toHaveCount(0, { timeout: 10000 });
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

  /** The URL field sits above `Customize Label Text`. */
  async expectAfterSalesLinkFieldOrder() {
    const url = await embedLinkUrlInput(this.page).boundingBox();
    const label = await embedLinkLabelInput(this.page).boundingBox();
    expect(url && label && url.y < label.y, "URL comes before the label").toBe(true);
  }

  async readAfterSalesLinkLabel(): Promise<string> {
    return embedLinkLabelInput(this.page).inputValue();
  }

  /**
   * Step 2 offers no file upload beyond the thumbnail and its gallery: every file input takes
   * images only. After Sales offers rich text with image and YouTube embeds plus up to 3 links.
   */
  async expectNoAttachmentUpload(imageAcceptList: string) {
    const accepts: string[] = await this.page.locator('input[type="file"]').evaluateAll((inputs) => inputs.map((input) => input.getAttribute("accept") ?? ""));
    expect(accepts.length).toBeGreaterThan(0);
    for (const accept of accepts) expect(accept.split(",").every((type) => imageAcceptList.split(",").includes(type) || type.startsWith("image/"))).toBe(true);
    const toolbar = this.afterSalesMessageToolbar();
    await expect(toolbar.getByRole("button", { name: "Insert image" })).toBeVisible({ timeout: 10000 });
    await expect(toolbar.getByRole("button", { name: "Insert YouTube video" })).toBeVisible();
    await expect(this.page.getByText("max. 3 links")).toBeVisible();
    await expect(this.afterSalesBlock("Customize Message").getByText(/attach|file|recording/i)).toHaveCount(0);
  }

  /** Collapsing a tier hides its fields; expanding brings them back. */
  async expectTicketTierCollapsible(index: number, name: string) {
    await this.collapseTicketTier(name);
    await expect(this.ticketDescriptionInput(index)).toBeHidden({ timeout: 10000 });
    await this.expandTicketTier(name);
    await expect(this.ticketDescriptionInput(index)).toBeVisible({ timeout: 10000 });
  }

  /** Delete removes the tier at once — no confirmation dialog, by design. */
  async deleteTicketTier(name: string) {
    let dialogShown = false;
    const onDialog = () => { dialogShown = true; };
    this.page.on("dialog", onDialog);
    await safeClick(this.ticketDeleteButton(name));
    this.page.off("dialog", onDialog);
    await expect(this.page.getByText(name, { exact: true })).toHaveCount(0, { timeout: 10000 });
    await expect(this.page.getByRole("alertdialog")).toHaveCount(0);
    expect(dialogShown, "no browser confirm before removing a tier").toBe(false);
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

  /** Editing a saved link opens it prefilled, under an edit heading rather than `Add Link`. */
  async expectAfterSalesLinkEditDialog(link: { url: string; label: string }) {
    await this.linkEditButton(link.label).click({ timeout: 10000 });
    const dialog = this.page.getByRole("dialog").filter({ visible: true }).last();
    await expect(embedLinkUrlInput(this.page)).toHaveValue(link.url, { timeout: 10000 });
    await expect(embedLinkLabelInput(this.page)).toHaveValue(link.label, { timeout: 10000 });
    await expect(dialog.getByRole("heading", { name: "Add Link", exact: true })).toHaveCount(0, { timeout: 5000 });
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

  async fillEditableEventsStep1(options: {
    title: string;
    description: string;
    venue: string;
    address: string;
    startTime: string;
    endTime: string;
    datePosition?: "first" | "last" | "next-month";
  }) {
    await this.fillEventsTitle(options.title);
    await this.fillEventsDescription(options.description);
    if (options.datePosition === "next-month") {
      await this.selectEventDateNextMonth();
    } else {
      await this.selectEventDate(options.datePosition ?? "last");
    }
    if ((await this.allDaySwitch.getAttribute("aria-checked")) === "true") {
      await safeClick(this.allDaySwitch);
    }
    await this.selectEventTime(0, options.startTime);
    await this.selectEventTime(1, options.endTime);
    const onSite = this.onSiteRadio();
    if ((await onSite.getAttribute("aria-checked")) !== "true") {
      await safeClick(onSite);
    }
    await safeFill(this.venueNameInput(), options.venue);
    await safeFill(this.venueAddressInput(), options.address);
  }

  async goBackToEventsStep1() {
    await this.page.getByRole("button", { name: "Back", exact: true }).click({ timeout: 10000 });
    await expect(titleInput(this.page)).toBeVisible({ timeout: 10000 });
  }

  async readEventProductUuidFromUrl(): Promise<string> {
    const match = this.page.url().match(/\/products\/update\/events-ticket\/([^/?#]+)/);
    expect(match?.[1], "expected event product uuid in update URL").toBeTruthy();
    return match![1];
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

  /** Press `Next: Set Details` without expecting Step 2 — used to read Step 1 validation. */
  async submitEventsBasicInfo() {
    await nextSetDetailsAction(this.page).click({ timeout: 10000 });
  }

  private formMessage(text: string): Locator {
    return locatorChain(this.page, {
      text,
      selector: `[data-slot="form-message"]:has-text("${text}")`,
    }).first();
  }

  /** Step 1 kept its URL and shows each inline error, so navigation was blocked. */
  async expectEventsBasicInfoErrors(messages: readonly string[]) {
    for (const message of messages) await expect(this.formMessage(message)).toBeVisible({ timeout: 10000 });
    await expect(this.page).toHaveURL(/\/products\/(?:create|update)\/events-ticket/);
    await expect(this.ticketConfigHeading).toBeHidden();
  }

  /** The time picker offers every slot of the day and disables none of them. */
  async expectEventTimeSlots(index: 0 | 1, count: number) {
    await this.eventTimeButton(index).click({ timeout: 10000 });
    const options = this.page.getByRole("dialog").last().getByRole("option");
    await expect(options).toHaveCount(count, { timeout: 10000 });
    await expect(this.page.getByRole("dialog").last().locator('[role="option"][aria-disabled="true"]')).toHaveCount(0);
    await this.page.keyboard.press("Escape");
    await expect(options).toHaveCount(0, { timeout: 10000 });
  }

  async expectEventTimes(start: string, end: string) {
    await expect(this.eventTimeButton(0)).toContainText(start, { timeout: 10000 });
    await expect(this.eventTimeButton(1)).toContainText(end, { timeout: 10000 });
  }

  private platformSelect(): Locator {
    return locatorChain(this.page, {
      role: "combobox",
      name: "Platform / Streaming Link",
      selector: "#platform",
    }).first();
  }

  private meetingLinkInput(): Locator {
    return locatorChain(this.page, {
      role: "textbox",
      name: "Meeting Link",
      placeholder: "https://...",
      selector: 'input[name="ticketConfiguration.meetingLink"]',
    }).first();
  }

  /** The online platform select: its options and the preselected value. */
  async expectOnlinePlatformOptions(options: readonly string[], selected: string) {
    await expect(this.platformSelect()).toContainText(selected, { timeout: 10000 });
    await this.platformSelect().click({ timeout: 10000 });
    await expect(this.page.getByRole("option")).toHaveText([...options], { timeout: 10000 });
    await this.page.keyboard.press("Escape");
  }

  async selectOnlinePlatform(platform: "Google Meet" | "Custom") {
    await this.platformSelect().click({ timeout: 10000 });
    await this.page.getByRole("option", { name: platform, exact: true }).click({ timeout: 10000 });
    await expect(this.platformSelect()).toContainText(platform, { timeout: 10000 });
  }

  async fillMeetingLink(url: string) {
    await safeFill(this.meetingLinkInput(), url);
  }

  async readEventsTitleValue(): Promise<string> {
    return titleInput(this.page).inputValue();
  }

  async gotoEdit(productUuid: string) {
    await this.page.goto(new URL(`products/update/events-ticket/${productUuid}`, this.baseURL).toString(), {
      waitUntil: "domcontentloaded",
    });
    await this.expectLoaded();
    // The saved description arrives after the editor mounts and overwrites anything typed earlier.
    await expect(descriptionEditor(this.page)).not.toBeEmpty({ timeout: 15000 });
  }

  /** The `n/2` step indicator in the form header. */
  async expectStepIndicator(step: "1/2" | "2/2") {
    await expect(locatorChain(this.page, { text: step, selector: `text="${step}"` }).first()).toBeVisible({ timeout: 10000 });
  }

  /** Every description toolbar control, found by the accessible name the editor gives it. */
  async expectDescriptionToolbar(controls: readonly string[]) {
    for (const name of controls) {
      await expect(locatorChain(this.page, { label: name, selector: `[aria-label="${name}"]` }).first()).toBeVisible({ timeout: 10000 });
    }
  }

  async applyDescriptionFormatting() {
    await descriptionEditor(this.page).click({ timeout: 10000 });
    await this.page.keyboard.press("Control+A");
    await boldAction(this.page).click({ timeout: 10000 });
    await italicAction(this.page).click({ timeout: 10000 });
    await underlineAction(this.page).click({ timeout: 10000 });
  }

  /**
   * Bold, italic and underline are applied to the text. The editor (Lexical) marks all three as
   * classes on one `strong`, so read the toolbar instead: with the text selected, each format
   * button flips to its `Remove …` state.
   */
  async expectDescriptionFormatted(text: string) {
    const editor = descriptionEditor(this.page);
    await expect(editor).toContainText(text, { timeout: 10000 });
    await editor.click({ timeout: 10000 });
    await this.page.keyboard.press("Control+A");
    for (const format of ["bold", "italic", "underline"]) {
      const applied = locatorChain(this.page, { role: "radio", name: `Remove ${format}`, exact: true, selector: `[aria-label="Remove ${format}"]` }).first();
      await expect(applied).toHaveAttribute("aria-checked", "true", { timeout: 10000 });
    }
  }

  async expectTimezone(timezone: string) {
    await expect(locatorChain(this.page, { text: timezone, selector: `text="${timezone}"` }).first()).toBeVisible({ timeout: 10000 });
  }

  private hybridLocationRadio(): Locator {
    return locatorChain(this.page, {
      role: "radio",
      name: "Hybrid · In-person & virtual",
      selector: '[role="radio"][value="hybrid"]',
    }).first();
  }

  async selectHybridLocation() {
    await safeClick(this.hybridLocationRadio());
    await expect(this.hybridLocationRadio()).toHaveAttribute("aria-checked", "true", { timeout: 10000 });
  }

  async fillVenue(name: string, address: string) {
    await safeFill(this.venueNameInput(), name);
    await safeFill(this.venueAddressInput(), address);
  }

  /** With All Day on, the start and end time controls are not rendered at all. */
  async expectEventTimeInputsHidden() {
    await expect(this.eventTimeButton(0)).toHaveCount(0, { timeout: 10000 });
  }

  /** Step 2 is made of exactly these sections. */
  async expectEventsDetailsSections(sections: readonly string[]) {
    for (const section of sections) {
      await expect(locatorChain(this.page, { text: section, selector: `text="${section}"` }).first()).toBeVisible({ timeout: 10000 });
    }
  }

  /** Days before today are disabled in the event date picker; today and later are selectable. */
  async expectPastEventDatesDisabled() {
    await this.eventDateAction().click({ timeout: 10000 });
    const days = this.page.getByRole("dialog").last().getByRole("grid").getByRole("button");
    await expect(days.first()).toBeVisible({ timeout: 10000 });
    const states = await days.evaluateAll((buttons) => buttons.map((b) => ({ label: b.getAttribute("aria-label") ?? "", disabled: b.hasAttribute("disabled") })));
    const today = states.findIndex((day) => day.label.startsWith("Today"));
    expect(today, "the picker marks today").toBeGreaterThanOrEqual(0);
    expect(states.slice(0, today).every((day) => day.disabled), "every earlier day is disabled").toBe(true);
    expect(states.slice(today).every((day) => !day.disabled), "today and later days are selectable").toBe(true);
    await this.page.keyboard.press("Escape");
  }

  /**
   * Schedule is one date picker, a start and an end time, the All Day switch and a searchable
   * timezone picker — no repeat, recurrence or extra-session control.
   */
  async expectScheduleControls(timezone: { label: string; options: number; searchPlaceholder: string }) {
    await expect(this.eventDateAction()).toHaveCount(1);
    await expect(this.page.getByRole("button", { name: /^Event (start|end) time$/ })).toHaveCount(2, { timeout: 10000 });
    await expect(this.allDaySwitch.first()).toBeVisible();
    await expect(this.page.getByText(/repeat|recurr|session/i)).toHaveCount(0);
    await locatorChain(this.page, { text: timezone.label, selector: `text="${timezone.label}"` }).first().click({ timeout: 10000 });
    await expect(this.page.getByRole("option")).toHaveCount(timezone.options, { timeout: 10000 });
    await expect(this.page.getByPlaceholder(timezone.searchPlaceholder)).toBeVisible();
    await this.page.keyboard.press("Escape");
  }

  /** On-site asks for Venue Name and Address only — no map link field. */
  async expectOnSiteVenueFields() {
    await expect(this.venueNameInput()).toBeVisible({ timeout: 10000 });
    await expect(this.venueAddressInput()).toBeVisible();
    await expect(this.page.getByText(/map/i)).toHaveCount(0);
  }

  private descriptionCounter(): Locator {
    return locatorChain(this.page, { text: "/ 500", selector: 'text=/^\\d+ \\/ 500$/' }).first();
  }

  async expectDescriptionCounter(expected: string) {
    await expect(this.descriptionCounter()).toHaveText(expected, { timeout: 10000 });
  }

  /** The location radios and the All Day switch are reachable by their accessible names. */
  async expectFormControlsNamed() {
    for (const location of ["On-site", "Online", "Hybrid"]) {
      await expect(this.page.getByRole("radio", { name: new RegExp(`^${location}`) })).toHaveCount(1, { timeout: 5000 });
    }
    await expect(this.page.getByRole("switch", { name: "All Day" })).toHaveCount(1, { timeout: 5000 });
  }

  /** A documented title limit shows up as the input's maxlength. */
  async expectEventsTitleLimited() {
    await expect(titleInput(this.page)).toHaveAttribute("maxlength", /^\d+$/, { timeout: 5000 });
  }

  async expectEventsDetailsStep() {
    await expect(this.ticketConfigHeading).toBeVisible({ timeout: 20000 });
    await this.nextPublishAction.text({ timeout: 15000 });
    await expect(this.chooseThumbnailLabel).toBeVisible({ timeout: 10000 });
    await expect(this.thumbnailHelperText).toBeVisible({ timeout: 10000 });
  }

  async submitEventsPublishDetails() {
    const dialogHandler = async (dialog: Dialog) => {
      await dialog.accept();
    };
    this.page.once("dialog", dialogHandler);
    await this.nextPublishAction.click({ timeout: 10000 });
    this.page.removeListener("dialog", dialogHandler);
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

  /** A full gallery: every additional slot holds an image and the chooser is gone. */
  async expectGalleryFull(slots: number) {
    await expect(this.uploadedGalleryImage(slots)).toBeVisible({ timeout: 30000 });
    await expect(this.noImagePlaceholder).toHaveCount(0, { timeout: 10000 });
    await expect(this.galleryChooserHint).toHaveCount(0);
    await expect(this.galleryFileInput()).toHaveCount(0);
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
