import { type Locator, type Page, expect } from "@playwright/test";

/**
 * Retry a predicate-based check up to `retries` times with a delay.
 * Useful when waiting for a condition that may not be immediately true.
 */
export async function retryUntil(
  fn: () => Promise<boolean> | boolean,
  { retries = 5, delay = 1000 }: { retries?: number; delay?: number } = {},
): Promise<void> {
  for (let i = 0; i < retries; i++) {
    if (await fn()) return;
    if (i < retries - 1) await new Promise((r) => setTimeout(r, delay));
  }
  throw new Error(`retryUntil: condition not met after ${retries} attempts`);
}

/**
 * Click a locator with retry logic for flaky elements.
 * Tries safeClick first, then falls back to force click + retry.
 */
export async function flakyClick(locator: Locator, options?: { retries?: number; timeout?: number }) {
  const { retries = 3, timeout = 5000 } = options ?? {};
  let lastError: Error | undefined;

  for (let i = 0; i < retries; i++) {
    try {
      await locator.scrollIntoViewIfNeeded();
      await expect(locator).toBeVisible({ timeout });
      await expect(locator).toBeEnabled({ timeout });
      await locator.click();
      return;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      // fallback: force click
      try {
        await locator.click({ force: true, timeout });
        return;
      } catch {
        // wait and retry
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }
  throw lastError ?? new Error(`flakyClick: failed after ${retries} attempts`);
}

/**
 * Fill an input with retry logic for flaky elements.
 */
export async function flakyFill(locator: Locator, value: string, options?: { retries?: number; timeout?: number }) {
  const { retries = 3, timeout = 5000 } = options ?? {};
  let lastError: Error | undefined;

  for (let i = 0; i < retries; i++) {
    try {
      await locator.scrollIntoViewIfNeeded();
      await expect(locator).toBeVisible({ timeout });
      await expect(locator).toBeEnabled({ timeout });
      await locator.fill(value);
      return;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw lastError ?? new Error(`flakyFill: failed after ${retries} attempts`);
}

/**
 * Get a text element with multiple fallback locator strategies.
 * Tries: getByRole → getByText → getByTestId → getByPlaceholder → CSS.
 */
export async function flakyGetByText(
  page: Page,
  text: string,
  options?: { role?: string; testId?: string },
): Promise<Locator> {
  const { role, testId } = options ?? {};

  // Try role first if given
  if (role) {
    const byRole = page.getByRole(role as any, { name: text });
    if (await byRole.isVisible().catch(() => false)) return byRole;
  }

  // Try getByText
  const byText = page.getByText(text, { exact: true });
  if (await byText.isVisible().catch(() => false)) return byText;

  // Try getByTestId
  if (testId) {
    const byTestId = page.getByTestId(testId);
    if (await byTestId.isVisible().catch(() => false)) return byTestId;
  }

  // Try getByPlaceholder
  const byPlaceholder = page.getByPlaceholder(text);
  if (await byPlaceholder.isVisible().catch(() => false)) return byPlaceholder;

  // Fallback: CSS text content contains
  return page.locator(`text="${text}"`);
}

/**
 * Wait for a loading spinner/skeleton to disappear before proceeding.
 */
export async function waitForLoadComplete(page: Page, spinnerSelector = '[data-testid="spinner"], [data-testid="skeleton"], .loading-spinner') {
  // Give spinner a moment to appear
  await page.waitForTimeout(500);
  // Wait for it to disappear
  const spinner = page.locator(spinnerSelector);
  try {
    await spinner.waitFor({ state: 'hidden', timeout: 15000 });
  } catch {
    // spinner may not have appeared at all
  }
}

/**
 * Wait for network idle (no network requests for 500ms).
 */
export async function waitForNetworkIdle(page: Page, timeout = 15000) {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Navigate and wait for full page load, handling flaky navigation.
 */
export async function flakyGoto(page: Page, url: string, options?: { timeout?: number; retries?: number }) {
  const { timeout = 30000, retries = 2 } = options ?? {};
  let lastError: Error | undefined;

  for (let i = 0; i < retries; i++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
      await page.waitForLoadState('networkidle', { timeout });
      return;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (i < retries - 1) await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw lastError ?? new Error(`flakyGoto: failed after ${retries} attempts`);
}

/**
 * Assert a locator's text content, retrying if stale.
 */
export async function flakyExpectText(locator: Locator, expected: string | RegExp, options?: { timeout?: number; retries?: number }) {
  const { timeout = 10000, retries = 3 } = options ?? {};
  let lastError: Error | undefined;

  for (let i = 0; i < retries; i++) {
    try {
      await expect(locator).toHaveText(expected, { timeout });
      return;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      // Re-query locator in case of stale reference
      if (i < retries - 1) await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw lastError ?? new Error(`flakyExpectText: failed after ${retries} attempts`);
}
