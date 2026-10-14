import { faker } from '@faker-js/faker';

export const landingCopy = {
  heroHeadline: 'Your All In One Creator Platform',
  heroSupporting:
    'Links, digital products, tipping, campaigns, and livestream overlays, everything to build and monetize your audience in one platform.',
  headerLabels: ['Explore', 'Features', 'Pricing', 'FAQ', 'Log In'] as const,
  featureTabs: [
    'Digital Products',
    'Exclusive Content',
    'Tips & Donations',
    'Link Page Builder',
    'Livestream Overlay',
  ] as const,
  featureCardTitles: [
    'Sell Digital Products',
    'Monetize Your Exclusive Content',
    'Engage Your Viewers In Real Time',
  ] as const,
  signUpCta: 'Sign Up for Free',
  startExploring: 'Start Exploring',
  becomeACreator: 'Become a Creator',
  getYapp: 'Get Yapp',
  getYappPlaceholder: 'michaels',
  creatorsHeading: 'Creators',
  productsHeading: 'Products',
  campaignsHeading: 'Campaigns',
  viewMore: 'View More',
  /** Header Explore dropdown: item label → destination path and page heading. */
  exploreMenuItems: [
    { label: 'Creators', path: '/explore/creators', heading: 'Explore Creators' },
    { label: 'Products', path: '/explore/products', heading: 'Explore Products' },
    { label: 'Campaigns', path: '/explore/campaigns', heading: 'Explore Campaigns' },
  ] as const,
  faqQuestion: 'What is Yapp?',
  footerLinks: [
    { name: 'About Us', urlPattern: /\/about/ },
    { name: 'Docs', urlPattern: /yapp\.gitbook\.io/ },
    { name: 'Terms and Conditions', urlPattern: /\/terms/ },
    { name: 'Privacy Policy', urlPattern: /\/privacy/ },
  ] as const,
  approvedSnippets: [
    'Your All In One Creator Platform',
    'Start Exploring',
    'Become a Creator',
    'Sign Up for Free',
    'Get Yapp',
    'Frequently Asked Questions',
  ] as const,
  placeholderForbidden: ['lorem ipsum', 'TODO', 'placeholder', 'TBD'] as const,
};

export function generateGetYappUsername(): string {
  return `${faker.string.alphanumeric({ length: 8, casing: 'lower' })}${faker.string.numeric(4)}`;
}

/** Header anchors and the section each one scrolls to. */
export const landingAnchors = [
  { name: 'Features', sectionId: 'features-root' },
  { name: 'Pricing', sectionId: 'pricing' },
  { name: 'FAQ', sectionId: 'faq' },
] as const;

export const landingPricing = {
  heading: 'Simple Plans',
  planName: 'Free to start',
  price: '$0 / Month',
  cta: 'Start Creating For Free',
  features: [
    'Sell digital products',
    'Launch fundraising campaigns',
    'Collect tips & donations',
    'Build your link page with full customization',
    'Use livestream overlays for YouTube & OBS',
    'Access creator analytics',
  ],
} as const;

export const landingMulticurrency = {
  heading: 'Get Paid by your fans globally',
  currencies: ['SGD', 'IDR', 'USD', 'EUR', 'PHP'],
} as const;

export const landingJoinYapp = {
  intro: 'Join Yapp, if you are...',
  cta: 'Be A Creator',
  /** Sample creator pages shown beside the persona card. */
  samplePages: ['yapp.ink/theresalearns', 'yapp.ink/mutiajaveline', 'yapp.ink/andersonnsteven', 'yapp.ink/hartzel'],
} as const;

/**
 * Footer "Creators" quick link → the feature card it brings to the front of the carousel.
 * "Campaign" opening the exclusive-content card is the agreed copy (product owner, 2026-09-23 —
 * see knowledge explore-and-profile: the landing feature section).
 */
export const footerQuickLinks = [
  { label: 'Digital Products', card: 'Sell Digital Products' },
  { label: 'Campaign', card: 'Monetize Your Exclusive Content' },
  { label: 'Stream Overlay', card: 'Engage Your Viewers In Real Time' },
  { label: 'Tipping', card: 'Receive Support From Your Fans' },
] as const;

export const landingSocialLinks = [
  { name: 'Instagram', href: 'https://www.instagram.com/yappcreators.id' },
  { name: 'LinkedIn', href: 'https://www.linkedin.com/company/yappcreators/' },
] as const;

/** Every creator sign-up CTA on the landing page. */
export const creatorSignUpCtas = ['Become a Creator', 'Sign Up for Free', 'Be A Creator', 'Start Creating For Free'] as const;

export const mobileMenuItems = ['Features', 'Explore', 'Pricing', 'FAQ', 'Log In'] as const;
