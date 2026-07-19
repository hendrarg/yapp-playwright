export const exploreData = {
  popularProducts: ['Crypto Product', 'Test Discounted Product'],
  productSearch: 'Qase Management Testcase',
  seeMoreNavigation: {
    creator: { query: 'hendrarg', name: 'Hendra Rizal Gunawan', username: '@hendrarg', href: '/hendrarg' },
    productQuery: 'Telebot',
  },
  creatorDiscovery: {
    displayNameQuery: 'Jason',
    usernameQuery: 'yoms07',
    noMatchQuery: 'no-creator-aut-fv-175',
    selectedCreator: { name: 'Jason', username: '@yoms07', href: '/yoms07' },
    expectedCreators: [
      { name: 'Jason', username: '@yoms07', category: 'Education' },
      { name: 'HOHO', username: '@testuser123' },
      { name: 'mutiajaveline', username: '@mutiajaveline' },
      { name: 'iyansr32', username: '@iyansr32', category: 'Politics' },
    ],
  },
} as const;
