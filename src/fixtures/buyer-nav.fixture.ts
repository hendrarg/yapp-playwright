import { createBuyerNav, type BuyerNav } from "@helpers/buyer/nav";
import type { PageFixtures } from "./page.fixtures";

export type BuyerNavFixtures = {
  buyerNav: BuyerNav;
};

type BuyerNavDeps = Pick<
  PageFixtures,
  | "buyerFeedsPage"
  | "explorePage"
  | "landingPage"
  | "cartPage"
  | "libraryPage"
  | "messagePage"
  | "buyerProfilePage"
  | "tipPage"
  | "buyerMembershipPage"
  | "tierDetailPage"
  | "transactionPage"
  | "productPurchasePage"
>;

export const buyerNavFixtures = {
  buyerNav: async (
    {
      buyerFeedsPage,
      explorePage,
      landingPage,
      cartPage,
      libraryPage,
      messagePage,
      buyerProfilePage,
      tipPage,
      buyerMembershipPage,
      tierDetailPage,
      transactionPage,
      productPurchasePage,
    }: BuyerNavDeps,
    use: (nav: BuyerNav) => Promise<void>,
  ) => {
    await use(
      createBuyerNav({
        buyerFeedsPage,
        explorePage,
        landingPage,
        cartPage,
        libraryPage,
        messagePage,
        buyerProfilePage,
        tipPage,
        buyerMembershipPage,
        tierDetailPage,
        transactionPage,
        productPurchasePage,
      }),
    );
  },
};
