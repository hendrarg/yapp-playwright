import { expect, type Locator, type Page } from "@playwright/test";

export async function safeClick(locator: Locator, options?: { timeout?: number }) {
  const timeout = options?.timeout ?? 10000;
  await locator.scrollIntoViewIfNeeded();
  await expect(locator).toBeVisible({ timeout });
  await expect(locator).toBeEnabled({ timeout });
  await locator.click({ timeout });
}

export async function safeFill(locator: Locator, value: string, options?: { timeout?: number }) {
  const timeout = options?.timeout ?? 10000;
  await locator.scrollIntoViewIfNeeded();
  await expect(locator).toBeVisible({ timeout });
  await expect(locator).toBeEnabled({ timeout });
  await locator.fill(value, { timeout });
}

export async function safeCheck(locator: Locator, options?: { timeout?: number }) {
  const timeout = options?.timeout ?? 10000;
  await locator.scrollIntoViewIfNeeded();
  await expect(locator).toBeVisible({ timeout });
  await expect(locator).toBeEnabled({ timeout });
  await locator.check({ timeout });
}

/**
 * Wait for a loading spinner/skeleton to disappear.
 */
export async function waitForLoaded(page: Page, selector = '[data-testid="spinner"], [data-testid="skeleton"]') {
  const spinner = page.locator(selector);
  try {
    await spinner.waitFor({ state: 'hidden', timeout: 15000 });
  } catch {
    // spinner may not have appeared
  }
}

/**
 * Navigate and wait for full load.
 */
export async function navigateAndWait(page: Page, url: string, timeout = 30000) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
  await page.waitForLoadState('networkidle', { timeout });
}
