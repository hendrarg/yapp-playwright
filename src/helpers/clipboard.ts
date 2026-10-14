import type { BrowserContext } from '@playwright/test';

/**
 * Paste the clipboard into a plain text field on a blank page — an "external share target" with no
 * app logic — and return what arrived. Needs `clipboard-read` / `clipboard-write` on the context.
 */
export async function pasteIntoExternalField(context: BrowserContext): Promise<string> {
  const page = await context.newPage();
  try {
    await page.setContent('<textarea aria-label="share target"></textarea>');
    const field = page.getByRole('textbox', { name: 'share target' });
    await field.focus();
    await page.keyboard.press('ControlOrMeta+v');
    return await field.inputValue();
  } finally {
    await page.close();
  }
}
