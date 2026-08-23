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
  await waitForLoaded(page);
}

/**
 * Move the pointer onto `locator` in one interpolated gesture, so the page sees
 * a short run of real `mousemove` events before the click.
 *
 * Invisible reCAPTCHA scores a submit that arrives with no pointer movement at
 * all as automated, and Playwright's `click()` by itself jumps straight onto the
 * element. One stepped move supplies that trail at no extra wall-clock cost.
 *
 * The destination comes from the element box, not a RNG, so runs reproduce.
 */
export async function moveCursorTo(page: Page, locator: Locator, options?: { steps?: number }) {
  await locator.scrollIntoViewIfNeeded();

  const box = await locator.boundingBox();
  if (!box) {
    // Detached or zero-sized: hovering still emits a move at the element.
    await locator.hover();
    return;
  }

  const steps = options?.steps ?? 10;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps });
}

/**
 * `safeClick` preceded by a pointer move, for controls behind an invisible
 * captcha (the `/auth` Continue button). No artificial pause: the interpolated
 * move is the whole signal, and sleeping only costs run time.
 */
export async function humanClick(
  page: Page,
  locator: Locator,
  options?: { timeout?: number; steps?: number },
) {
  const timeout = options?.timeout ?? 10000;
  await expect(locator).toBeVisible({ timeout });
  await expect(locator).toBeEnabled({ timeout });
  await moveCursorTo(page, locator, { steps: options?.steps });
  await locator.click({ timeout });
}
