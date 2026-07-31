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
