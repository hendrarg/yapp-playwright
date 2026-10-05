import { DbFixtures } from '@helpers/db/fixtures';

export type DbFixtureFixtures = {
  /** Guarded dev-DB writes; every change is restored after the test. Needs YAPP_DB_FIXTURES=1. */
  dbFixtures: DbFixtures;
};

export const dbFixtureFixtures = {
  dbFixtures: async ({}, use: (db: DbFixtures) => Promise<void>) => {
    const db = new DbFixtures();
    try {
      await use(db);
    } finally {
      await db.restoreAll();
    }
  },
};
