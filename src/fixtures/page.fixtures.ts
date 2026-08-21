import type { Page } from "@playwright/test";
import { LoginPage } from "@pages/auth/LoginPage";
import { ExplorePage } from "@pages/buyer/ExplorePage";
import { LandingPage } from "@pages/buyer/LandingPage";
import { CartPage } from "@pages/buyer/CartPage";
import { ProductPurchasePage } from "@pages/buyer/ProductPurchasePage";
import { FeedsPage as BuyerFeedsPage } from "@pages/buyer/FeedsPage";
import { LibraryPage } from "@pages/buyer/LibraryPage";
import { MembershipPage as BuyerMembershipPage } from "@pages/buyer/MembershipPage";
import { MessagePage } from "@pages/buyer/MessagePage";
import { ProfilePage as BuyerProfilePage } from "@pages/buyer/ProfilePage";
import { TierDetailPage } from "@pages/buyer/TierDetailPage";
import { TipPage } from "@pages/buyer/TipPage";
import { TransactionPage } from "@pages/buyer/TransactionPage";
import { AffiliatePage } from "@pages/creator/AffiliatePage";
import { AnalyticsPage } from "@pages/creator/AnalyticsPage";
import { CampaignsPage } from "@pages/creator/CampaignsPage";
import { CustomizePage } from "@pages/creator/CustomizePage";
import { FeedsPage as CreatorFeedsPage } from "@pages/creator/FeedsPage";
import { MembershipPage } from "@pages/creator/MembershipPage";
import { MessagesPage } from "@pages/creator/MessagesPage";
import { ConsultationPage } from "@pages/creator/ConsultationPage";
import { DigitalProductPage } from "@pages/creator/DigitalProductPage";
import { DiscordMembershipPage } from "@pages/creator/DiscordMembershipPage";
import { EventGuestsPage } from "@pages/creator/EventGuestsPage";
import { EventsPage } from "@pages/creator/EventsPage";
import { OnlineCoursePage } from "@pages/creator/OnlineCoursePage";
import { OrdersPage } from "@pages/creator/OrdersPage";
import { ProductsPage } from "@pages/creator/ProductsPage";
import { TelegramMembershipPage } from "@pages/creator/TelegramMembershipPage";
import { ProfilePage as CreatorProfilePage } from "@pages/creator/ProfilePage";
import { PromotionsPage } from "@pages/creator/PromotionsPage";
import { ReferralPage } from "@pages/creator/ReferralPage";
import { SessionsPage } from "@pages/creator/SessionsPage";
import { SettingsPage } from "@pages/creator/SettingsPage";
import { StreamingPage } from "@pages/creator/StreamingPage";
import { WalletPage } from "@pages/creator/WalletPage";
import { baseURL, creatorsBaseURL } from "@config/env";

type UseFixture<T> = (fixture: T) => Promise<void>;
type PageArgs = { page: Page };

function buyerPage<T>(PageClass: new (page: Page, baseURL: string) => T) {
  return async ({ page }: PageArgs, use: UseFixture<T>) => {
    await use(new PageClass(page, baseURL));
  };
}

function creatorPage<T>(PageClass: new (page: Page, baseURL: string) => T) {
  return async ({ page }: PageArgs, use: UseFixture<T>) => {
    await use(new PageClass(page, creatorsBaseURL));
  };
}

export type PageFixtures = {
  loginPage: LoginPage;
  explorePage: ExplorePage;
  landingPage: LandingPage;
  cartPage: CartPage;
  productPurchasePage: ProductPurchasePage;
  buyerFeedsPage: BuyerFeedsPage;
  libraryPage: LibraryPage;
  buyerMembershipPage: BuyerMembershipPage;
  messagePage: MessagePage;
  buyerProfilePage: BuyerProfilePage;
  tierDetailPage: TierDetailPage;
  tipPage: TipPage;
  transactionPage: TransactionPage;
  affiliatePage: AffiliatePage;
  analyticsPage: AnalyticsPage;
  campaignsPage: CampaignsPage;
  creatorFeedsPage: CreatorFeedsPage;
  membershipPage: MembershipPage;
  messagesPage: MessagesPage;
  ordersPage: OrdersPage;
  onlineCoursePage: OnlineCoursePage;
  productsPage: ProductsPage;
  consultationPage: ConsultationPage;
  digitalProductPage: DigitalProductPage;
  discordMembershipPage: DiscordMembershipPage;
  eventsPage: EventsPage;
  eventGuestsPage: EventGuestsPage;
  telegramMembershipPage: TelegramMembershipPage;
  creatorProfilePage: CreatorProfilePage;
  customizePage: CustomizePage;
  promotionsPage: PromotionsPage;
  referralPage: ReferralPage;
  sessionsPage: SessionsPage;
  settingsPage: SettingsPage;
  streamingPage: StreamingPage;
  walletPage: WalletPage;
};

export const pageFixtures = {
  loginPage: async ({ page }: PageArgs, use: UseFixture<LoginPage>) => {
    await use(new LoginPage(page));
  },

  explorePage: buyerPage(ExplorePage),
  landingPage: buyerPage(LandingPage),
  cartPage: buyerPage(CartPage),
  productPurchasePage: buyerPage(ProductPurchasePage),
  buyerFeedsPage: buyerPage(BuyerFeedsPage),
  libraryPage: buyerPage(LibraryPage),
  messagePage: buyerPage(MessagePage),
  buyerProfilePage: buyerPage(BuyerProfilePage),
  tipPage: buyerPage(TipPage),
  transactionPage: buyerPage(TransactionPage),
  buyerMembershipPage: buyerPage(BuyerMembershipPage),
  tierDetailPage: buyerPage(TierDetailPage),

  affiliatePage: creatorPage(AffiliatePage),
  analyticsPage: creatorPage(AnalyticsPage),
  campaignsPage: creatorPage(CampaignsPage),
  creatorFeedsPage: creatorPage(CreatorFeedsPage),
  membershipPage: creatorPage(MembershipPage),
  messagesPage: creatorPage(MessagesPage),
  ordersPage: creatorPage(OrdersPage),
  onlineCoursePage: creatorPage(OnlineCoursePage),
  productsPage: creatorPage(ProductsPage),
  consultationPage: creatorPage(ConsultationPage),
  digitalProductPage: creatorPage(DigitalProductPage),
  discordMembershipPage: creatorPage(DiscordMembershipPage),
  eventsPage: creatorPage(EventsPage),
  eventGuestsPage: creatorPage(EventGuestsPage),
  telegramMembershipPage: creatorPage(TelegramMembershipPage),
  creatorProfilePage: creatorPage(CreatorProfilePage),
  customizePage: creatorPage(CustomizePage),
  promotionsPage: creatorPage(PromotionsPage),
  referralPage: creatorPage(ReferralPage),
  sessionsPage: creatorPage(SessionsPage),
  settingsPage: creatorPage(SettingsPage),
  streamingPage: creatorPage(StreamingPage),
  walletPage: creatorPage(WalletPage),
};
