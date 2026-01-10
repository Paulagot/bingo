// server/seoMap.js
const ABS = (hostOrigin, path) =>
  `${hostOrigin}${path.startsWith('/') ? path : `/${path}`}`;

// Returns the SEO config for a given request path + origin
export function getSeoForPath(reqPath, hostOrigin) {
  const clean = reqPath.replace(/\/+$/, '') || '/';

  const common = {
    type: 'website',
    robots: 'index, follow',
    image: ABS(hostOrigin, '/fundraisely.png'), // 1200×630 recommended
  };

  const byPath = {
    '/': {
      title:
        'Transform Your Fundraising: Innovative Quiz Events for Charities, Schools & Clubs | FundRaisely',
      description:
        'Unlock the full potential of your cause with FundRaisely. Run engaging quiz nights with templates, fundraising extras, and reconciliation.',
      canonical: ABS(hostOrigin, '/'),
      keywords:
        'fundraising platform, charity fundraising, club events, fundraising quiz, school quiz fundraiser',
    },
    '/about': {
  title: 'About FundRaisely',
  description: 'About our mission and team.',
  canonical: ABS(hostOrigin, '/about'),
  robots: 'noindex, nofollow',
},
'/contact': {
  title: 'Contact FundRaisely',
  description: 'Get in touch with our team.',
  canonical: ABS(hostOrigin, '/contact'),
  robots: 'noindex, nofollow',
},
'/legal/privacy': {
  title: 'Privacy Policy | FundRaisely',
  description: 'How we handle your data.',
  canonical: ABS(hostOrigin, '/legal/privacy'),
  robots: 'noindex, nofollow',
},
'/legal/terms': {
  title: 'Terms of Service | FundRaisely',
  description: 'Terms and conditions.',
  canonical: ABS(hostOrigin, '/legal/terms'),
  robots: 'noindex, nofollow',
},
    '/pricing': {
      title: 'Pricing — FundRaisely Fundraising Quiz (Coming Soon) | FundRaisely',
      description:
        'Simple, transparent pricing for FundRaisely’s fundraising quiz — coming soon. Start free today and join the waitlist.',
      canonical: ABS(hostOrigin, '/pricing'),
      keywords:
        'fundraising quiz pricing, quiz fundraiser pricing, charity quiz software pricing, school quiz fundraiser pricing',
    },
    '/free-trial': {
      title: 'Quiz Free Trial — Run a Real Fundraising Quiz Tonight | FundRaisely',
      description:
        'Run an in-person fundraising quiz with templates, extras, and reconciliation. Free to start — no card needed.',
      canonical: ABS(hostOrigin, '/free-trial'),
      keywords:
        'fundraising quiz free trial, charity quiz night software, school quiz platform',
    },
    '/quiz/how-it-works': {
    title: 'How FundRaisely Quiz Fundraising Works | Setup → Play → Payouts',
    description: 'See the full flow: set up your event, invite players, reconcile payments, and celebrate results.',
    canonical: ABS(hostOrigin, '/quiz/how-it-works'),
    keywords: 'how it works fundraising quiz, charity quiz flow, setup to payouts',
  },
  '/quiz/features': {
    title: 'FundRaisely Features — Gamified, Transparent Fundraising Quizzes',
    description: 'Engagement extras, live leaderboards, reconciliation, exports, and sponsor visibility.',
    canonical: ABS(hostOrigin, '/quiz/features'),
    keywords: 'fundraising quiz features, charity quiz features, leaderboards, reconciliation',
  },
  '/quiz/use-cases': {
    title: 'Use Cases — Charities, Clubs, and Schools | FundRaisely',
    description: 'See how different groups use FundRaisely to run high-impact quiz fundraisers.',
    canonical: ABS(hostOrigin, '/quiz/use-cases'),
    keywords: 'fundraising use cases, charity quiz, club quiz, school quiz',
  },
  '/quiz/use-cases/charities': {
    title: 'Charity Quiz Fundraisers | Easy & Effective for Non-Profits | FundRaisely',
    description: 'Raise more with engaging quiz nights—simple setup, transparent reporting, and real impact.',
    canonical: ABS(hostOrigin, '/quiz/use-cases/charities'),
    keywords: 'charity quiz fundraiser, non-profit trivia night, fundraising quiz for charities',
  },
  '/quiz/use-cases/clubs': {
    title: 'Sports Club Quiz Fundraisers | Engage Members & Raise More | FundRaisely',
    description: 'Run lively quiz nights for your club—mobile join, extras to boost funds, and clear reports.',
    canonical: ABS(hostOrigin, '/quiz/use-cases/clubs'),
    keywords: 'sports club quiz fundraiser, GAA quiz night, club fundraising quiz',
  },
  '/quiz/use-cases/schools': {
    title: 'School Quiz Fundraisers | PTA-Friendly & Transparent | FundRaisely',
    description: 'Simple setup, sponsor-ready prizes, and reconciliation for PTAs and schools.',
    canonical: ABS(hostOrigin, '/quiz/use-cases/schools'),
    keywords: 'school quiz fundraiser, PTA quiz platform, school fundraising quiz',
  },
  // --- WEB3 HUB (evergreen) ---
'/web3': {
  title: 'Web3 Quiz Fundraisers — On-Chain Transparency & High-Energy Events | FundRaisely',
  description: 'Run crypto-powered quiz fundraisers with wallets, live leaderboards, and audit-ready reports.',
  canonical: ABS(hostOrigin, '/web3'),
  keywords: 'web3 quiz, crypto fundraising, blockchain charity, DAO fundraising, on-chain receipts',
  image: ABS(hostOrigin, '/og/web3-hub.png'),
},
'/web3/how-it-works': {
  title: 'How Web3 Quiz Fundraisers Work | Wallets, Flows & Reporting | FundRaisely',
  description: 'See the full flow for crypto-enabled fundraising quizzes: setup, join, gameplay, payouts, and reporting.',
  canonical: ABS(hostOrigin, '/web3/how-it-works'),
  keywords: 'how it works web3 fundraising, crypto quiz flow, on-chain transparency',
  image: ABS(hostOrigin, '/og/web3-how-it-works.png'),
},
'/web3/features': {
  title: 'Crypto-Powered Features — Wallets, Power-Ups, On-Chain Receipts | FundRaisely',
  description: 'Wallet integrations, power-ups, direct-to-charity routing, and exportable audit trails.',
  canonical: ABS(hostOrigin, '/web3/features'),
  keywords: 'crypto quiz features, web3 features, on-chain receipts, leaderboards',
  image: ABS(hostOrigin, '/og/web3-features.png'),
},
'/web3/partners': {
  title: 'Web3 Fundraising Partners — Exchanges, Wallets & Charity Rails | FundRaisely',
  description: 'Meet the partners powering routing to verified charities and smooth crypto UX.',
  canonical: ABS(hostOrigin, '/web3/partners'),
  keywords: 'web3 partners, crypto donations partner, the giving block',
  image: ABS(hostOrigin, '/og/web3-partners.png'),
},
'/web3/testimonials': {
  title: 'Crypto Fundraising Testimonials — Communities & DAOs Using FundRaisely',
  description: 'Stories from web3 communities running transparent, high-energy fundraisers.',
  canonical: ABS(hostOrigin, '/web3/testimonials'),
  keywords: 'web3 testimonials, crypto fundraising reviews, DAO case studies',
  image: ABS(hostOrigin, '/og/web3-testimonials.png'),
},

// --- WEB3 IMPACT CAMPAIGN (seasonal, canonical lives here year-round) ---
'/web3/impact-campaign': {
  title: 'Web3 Impact Campaign — Annual Crypto Fundraising Drive | FundRaisely',
  description: 'Join the annual 3-month Web3 Impact Campaign. Host or participate to raise on-chain for verified charities.',
  canonical: ABS(hostOrigin, '/web3/impact-campaign'),
  keywords: 'web3 impact campaign, crypto fundraising event, blockchain charity event',
  image: ABS(hostOrigin, '/og/web3-impact-campaign.png'),
  type: 'event',
},
'/web3/impact-campaign/join': {
  title: 'Join the Web3 Impact Campaign — Host or Participate | FundRaisely',
  description: 'Pledge your community, get co-piloted support, or launch a self-serve web3 quiz fundraiser.',
  canonical: ABS(hostOrigin, '/web3/impact-campaign/join'),
  keywords: 'join web3 impact campaign, host crypto fundraiser',
  image: ABS(hostOrigin, '/og/web3-impact-join.png'),
  type: 'event',
},
'/web3/impact-campaign/leaderboard': {
  title: 'Web3 Impact Campaign Leaderboard — Live Standings | FundRaisely',
  description: 'Track participating communities, funds raised on-chain, and live standings.',
  canonical: ABS(hostOrigin, '/web3/impact-campaign/leaderboard'),
  keywords: 'web3 campaign leaderboard, crypto fundraising leaderboard',
  image: ABS(hostOrigin, '/og/web3-impact-leaderboard.png'),
  type: 'event',
},
// server/seoMap.js (inside byPath)
'/campaigns/clubs-league': {
  title: 'Junior Sports Clubs Quiz League (March 2026) — Family Fundraiser for U8 & U10 | FundRaisely',
  description:
    'Join the FundRaisely Junior Sports Clubs Quiz League. Your club runs one family quiz night in March 2026, raises funds for junior teams, and competes for prizes and a €2,000 club grant. Limited to 25 clubs.',
  canonical: ABS(hostOrigin, '/campaigns/clubs-league'),
  keywords:
    'club fundraising, quiz night fundraiser, youth sports fundraising, GAA fundraiser, soccer club fundraiser, family quiz night, March 2026 fundraising',
  image: ABS(hostOrigin, '/og/fundraisely.png'), // optional if you have it
  type: 'event',
  robots: 'index, follow',
},



    // Add more marketing pages here:
    // '/quiz/how-it-works': { ... },
    // '/quiz/features': { ... },
    // '/quiz/use-cases/schools': { ... },
  };

  return { ...common, ...(byPath[clean] || byPath['/']) };
}
