import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { smartLocator } from "@utils/heal-utils";

/** Widget tabs on /streamer/overlays. Verified live 2026-09-04 — there are 15. */
export type OverlayWidgetTab =
  | "alert-tts"
  | "media-share"
  | "merged"
  | "vipqueue"
  | "songshare"
  | "spinwheel"
  | "milestone"
  | "leaderboard"
  | "qrcode"
  | "subathon"
  | "subathongacha"
  | "runningtext"
  | "runningtextoverlay"
  | "featuredproduct"
  | "voting";

/** Minimal structural shapes for browser-context code — this repo's tsconfig has no `dom` lib. */
type SwitchElement = {
  parentElement: BlockElement | null;
  getAttribute: (name: string) => string | null;
  dispatchEvent: (event: unknown) => boolean;
};
type BlockElement = { innerText: string; parentElement: BlockElement | null };
type FieldElement = {
  value: string;
  disabled: boolean;
  readOnly: boolean;
  offsetParent: unknown;
  getBoundingClientRect: () => { width: number; height: number };
  focus: () => void;
  closest: (selector: string) => { parentElement: { textContent: string | null } | null } | null;
};
type ButtonElement = { innerText: string };

type BrowserRoot = {
  document: {
    activeElement: unknown;
    body: { innerText: string; classList: { remove: (...tokens: string[]) => void } };
    querySelector: (selector: string) => FieldElement | null;
    querySelectorAll: (selector: string) => ArrayLike<unknown>;
  };
  getComputedStyle: (el: unknown) => { pointerEvents: string };
  MouseEvent: new (type: string, init: { bubbles: boolean; cancelable: boolean }) => unknown;
};

/**
 * The single page that hosts every streamer widget, one per `activeTab`.
 *
 * Three verified mechanics shape this page object; the evidence is in
 * `.agents/rules/mcp-playwright.md`:
 *
 * 1. Settings live in Radix accordions that start **closed**. A closed panel keeps its
 *    inputs in the DOM, so they read correctly but **cannot take focus** — typing into
 *    one silently writes nothing. `typeInto` refuses to type until the field proves it
 *    can hold focus.
 * 2. `SAVE` is gated by `pointer-events`, not `disabled`. It is inert until the form is
 *    dirty, at which point an "N unsaved change" counter appears.
 * 3. Some widgets gate every field behind a master switch — Subathon Gacha leaves 8 of
 *    14 inputs `disabled` until it is on.
 */
export class StreamerOverlaysPage {
  constructor(public readonly page: Page, private readonly baseURL: string) {}

  readonly saveButton = smartLocator(this.page, { role: "button", name: "SAVE", exact: true });
  readonly discardButton = smartLocator(this.page, { role: "button", name: "DISCARD", exact: true });
  readonly copyLinkButton = smartLocator(this.page, { role: "button", name: "COPY", exact: true });
  readonly launchButton = smartLocator(this.page, { role: "button", name: "LAUNCH", exact: true });
  readonly rotateKeyButton = smartLocator(this.page, { role: "button", name: "ROTATE KEY", exact: true });
  readonly keepCurrentKeyButton = smartLocator(this.page, { role: "button", name: "KEEP CURRENT KEY", exact: true });
  readonly presetOriginal = smartLocator(this.page, { role: "button", name: "ORIGINAL" });
  readonly presetSimple = smartLocator(this.page, { role: "button", name: "SIMPLE" });
  readonly resetAppearanceButton = smartLocator(this.page, { role: "button", name: "Reset appearance to defaults" });

