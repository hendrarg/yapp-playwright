import { LoginPage } from "@pages/auth/LoginPage";
import { ExplorePage } from "@pages/buyer/ExplorePage";
import { CartPage } from "@pages/buyer/CartPage";
import { FeedsPage as BuyerFeedsPage } from "@pages/buyer/FeedsPage";
import { LibraryPage } from "@pages/buyer/LibraryPage";
import { MessagePage } from "@pages/buyer/MessagePage";
import { ProfilePage as BuyerProfilePage } from "@pages/buyer/ProfilePage";
import { AffiliatePage } from "@pages/creator/AffiliatePage";
import { AnalyticsPage } from "@pages/creator/AnalyticsPage";
import { CampaignsPage } from "@pages/creator/CampaignsPage";
import { FeedsPage as CreatorFeedsPage } from "@pages/creator/FeedsPage";
import { MembershipPage } from "@pages/creator/MembershipPage";
import { MessagesPage } from "@pages/creator/MessagesPage";
import { OrdersPage } from "@pages/creator/OrdersPage";
import { ProductsPage } from "@pages/creator/ProductsPage";
import { ProfilePage as CreatorProfilePage } from "@pages/creator/ProfilePage";
import { PromotionsPage } from "@pages/creator/PromotionsPage";
import { ReferralPage } from "@pages/creator/ReferralPage";
import { SessionsPage } from "@pages/creator/SessionsPage";
import { SettingsPage } from "@pages/creator/SettingsPage";
import { StreamingPage } from "@pages/creator/StreamingPage";
import { WalletPage } from "@pages/creator/WalletPage";
import { baseURL, creatorsBaseURL } from "@config/env";

export type PageFixtures = {
  loginPage: LoginPage;
  explorePage: ExplorePage;
  cartPage: CartPage;
  buyerFeedsPage: BuyerFeedsPage;
  libraryPage: LibraryPage;
  messagePage: MessagePage;
  buyerProfilePage: BuyerProfilePage;
  affiliatePage: AffiliatePage;
  analyticsPage: AnalyticsPage;
  campaignsPage: CampaignsPage;
  creatorFeedsPage: CreatorFeedsPage;
  membershipPage: MembershipPage;
  messagesPage: MessagesPage;
  ordersPage: OrdersPage;
  productsPage: ProductsPage;
  creatorProfilePage: CreatorProfilePage;
  promotionsPage: PromotionsPage;
  referralPage: ReferralPage;
  sessionsPage: SessionsPage;
  settingsPage: SettingsPage;
  streamingPage: StreamingPage;
  walletPage: WalletPage;
};

export const pageFixtures = {
  loginPage: async ({ page }: any, use: any) => {
    await use(new LoginPage(page));
  },

  explorePage: async ({ page }: any, use: any) => {
    await use(new ExplorePage(page, baseURL));
  },

  cartPage: async ({ page }: any, use: any) => {
    await use(new CartPage(page, baseURL));
  },

  buyerFeedsPage: async ({ page }: any, use: any) => {
    await use(new BuyerFeedsPage(page, baseURL));
  },

  libraryPage: async ({ page }: any, use: any) => {
    await use(new LibraryPage(page, baseURL));
  },

  messagePage: async ({ page }: any, use: any) => {
    await use(new MessagePage(page, baseURL));
  },

  buyerProfilePage: async ({ page }: any, use: any) => {
    await use(new BuyerProfilePage(page, baseURL));
  },

  affiliatePage: async ({ page }: any, use: any) => {
    await use(new AffiliatePage(page, creatorsBaseURL));
  },

  analyticsPage: async ({ page }: any, use: any) => {
    await use(new AnalyticsPage(page, creatorsBaseURL));
  },

  campaignsPage: async ({ page }: any, use: any) => {
    await use(new CampaignsPage(page, creatorsBaseURL));
  },

  creatorFeedsPage: async ({ page }: any, use: any) => {
    await use(new CreatorFeedsPage(page, creatorsBaseURL));
  },

  membershipPage: async ({ page }: any, use: any) => {
    await use(new MembershipPage(page, creatorsBaseURL));
  },

  messagesPage: async ({ page }: any, use: any) => {
    await use(new MessagesPage(page, creatorsBaseURL));
  },

  ordersPage: async ({ page }: any, use: any) => {
    await use(new OrdersPage(page, creatorsBaseURL));
  },

  productsPage: async ({ page }: any, use: any) => {
    await use(new ProductsPage(page, creatorsBaseURL));
  },

  creatorProfilePage: async ({ page }: any, use: any) => {
    await use(new CreatorProfilePage(page, creatorsBaseURL));
  },

  promotionsPage: async ({ page }: any, use: any) => {
    await use(new PromotionsPage(page, creatorsBaseURL));
  },

  referralPage: async ({ page }: any, use: any) => {
    await use(new ReferralPage(page, creatorsBaseURL));
  },

  sessionsPage: async ({ page }: any, use: any) => {
    await use(new SessionsPage(page, creatorsBaseURL));
  },

  settingsPage: async ({ page }: any, use: any) => {
    await use(new SettingsPage(page, creatorsBaseURL));
  },

  streamingPage: async ({ page }: any, use: any) => {
    await use(new StreamingPage(page, creatorsBaseURL));
  },

  walletPage: async ({ page }: any, use: any) => {
    await use(new WalletPage(page, creatorsBaseURL));
  },
};
