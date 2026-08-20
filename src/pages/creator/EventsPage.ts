import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { locatorChain, smartLocator } from "@utils/heal-utils";
import { safeClick, safeFill } from "@utils/playwright.utils";
import {
  descriptionEditor,
  galleryInput,
  heroInput,
  nextSetDetailsAction,
  titleInput,
} from "@pages/shared/locators";
import { eventsMediaData } from "@test-data/creator/events.media.data";
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
    const calendar = this.page.getByRole("dialog").getByRole("grid");
    await expect(calendar).toBeVisible({ timeout: 10000 });
    const futureDay = calendar.getByRole("button", { disabled: false }).last();
    await safeClick(futureDay);
    await expect(calendar).toBeHidden({ timeout: 10000 });
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
