import type { APIRequestContext } from '@playwright/test';
import { restoreAppearance, snapshotAppearance, type AppearanceSnapshot } from '@helpers/api/profile-appearance';

export type AppearanceFixtures = {
  /**
   * The creator's `/customize` state (profile text, interests, social links, theme, tip button, quick amounts)
   * as it was before the test; restored in teardown, even when the test fails. Request it in any
   * test that saves on `/customize`. Banner and picture need `dbFixtures.protectAppearanceMedia()`.
   */
  creatorAppearance: AppearanceSnapshot;
};

export const appearanceFixtures = {
  creatorAppearance: async ({ request }: { request: APIRequestContext }, use: (snapshot: AppearanceSnapshot) => Promise<void>) => {
    const snapshot = await snapshotAppearance(request);
    try {
      await use(snapshot);
    } finally {
      await restoreAppearance(request, snapshot);
    }
  },
};