  /**
   * The widget panel is client-rendered and arrives well after `load`, so navigation
   * waits for a control that every widget carries before handing back. Without this the
   * page reads as empty and every later assertion fails for the wrong reason.
   */
  async goto(tab: OverlayWidgetTab = "alert-tts") {
    const url = new URL("streamer/overlays", this.baseURL);
    url.searchParams.set("activeTab", tab);
    await this.page.goto(url.toString());
    await this.page.waitForURL(new RegExp(`activeTab=${tab}`), { timeout: 30000 });
    // Client-side navigation keeps the previous tab's DOM mounted, so waiting on a
    // control that every widget shares passes instantly and proves nothing. Wait for
    // the panel to settle instead.
    await this.page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => undefined);
    await this.page.waitForTimeout(2500);
    await this.dismissTour();
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/streamer\/overlays/);
    expect(this.page.url()).not.toContain("/auth");
  }

  /**
   * The creator first-run tour re-arms on every load and intercepts pointer events.
   * The tour itself is a real feature (see `.agents/knowledge/onboarding.md`);
   * it is cleared here only so widget controls become reachable.
   */
  async dismissTour() {
    await this.page
      .evaluate(() => {
        const root = globalThis as unknown as BrowserRoot;
        Array.from(root.document.querySelectorAll(".driver-overlay,.driver-popover,svg.driver-overlay")).forEach(
          (el) => (el as { remove: () => void }).remove(),
        );
        root.document.body.classList.remove("driver-active", "driver-fade", "driver-simple");
      })
      .catch(() => undefined);
  }

  /** Reads a switch state without needing the switch to be clickable. */
  async switchState(label: string): Promise<boolean | null> {
    return this.page.evaluate((text) => {
      const root = globalThis as unknown as BrowserRoot;
      const list = Array.from(root.document.querySelectorAll('button[role="switch"]')) as SwitchElement[];
      for (const el of list) {
        let box = el.parentElement;
        for (let depth = 0; depth < 4 && box; depth += 1) {
          if ((box.innerText || "").includes(text)) return el.getAttribute("aria-checked") === "true";
          box = box.parentElement;
        }
      }
      return null;
    }, label);
  }

  /**
   * Toggles a switch found by the text of the block it sits in — these switches carry
   * no label, id or test id, so the surrounding text is the only handle.
   *
   * A dispatched click is used deliberately: accordion `section`s on this page
   * intercept pointer events, and a dispatched event was verified to drive these Radix
   * switches reliably where a real click times out.
   */
  async toggleSwitch(label: string) {
    const before = await this.switchState(label);
    if (before === null) throw new Error(`toggleSwitch: no switch found near text "${label}"`);

    const outcome = await this.page.evaluate((text) => {
      const root = globalThis as unknown as BrowserRoot;
      const list = Array.from(root.document.querySelectorAll('button[role="switch"]')) as SwitchElement[];
      for (const el of list) {
        let box = el.parentElement;
        for (let depth = 0; depth < 4 && box; depth += 1) {
          if ((box.innerText || "").includes(text)) {
            const node = el as unknown as { offsetParent: unknown; getBoundingClientRect: () => { width: number; height: number } };
            const rect = node.getBoundingClientRect();
            if (node.offsetParent === null || !rect.width || !rect.height) return "not-rendered";
            el.dispatchEvent(new root.MouseEvent("click", { bubbles: true, cancelable: true }));
            return "clicked";
          }
          box = box.parentElement;
        }
      }
      return "not-found";
    }, label);

    if (outcome === "not-rendered") {
      throw new Error(
        `toggleSwitch: the switch near "${label}" is in the DOM but not rendered, so the click cannot land. ` +
          `Call expandAllPanels() or openAccordion() first.`,
      );
    }
    await expect
      .poll(() => this.switchState(label), { timeout: 8000, message: `switch "${label}" never changed state` })
      .toBe(!before);
  }

  /**
   * Expands every panel on the tab so its controls become rendered — and therefore
   * focusable and clickable. Destructive triggers share the same collapsed-button shape
   * as accordion headers, so `ROTATE KEY`, `DISCARD` and `RESET` are excluded by name:
   * a blanket pass opens the rotate-key confirm, whose overlay then swallows every
   * later click.
   */
  async expandAllPanels() {
    for (let pass = 0; pass < 5; pass += 1) {
      const clicked = await this.page.evaluate(() => {
        const root = globalThis as unknown as BrowserRoot;
        const destructive = /rotate|delete|hapus|remove|discard|reset/i;
        const headers = (Array.from(root.document.querySelectorAll('button[data-state="closed"]')) as ButtonElement[])
          .filter((b) => !destructive.test(b.innerText || ""));
        headers.forEach((b) => (b as unknown as { click: () => void }).click());
        return headers.length;
      });
      await this.page.waitForTimeout(600);
      if (clicked === 0) return;
    }
  }

  /**
   * Opens one accordion by its header text. Headers report their state through either
   * `data-state` or `aria-expanded` depending on the widget, so both are accepted.
   */
  async openAccordion(name: string) {
    const header = this.page.getByRole("button", { name: new RegExp(name, "i") }).first();
    if ((await header.count()) === 0) throw new Error(`openAccordion: no header matching "${name}"`);

    const isOpen = async () =>
      (await header.getAttribute("data-state")) === "open" || (await header.getAttribute("aria-expanded")) === "true";

    if (await isOpen()) return;
    await header.scrollIntoViewIfNeeded();
    await header.click();
    await expect
      .poll(isOpen, { timeout: 10000, message: `accordion "${name}" never reported open` })
      .toBe(true);
    await this.page.waitForTimeout(400);
  }

  /**
   * True only when the field is rendered AND actually took focus. A field inside a
   * closed accordion reads fine and reports `disabled:false` yet silently swallows
   * every keystroke, so this is the only trustworthy pre-check before typing.
   */
  async isTypeable(fieldName: string): Promise<boolean> {
    return this.page.evaluate((name) => {
      const root = globalThis as unknown as BrowserRoot;
      const el = root.document.querySelector(`input[name="${name}"], textarea[name="${name}"]`);
      if (!el || el.disabled || el.readOnly) return false;
      if (el.offsetParent === null) return false;
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) return false;
      el.focus();
      return root.document.activeElement === (el as unknown);
    }, fieldName);
  }

  /**
   * Types with the real keyboard so `maxlength` applies, and fails loudly when the
   * field cannot hold focus instead of silently writing nothing.
   */
  async typeInto(fieldName: string, value: string, options: { clear?: boolean } = {}) {
    if (!(await this.isTypeable(fieldName))) {
      throw new Error(
        `typeInto: input[name="${fieldName}"] cannot take focus. It is most likely inside a closed ` +
          `accordion, or gated by a master switch — open the accordion (openAccordion) or enable the widget first.`,
      );
    }
    if (options.clear !== false) {
      await this.page.keyboard.press("Control+A");
      await this.page.keyboard.press("Backspace");
    }
    if (value) await this.page.keyboard.type(value, { delay: 4 });
    await this.page.waitForTimeout(300);
  }

  async fieldValue(fieldName: string): Promise<string | null> {
    return this.page.evaluate((name) => {
      const root = globalThis as unknown as BrowserRoot;
      const el = root.document.querySelector(`input[name="${name}"], textarea[name="${name}"]`);
      return el ? el.value : null;
    }, fieldName);
  }

  /** The `n/limit` counter rendered beside a field, e.g. "17/45". */
  async fieldCounter(fieldName: string): Promise<string | null> {
    return this.page.evaluate((name) => {
      const root = globalThis as unknown as BrowserRoot;
      const el = root.document.querySelector(`input[name="${name}"], textarea[name="${name}"]`);
      const text = el?.closest("div")?.parentElement?.textContent ?? "";
      return text.match(/\d+\s*\/\s*\d+/)?.[0] ?? null;
    }, fieldName);
  }

  /** How many pending edits the page reports, read from the "N unsaved change" counter. */
  async unsavedCount(): Promise<number> {
    const text = await this.page.locator("body").innerText();
    const match = text.match(/(\d+)\s+unsaved\s+change/i);
    return match ? Number(match[1]) : 0;
  }

  /** SAVE is inert until the form is dirty — via `pointer-events`, not `disabled`. */
  async isSaveActive(): Promise<boolean> {
    return this.page.evaluate(() => {
      const root = globalThis as unknown as BrowserRoot;
      const el = (Array.from(root.document.querySelectorAll("button")) as ButtonElement[]).find((b) =>
        /^SAVE$/i.test((b.innerText || "").trim()),
      );
      return el ? root.getComputedStyle(el).pointerEvents !== "none" : false;
    });
  }

  async save() {
    if (!(await this.isSaveActive())) {
      throw new Error("save: SAVE is inert (pointer-events: none) — nothing is dirty, so there is nothing to save.");
    }
    await this.saveButton.click();
    await this.page.waitForTimeout(2000);
  }

  async expectSaved() {
    await expect
      .poll(() => this.unsavedCount(), { timeout: 15000, message: "unsaved-change counter never cleared after SAVE" })
      .toBe(0);
  }

  /**
   * The cross-widget appearance contract: both presets and the reset control exist on
   * every widget. A Font picker is deliberately **not** asserted — it is optional per
   * widget (present on milestone and subathon, absent from songshare, qrcode, voting
   * and leaderboard, verified 2026-09-04).
   */
  async expectAppearanceContract() {
    expect(await this.presetOriginal.visibleCount(), "ORIGINAL preset missing").toBeGreaterThan(0);
    expect(await this.presetSimple.visibleCount(), "SIMPLE preset missing").toBeGreaterThan(0);
    expect(await this.resetAppearanceButton.visibleCount(), "Reset appearance control missing").toBeGreaterThan(0);
  }

  /** Whether this widget offers a Font picker at all. */
  async hasFontPicker(): Promise<boolean> {
    return (await this.page.getByRole("button", { name: /^Font\b/ }).count()) > 0;
  }
}
