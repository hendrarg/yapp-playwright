/** Search fixtures use the seeded second creator (token2) instead of drifting dev accounts. */
export const exploreData = {
  creator: { name: 'Asep pisan', username: '@sundanese', href: '/sundanese' },
  displayNameQuery: 'Asep pisan',
  usernameQuery: 'sundanese',
  caseVariants: ['asep pisan', 'ASEP PISAN', 'AsEp PiSaN', 'Asep'],
  noMatchQuery: 'no-match-aut-exp-002',
  searchParams: { campaigns: 'q', creators: 'keyword', products: 'q' },
  categoryFilter: { label: 'Online Course', query: 'online_course', badge: 'Online Course' },
  productTypeLabels: ['Digital Product', 'Online Course', 'Discord Membership', 'Telegram Membership', 'Events and Tickets', 'Consultation'],
} as const;
