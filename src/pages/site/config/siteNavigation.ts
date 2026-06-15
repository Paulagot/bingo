export type NavItem = {
  label: string;
  to: string;
  description?: string;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const featureNavItems: NavItem[] = [
  { label: 'All features', to: '/features' },
  // { label: 'Campaign Manager', to: '/features/campaign-manager' },
  { label: 'Event Manager', to: '/features/event-manager' },
  { label: 'Ticketing and registration', to: '/features/ticketing' },
  { label: 'Payment reconciliation', to: '/features/payments' },
  { label: 'Financial reports and records', to: '/features/reports' },
  { label: 'Impact reports and records', to: '/features/impact-reports' },
  // { label: 'CRM and supporter management', to: '/features/crm' },
  // { label: 'AI Prize Finder', to: '/features/ai-prize-finder' },
];

export const eventFormatNavItems: NavItem[] = [
  { label: 'All event formats', to: '/event-formats' },
  { label: 'Quiz fundraisers', to: '/event-formats/quiz' },
  { label: 'Elimination games', to: '/event-formats/elimination' },
  { label: 'Ticket events', to: '/event-formats/ticketed-events' },
  // { label: 'Puzzle challenges', to: '/event-formats/puzzle-challenges' },
  // { label: 'Escape room fundraisers', to: '/event-formats/escape-room' },
  // { label: 'Treasure hunts', to: '/event-formats/treasure-hunt' },
];

export const useCaseNavItems: NavItem[] = [
  { label: 'All use cases', to: '/use-cases' },
  { label: 'Sports clubs', to: '/use-cases/sports-clubs' },
  { label: 'Schools & PTAs', to: '/use-cases/schools-ptas' },
  { label: 'Charities', to: '/use-cases/charities' },
  { label: 'Community groups', to: '/use-cases/community-groups' },
];

export const resourceNavItems: NavItem[] = [
  { label: 'Resources', to: '/resources' },
  // { label: 'Blog', to: '/blog' },
  // { label: 'Fundraising ideas', to: '/resources/fundraising-ideas' },
  // { label: 'Guides', to: '/resources/guides' },
  // { label: 'How it works', to: '/how-it-works' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
];

export const web3NavItems: NavItem[] = [
  { label: 'Web3 Fundraising', to: '/web3' },
  { label: 'Web3 features', to: '/web3/features' },
  { label: 'Web3 quiz', to: '/web3/quiz' },
  { label: 'Web3 host area', to: '/web3/host' },
  { label: 'Web3 causes', to: '/web3/causes' },
  { label: 'Web3 partners', to: '/web3/partners' },
  { label: 'Web3 testimonials', to: '/web3/testimonials' },
  { label: 'Web3 elimination game', to: '/web3/elimination' },
 
];

export const navGroups: NavGroup[] = [
  { label: 'Features', items: featureNavItems },
  { label: 'Event Formats', items: eventFormatNavItems },
  { label: 'Use cases', items: useCaseNavItems },
  { label: 'Resources', items: resourceNavItems },

  /**
   * Single-link header item.
   * The SiteHeader can detect groups with one item and render them as direct links.
   */
  {
    label: 'Web3 Fundraising',
    items: [{ label: 'Web3 Fundraising', to: '/web3' }],
  },
];

export const footerGroups: NavGroup[] = [
  {
    label: 'Platform',
    items: [
      { label: 'Home', to: '/' },
      // { label: 'Demo',to: '/contact' },
      { label: 'Pricing', to: '/pricing' },
      // { label: 'How it works', to: '/how-it-works' },
      { label: 'About', to: '/about' },
      { label: 'Contact', to: '/contact' },
    ],
  },
  {
    label: 'Features',
    items: featureNavItems,
  },
  {
    label: 'Event Formats',
    items: eventFormatNavItems,
  },
  {
    label: 'Use cases',
    items: useCaseNavItems,
  },
  // {
  //   label: 'Resources',
  //   items: [
  //     { label: 'Resources', to: '/resources' },
  //     { label: 'Blog', to: '/blog' },
  //     { label: 'Fundraising ideas', to: '/resources/fundraising-ideas' },
  //     { label: 'Guides', to: '/resources/guides' },
  //   ],
  // },
  {
    label: 'Web3 Fundraising',
    items: web3NavItems,
  },
  {
    label: 'Legal',
    items: [
      { label: 'Privacy', to: '/legal/privacy' },
      { label: 'Terms', to: '/legal/terms' },
      { label: 'Cookies', to: '/legal/cookies' },
    ],
  },
];
