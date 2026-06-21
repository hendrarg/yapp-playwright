import type { Page } from "@playwright/test";

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
