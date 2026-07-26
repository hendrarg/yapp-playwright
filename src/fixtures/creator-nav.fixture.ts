import { createCreatorNav, type CreatorNav } from "@helpers/creator/nav";
import type { PageFixtures } from "./page.fixtures";

export type CreatorNavFixtures = {
  creatorNav: CreatorNav;
};

type CreatorNavDeps = Pick<
  PageFixtures,
  | "affiliatePage"
  | "analyticsPage"
  | "campaignsPage"
  | "creatorFeedsPage"
  | "membershipPage"
  | "messagesPage"
  | "ordersPage"
  | "productsPage"
  | "creatorProfilePage"
  | "promotionsPage"
  | "referralPage"
  | "sessionsPage"
  | "settingsPage"
  | "streamingPage"
  | "walletPage"
>;

export const creatorNavFixtures = {
  creatorNav: async (
    {
      affiliatePage,
      analyticsPage,
      campaignsPage,
      creatorFeedsPage,
      membershipPage,
      messagesPage,
      ordersPage,
      productsPage,
      creatorProfilePage,
      promotionsPage,
      referralPage,
      sessionsPage,
      settingsPage,
      streamingPage,
      walletPage,
    }: CreatorNavDeps,
    use: (nav: CreatorNav) => Promise<void>,
  ) => {
    await use(
      createCreatorNav({
        affiliatePage,
        analyticsPage,
        campaignsPage,
        creatorFeedsPage,
        membershipPage,
        messagesPage,
        ordersPage,
        productsPage,
        creatorProfilePage,
        promotionsPage,
        referralPage,
        sessionsPage,
        settingsPage,
        streamingPage,
        walletPage,
      }),
    );
  },
};
