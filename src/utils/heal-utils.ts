import { expect, type Locator, type Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

// ── Types ─────────────────────────────────────────────────────────

type HealEvent = {
  action: "click" | "fill" | "getText";
  primary: string;
  healed: string;
  timestamp: string;
};

/**
 * Metadata for building a priority-ordered locator strategy chain.
 * Provide as many fields as possible — the system tries them from most
 * stable to most fragile.
 *
 * Priority:
 *   1. testId    (most stable — requires dev cooperation)
 *   2. role      (semantic, rarely changes)
 *   3. text      (visible text, stable)
 *   4. label     (form elements)
 *   5. placeholder (input hints)
 *   6. selector  (CSS/XPath — fragile, avoid when possible)
 */
export type StrategyMeta = {
  testId?: string;
  role?: string;
  name?: string;
  text?: string;
  label?: string;
  placeholder?: string;
  title?: string;
  selector?: string;
};

// ── Monitor: records healing events ───────────────────────────────

const HEAL_LOG_PATH = path.resolve("test-results", "heal-log.json");

class HealMonitor {
  private events: HealEvent[] = [];

  log(event: HealEvent) {
    this.events.push(event);
    console.warn(`[HEAL] ${event.action}: "${event.primary}" → "${event.healed}"`);
    this.flush();
  }

  private flush() {
    try {
      const dir = path.dirname(HEAL_LOG_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(HEAL_LOG_PATH, JSON.stringify(this.events, null, 2));
    } catch {
      // silent
    }
  }
}

const monitor = new HealMonitor();

// ── Smart strategy builder ────────────────────────────────────────

/**
 * Build an ordered array of Playwright Locators from StrategyMeta.
 * Priority: testId → role → text → label → placeholder → selector.
 *
 * @example
 *   const locators = buildSmartStrategies(page, {
 *     testId: 'name-input',
 *     role: 'textbox',
 *     label: 'Name',
 *   });
 *   // Returns [getByTestId, getByRole, getByLabel] in that order
 */
export function buildSmartStrategies(page: Page, meta: StrategyMeta): Locator[] {
  const strategies: { priority: number; locator: Locator; desc: string }[] = [];
  let p = 0;

  if (meta.testId) {
    strategies.push({ priority: p++, locator: page.getByTestId(meta.testId), desc: `testid:${meta.testId}` });
  }
  if (meta.role) {
    strategies.push({
      priority: p++,
      locator: page.getByRole(meta.role as any, { name: meta.name }),
      desc: `role:${meta.role} name:${meta.name ?? ""}`,
    });
  }
  if (meta.text) {
    strategies.push({ priority: p++, locator: page.getByText(meta.text, { exact: true }), desc: `text:${meta.text}` });
  }
  if (meta.label) {
    strategies.push({ priority: p++, locator: page.getByLabel(meta.label), desc: `label:${meta.label}` });
  }
  if (meta.placeholder) {
    strategies.push({
      priority: p++,
      locator: page.getByPlaceholder(meta.placeholder),
      desc: `placeholder:${meta.placeholder}`,
    });
  }
  if (meta.title) {
    strategies.push({ priority: p++, locator: page.locator(`[title="${meta.title}"]`), desc: `title:${meta.title}` });
  }
  if (meta.selector) {
    strategies.push({ priority: p++, locator: page.locator(meta.selector), desc: `selector:${meta.selector}` });
  }

  return strategies.map((s) => s.locator);
}

/**
 * Build smart strategy chain and return [primary, ...fallbacks].
 * Primary = highest priority strategy. Fallbacks = rest in priority order.
 */
function buildStrategyChain(
  page: Page,
  meta: StrategyMeta,
): { primary: Locator; fallbacks: Locator[]; primaryDesc: string } {
  const strategies: { priority: number; locator: Locator; desc: string }[] = [];
  let p = 0;

  if (meta.testId) {
    strategies.push({ priority: p++, locator: page.getByTestId(meta.testId), desc: `testid:${meta.testId}` });
  }
  if (meta.role) {
    strategies.push({
      priority: p++,
      locator: page.getByRole(meta.role as any, { name: meta.name }),
      desc: `role:${meta.role} name:${meta.name ?? ""}`,
    });
  }
  if (meta.text) {
    strategies.push({ priority: p++, locator: page.getByText(meta.text, { exact: true }), desc: `text:${meta.text}` });
  }
  if (meta.label) {
    strategies.push({ priority: p++, locator: page.getByLabel(meta.label), desc: `label:${meta.label}` });
  }
  if (meta.placeholder) {
    strategies.push({
      priority: p++,
      locator: page.getByPlaceholder(meta.placeholder),
      desc: `placeholder:${meta.placeholder}`,
    });
  }
  if (meta.title) {
    strategies.push({ priority: p++, locator: page.locator(`[title="${meta.title}"]`), desc: `title:${meta.title}` });
  }
  if (meta.selector) {
    strategies.push({ priority: p++, locator: page.locator(meta.selector), desc: `selector:${meta.selector}` });
  }

  const sorted = strategies.sort((a, b) => a.priority - b.priority);
  const primary = sorted[0]?.locator ?? page.getByText("__nonexistent__");
  const fallbacks = sorted.slice(1).map((s) => s.locator);
  const primaryDesc = sorted[0]?.desc ?? "unknown";

  return { primary, fallbacks, primaryDesc };
}

// ── Actions ───────────────────────────────────────────────────────

/**
 * Click using smart priority-based strategies.
 * Provide StrategyMeta — the system auto-tries testId → role → text → label → ...
 */
export async function smartClick(page: Page, meta: StrategyMeta, options?: { timeout?: number }) {
  const { primary, fallbacks, primaryDesc } = buildStrategyChain(page, meta);
  const allLocators = [primary, ...fallbacks];

  for (let i = 0; i < allLocators.length; i++) {
    try {
      const loc = allLocators[i];
      await loc.scrollIntoViewIfNeeded();
      await expect(loc).toBeVisible({ timeout: options?.timeout ?? 10000 });
      await expect(loc).toBeEnabled({ timeout: options?.timeout ?? 10000 });
      await loc.click({ timeout: options?.timeout });
      if (i > 0) {
        monitor.log({ action: "click", primary: primaryDesc, healed: describeLocator(loc), timestamp: new Date().toISOString() });
      }
      return;
    } catch {
      if (i === allLocators.length - 1) {
        // last resort: force click
        try {
          await allLocators[i].click({ force: true, timeout: options?.timeout ?? 5000 });
          return;
        } catch {
          throw new Error(`smartClick: all ${allLocators.length} strategies failed for "${primaryDesc}"`);
        }
      }
    }
  }
}

/**
 * Fill input using smart priority-based strategies.
 */
export async function smartFill(page: Page, meta: StrategyMeta, value: string, options?: { timeout?: number }) {
  const { primary, fallbacks, primaryDesc } = buildStrategyChain(page, meta);
  const allLocators = [primary, ...fallbacks];

  for (let i = 0; i < allLocators.length; i++) {
    try {
      const loc = allLocators[i];
      await loc.scrollIntoViewIfNeeded();
      await expect(loc).toBeVisible({ timeout: options?.timeout ?? 10000 });
      await expect(loc).toBeEnabled({ timeout: options?.timeout ?? 10000 });
      await loc.fill(value, { timeout: options?.timeout });
      if (i > 0) {
        monitor.log({ action: "fill", primary: primaryDesc, healed: describeLocator(loc), timestamp: new Date().toISOString() });
      }
      return;
    } catch {
      if (i === allLocators.length - 1) throw new Error(`smartFill: all ${allLocators.length} strategies failed for "${primaryDesc}"`);
    }
  }
}

/**
 * Get text content using smart priority-based strategies.
 */
export async function smartGetText(page: Page, meta: StrategyMeta, options?: { timeout?: number }): Promise<string> {
  const { primary, fallbacks, primaryDesc } = buildStrategyChain(page, meta);
  const allLocators = [primary, ...fallbacks];

  for (let i = 0; i < allLocators.length; i++) {
    try {
      const loc = allLocators[i];
      await loc.waitFor({ state: "visible", timeout: options?.timeout ?? 10000 });
      const text = await loc.textContent();
      if (i > 0) {
        monitor.log({ action: "getText", primary: primaryDesc, healed: describeLocator(loc), timestamp: new Date().toISOString() });
      }
      return text ?? "";
    } catch {
      if (i === allLocators.length - 1) throw new Error(`smartGetText: all ${allLocators.length} strategies failed for "${primaryDesc}"`);
    }
  }

  return "";
}

// ── SmartHealable: page object locator ────────────────────────────

/**
 * A page object locator with built-in priority-based fallback strategies.
 * Give it StrategyMeta — it handles the rest.
 *
 * @example
 *   class EditPage {
 *     readonly nameInput = smartLocator(this.page, {
 *       testId: 'name-input',
 *       role: 'textbox',
 *       label: 'Name',
 *       placeholder: 'Enter name',
 *     });
 *   }
 *   // await editPage.nameInput.fill('New Name');
 *   // await editPage.nameInput.click();
 */
export class SmartHealable {
  private strategies: StrategyMeta;

  constructor(
    private readonly page: Page,
    meta: StrategyMeta,
  ) {
    this.strategies = meta;
  }

  async click(options?: { timeout?: number }) {
    await smartClick(this.page, this.strategies, options);
  }

  async fill(value: string, options?: { timeout?: number }) {
    await smartFill(this.page, this.strategies, value, options);
  }

  async text(options?: { timeout?: number }): Promise<string> {
    return smartGetText(this.page, this.strategies, options);
  }
}

/** Convenience alias for `new SmartHealable(page, meta)` */
export function smartLocator(page: Page, meta: StrategyMeta): SmartHealable {
  return new SmartHealable(page, meta);
}

// ── Legacy backward compat ────────────────────────────────────────

/**
 * @deprecated Use `smartClick` with StrategyMeta instead.
 * Click with self-healing. Provide the primary locator + fallback locators.
 */
export async function healClick(primary: Locator, fallbacks: Locator[] = [], options?: { timeout?: number }) {
  const allLocators = [primary, ...fallbacks];
  const primaryDesc = describeLocator(primary);

  for (let i = 0; i < allLocators.length; i++) {
    try {
      const loc = allLocators[i];
      await loc.scrollIntoViewIfNeeded();
      await expect(loc).toBeVisible({ timeout: options?.timeout ?? 10000 });
      await expect(loc).toBeEnabled({ timeout: options?.timeout ?? 10000 });
      await loc.click({ timeout: options?.timeout });
      if (i > 0) monitor.log({ action: "click", primary: primaryDesc, healed: describeLocator(loc), timestamp: new Date().toISOString() });
      return;
    } catch {
      if (i === allLocators.length - 1) {
        try { await allLocators[i].click({ force: true, timeout: 5000 }); return; } catch { /**/ }
      }
    }
  }
  throw new Error(`healClick: all strategies failed for "${primaryDesc}"`);
}

/**
 * @deprecated Use `smartFill` with StrategyMeta instead.
 */
export async function healFill(primary: Locator, value: string, fallbacks: Locator[] = [], options?: { timeout?: number }) {
  const allLocators = [primary, ...fallbacks];
  const primaryDesc = describeLocator(primary);

  for (let i = 0; i < allLocators.length; i++) {
    try {
      const loc = allLocators[i];
      await loc.scrollIntoViewIfNeeded();
      await expect(loc).toBeVisible({ timeout: options?.timeout ?? 10000 });
      await expect(loc).toBeEnabled({ timeout: options?.timeout ?? 10000 });
      await loc.fill(value, { timeout: options?.timeout });
      if (i > 0) monitor.log({ action: "fill", primary: primaryDesc, healed: describeLocator(loc), timestamp: new Date().toISOString() });
      return;
    } catch {
      if (i === allLocators.length - 1) throw new Error(`healFill: all strategies failed for "${primaryDesc}"`);
    }
  }
}

/**
 * @deprecated Use `buildSmartStrategies` instead.
 */
export function buildFallbacks(page: Page, meta: StrategyMeta): Locator[] {
  return buildSmartStrategies(page, meta);
}

/**
 * @deprecated Use `SmartHealable` with StrategyMeta, or `smartLocator` instead.
 */
export class Healable {
  constructor(
    private readonly page: Page,
    private readonly primary: Locator,
    private readonly fallbacks: Locator[] = [],
  ) {}

  async click(options?: { timeout?: number }) {
    await healClick(this.primary, this.fallbacks, options);
  }

  async fill(value: string, options?: { timeout?: number }) {
    await healFill(this.primary, value, this.fallbacks, options);
  }

  locator(): Locator {
    return this.primary;
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function describeLocator(loc: Locator): string {
  try {
    return (loc as any)._selector ?? loc.toString();
  } catch {
    return "unknown";
  }
}

/**
 * Reset the heal log (useful in test hooks).
 */
export function resetHealLog() {
  try {
    if (fs.existsSync(HEAL_LOG_PATH)) fs.unlinkSync(HEAL_LOG_PATH);
  } catch {
    // silent
  }
}

/**
 * Read all recorded heal events (useful for post-run analysis).
 */
export function readHealLog(): HealEvent[] {
  try {
    if (fs.existsSync(HEAL_LOG_PATH)) {
      return JSON.parse(fs.readFileSync(HEAL_LOG_PATH, "utf-8"));
    }
  } catch {
    // silent
  }
  return [];
}
