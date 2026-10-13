import type { Browser } from '@playwright/test';
import { baseURL } from '@config/env';
import { ProfilePage } from '@pages/buyer/ProfilePage';

/**
 * Open the creator's public page as a guest — a fresh context, because the creator's own signed-in
 * context keeps serving its cached account (e.g. the previous banner) right after a save.
 */
export async function withPublicProfile(browser: Browser, handle: string, run: (profile: ProfilePage) => Promise<void>) {
  const guest = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  try {
    const tab = await guest.newPage();
    await tab.goto(new URL(handle, baseURL).toString(), { waitUntil: 'domcontentloaded' });
    await run(new ProfilePage(tab, baseURL));
  } finally {
    await guest.close();
  }
}
