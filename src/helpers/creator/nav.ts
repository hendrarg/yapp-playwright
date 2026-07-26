import type { AffiliatePage } from "@pages/creator/AffiliatePage";
import type { AnalyticsPage } from "@pages/creator/AnalyticsPage";
import type { CampaignsPage } from "@pages/creator/CampaignsPage";
import type { FeedsPage } from "@pages/creator/FeedsPage";
import type { MembershipPage } from "@pages/creator/MembershipPage";
import type { MessagesPage } from "@pages/creator/MessagesPage";
import type { OrdersPage } from "@pages/creator/OrdersPage";
import type { ProductsPage } from "@pages/creator/ProductsPage";
import type { ProfilePage } from "@pages/creator/ProfilePage";
import type { PromotionsPage } from "@pages/creator/PromotionsPage";
import type { ReferralPage } from "@pages/creator/ReferralPage";
import type { SessionsPage } from "@pages/creator/SessionsPage";
import type { SettingsPage } from "@pages/creator/SettingsPage";
import type { StreamingPage } from "@pages/creator/StreamingPage";
import type { WalletPage } from "@pages/creator/WalletPage";

export type CreatorRoute =
  | "affiliate"
  | "analytics"
  | "campaigns"
  | "feeds"
  | "membership"
  | "messages"
  | "direct"
  | "orders"
  | "products"
  | "profile"
  | "promotions"
  | "referral"
  | "sessions"
  | "consultation"
  | "settings"
  | "streaming"
  | "wallet";

export type CreatorNavParams = Record<string, never>;

export type CreatorNavPages = {
  affiliatePage: AffiliatePage;
  analyticsPage: AnalyticsPage;
  campaignsPage: CampaignsPage;
  creatorFeedsPage: FeedsPage;
  membershipPage: MembershipPage;
  messagesPage: MessagesPage;
  ordersPage: OrdersPage;
  productsPage: ProductsPage;
  creatorProfilePage: ProfilePage;
  promotionsPage: PromotionsPage;
  referralPage: ReferralPage;
  sessionsPage: SessionsPage;
  settingsPage: SettingsPage;
  streamingPage: StreamingPage;
  walletPage: WalletPage;
};

function normalizeRoute(route: CreatorRoute): Exclude<CreatorRoute, "direct" | "consultation"> {
  if (route === "direct") return "messages";
  if (route === "consultation") return "sessions";
  return route;
}

export type CreatorNav = ReturnType<typeof createCreatorNav>;

export function createCreatorNav(pages: CreatorNavPages) {
  return {
    async goto(route: CreatorRoute, _params: CreatorNavParams = {}) {
      switch (normalizeRoute(route)) {
        case "affiliate":
          await pages.affiliatePage.goto();
          return;
        case "analytics":
          await pages.analyticsPage.goto();
          return;
        case "campaigns":
          await pages.campaignsPage.goto();
          return;
        case "feeds":
          await pages.creatorFeedsPage.goto();
          return;
        case "membership":
          await pages.membershipPage.goto();
          return;
        case "messages":
          await pages.messagesPage.goto();
          return;
        case "orders":
          await pages.ordersPage.goto();
          return;
        case "products":
          await pages.productsPage.goto();
          return;
        case "profile":
          await pages.creatorProfilePage.goto();
          return;
        case "promotions":
          await pages.promotionsPage.goto();
          return;
        case "referral":
          await pages.referralPage.goto();
          return;
        case "sessions":
          await pages.sessionsPage.goto();
          return;
        case "settings":
          await pages.settingsPage.goto();
          return;
        case "streaming":
          await pages.streamingPage.goto();
          return;
        case "wallet":
          await pages.walletPage.goto();
          return;
        default:
          throw new Error(`Unknown creator route: ${String(route)}`);
      }
    },

    async expectLoaded(route: CreatorRoute, _params: CreatorNavParams = {}) {
      switch (normalizeRoute(route)) {
        case "affiliate":
          await pages.affiliatePage.expectLoaded();
          return;
        case "analytics":
          await pages.analyticsPage.expectLoaded();
          return;
        case "campaigns":
          await pages.campaignsPage.expectLoaded();
          return;
        case "feeds":
          await pages.creatorFeedsPage.expectLoaded();
          return;
        case "membership":
          await pages.membershipPage.expectLoaded();
          return;
        case "messages":
          await pages.messagesPage.expectLoaded();
          return;
        case "orders":
          await pages.ordersPage.expectLoaded();
          return;
        case "products":
          await pages.productsPage.expectLoaded();
          return;
        case "profile":
          await pages.creatorProfilePage.expectLoaded();
          return;
        case "promotions":
          await pages.promotionsPage.expectLoaded();
          return;
        case "referral":
          await pages.referralPage.expectLoaded();
          return;
        case "sessions":
          await pages.sessionsPage.expectLoaded();
          return;
        case "settings":
          await pages.settingsPage.expectLoaded();
          return;
        case "streaming":
          await pages.streamingPage.expectLoaded();
          return;
        case "wallet":
          await pages.walletPage.expectLoaded();
          return;
        default:
          throw new Error(`Unknown creator route: ${String(route)}`);
      }
    },

    async open(route: CreatorRoute, params?: CreatorNavParams) {
      await this.goto(route, params);
      await this.expectLoaded(route, params);
    },
  };
}
