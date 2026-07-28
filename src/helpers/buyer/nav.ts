import type { ExplorePage } from "@pages/buyer/ExplorePage";
import type { LandingPage } from "@pages/buyer/LandingPage";
import type { CartPage } from "@pages/buyer/CartPage";
import type { FeedsPage } from "@pages/buyer/FeedsPage";
import type { LibraryPage } from "@pages/buyer/LibraryPage";
import type { MembershipPage } from "@pages/buyer/MembershipPage";
import type { MessagePage } from "@pages/buyer/MessagePage";
import type { ProductPurchasePage } from "@pages/buyer/ProductPurchasePage";
import type { ProfilePage } from "@pages/buyer/ProfilePage";
import type { TierDetailPage } from "@pages/buyer/TierDetailPage";
import type { TipPage } from "@pages/buyer/TipPage";
import type { TransactionPage } from "@pages/buyer/TransactionPage";
import type { PurchaseProduct } from "@test-data/buyer/promotion.data";

export type BuyerRoute =
  | "feeds"
  | "explore"
  | "landing"
  | "cart"
  | "library"
  | "messages"
  | "direct"
  | "profile"
  | "tip"
  | "sendTip"
  | "membership"
  | "tierDetail"
  | "transaction"
  | "productPurchase";

export type BuyerNavParams = {
  handle?: string;
  tierId?: string;
  orderId?: string;
  amount?: string;
  product?: PurchaseProduct;
};

export type BuyerNavPages = {
  buyerFeedsPage: FeedsPage;
  explorePage: ExplorePage;
  landingPage: LandingPage;
  cartPage: CartPage;
  libraryPage: LibraryPage;
  messagePage: MessagePage;
  buyerProfilePage: ProfilePage;
  tipPage: TipPage;
  buyerMembershipPage: MembershipPage;
  tierDetailPage: TierDetailPage;
  transactionPage: TransactionPage;
  productPurchasePage: ProductPurchasePage;
};

function normalizeRoute(route: BuyerRoute): Exclude<BuyerRoute, "direct" | "sendTip"> {
  if (route === "direct") return "messages";
  if (route === "sendTip") return "tip";
  return route;
}

function requireParam(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`buyerNav.${name} requires params.${name}`);
  }
  return value;
}

export type BuyerNav = ReturnType<typeof createBuyerNav>;

export function createBuyerNav(pages: BuyerNavPages) {
  return {
    async goto(route: BuyerRoute, params: BuyerNavParams = {}) {
      switch (normalizeRoute(route)) {
        case "feeds":
          await pages.buyerFeedsPage.goto();
          return;
        case "explore":
          await pages.explorePage.goto();
          return;
        case "landing":
          await pages.landingPage.goto();
          return;
        case "cart":
          await pages.cartPage.goto();
          return;
        case "library":
          await pages.libraryPage.goto();
          return;
        case "messages":
          await pages.messagePage.goto();
          return;
        case "profile":
          await pages.buyerProfilePage.goto(params.handle);
          return;
        case "tip":
          await pages.tipPage.goto(requireParam("handle", params.handle), params.amount);
          return;
        case "membership":
          await pages.buyerMembershipPage.goto(requireParam("handle", params.handle));
          return;
        case "tierDetail":
          await pages.tierDetailPage.goto(
            requireParam("handle", params.handle),
            requireParam("tierId", params.tierId),
          );
          return;
        case "transaction":
          await pages.transactionPage.goto(requireParam("orderId", params.orderId));
          return;
        case "productPurchase": {
          if (!params.product) {
            throw new Error("buyerNav.productPurchase requires params.product");
          }
          await pages.productPurchasePage.goto(params.product);
          return;
        }
        default:
          throw new Error(`Unknown buyer route: ${String(route)}`);
      }
    },

    async expectLoaded(route: BuyerRoute, params: BuyerNavParams = {}) {
      switch (normalizeRoute(route)) {
        case "feeds":
          await pages.buyerFeedsPage.expectLoaded();
          return;
        case "explore":
          await pages.explorePage.expectLoaded();
          return;
        case "landing":
          await pages.landingPage.expectLoaded();
          return;
        case "cart":
          await pages.cartPage.expectLoaded();
          return;
        case "library":
          await pages.libraryPage.expectLoaded();
          return;
        case "messages":
          await pages.messagePage.expectLoaded();
          return;
        case "profile":
          await pages.buyerProfilePage.expectLoaded();
          return;
        case "tip":
          await pages.tipPage.expectLoaded();
          return;
        case "membership":
          await pages.buyerMembershipPage.expectLoaded();
          return;
        case "tierDetail":
          await pages.tierDetailPage.expectLoaded();
          return;
        case "transaction":
          await pages.transactionPage.expectLoaded();
          return;
        case "productPurchase": {
          if (!params.product) {
            throw new Error("buyerNav.productPurchase requires params.product");
          }
          await pages.productPurchasePage.expectLoaded(params.product);
          return;
        }
        default:
          throw new Error(`Unknown buyer route: ${String(route)}`);
      }
    },

    async open(route: BuyerRoute, params?: BuyerNavParams) {
      await this.goto(route, params);
      await this.expectLoaded(route, params);
    },
  };
}
