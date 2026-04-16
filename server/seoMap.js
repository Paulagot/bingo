// server/seoMap.js
const ABS = (hostOrigin, path) =>
  `${hostOrigin}${path.startsWith('/') ? path : `/${path}`}`;

// Returns the SEO config for a given request path + origin
export function getSeoForPath(reqPath, hostOrigin) {
  const clean = reqPath.replace(/\/+$/, '') || '/';

  const common = {
    type: 'website',
    robots: 'index, follow',
    image: ABS(hostOrigin, '/fundraisely.png'), // single default image for all pages
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
      description:
        'See the full flow: set up your event, invite players, reconcile payments, and celebrate results.',
      canonical: ABS(hostOrigin, '/quiz/how-it-works'),
      keywords: 'how it works fundraising quiz, charity quiz flow, setup to payouts',
    },

    '/quiz/features': {
      title: 'FundRaisely Features — Gamified, Transparent Fundraising Quizzes',
      description:
        'Engagement extras, live leaderboards, reconciliation, exports, and sponsor visibility.',
      canonical: ABS(hostOrigin, '/quiz/features'),
      keywords:
        'fundraising quiz features, charity quiz features, leaderboards, reconciliation',
    },

    '/quiz/use-cases': {
      title: 'Use Cases — Charities, Clubs, and Schools | FundRaisely',
      description:
        'See how different groups use FundRaisely to run high-impact quiz fundraisers.',
      canonical: ABS(hostOrigin, '/quiz/use-cases'),
      keywords: 'fundraising use cases, charity quiz, club quiz, school quiz',
    },

    '/quiz/use-cases/charities': {
      title: 'Charity Quiz Fundraisers | Easy & Effective for Non-Profits | FundRaisely',
      description:
        'Raise more with engaging quiz nights—simple setup, transparent reporting, and real impact.',
      canonical: ABS(hostOrigin, '/quiz/use-cases/charities'),
      keywords:
        'charity quiz fundraiser, non-profit trivia night, fundraising quiz for charities',
    },

    '/quiz/use-cases/clubs': {
      title: 'Sports Club Quiz Fundraisers | Engage Members & Raise More | FundRaisely',
      description:
        'Run lively quiz nights for your club—mobile join, extras to boost funds, and clear reports.',
      canonical: ABS(hostOrigin, '/quiz/use-cases/clubs'),
      keywords: 'sports club quiz fundraiser, GAA quiz night, club fundraising quiz',
    },

    '/quiz/use-cases/schools': {
      title: 'School Quiz Fundraisers | PTA-Friendly & Transparent | FundRaisely',
      description:
        'Simple setup, sponsor-ready prizes, and reconciliation for PTAs and schools.',
      canonical: ABS(hostOrigin, '/quiz/use-cases/schools'),
      keywords: 'school quiz fundraiser, PTA quiz platform, school fundraising quiz',
    },

    // --- WEB3 HUB (evergreen) ---
    '/web3': {
      title: 'Web3 Quiz Fundraisers — On-Chain Transparency & High-Energy Events | FundRaisely',
      description:
        'Run crypto-powered quiz fundraisers with wallets, live leaderboards, and audit-ready reports.',
      canonical: ABS(hostOrigin, '/web3'),
      keywords:
        'web3 quiz, crypto fundraising, blockchain charity, DAO fundraising, on-chain receipts',
    },

    '/web3/how-it-works': {
      title: 'How Web3 Quiz Fundraisers Work | Wallets, Flows & Reporting | FundRaisely',
      description:
        'See the full flow for crypto-enabled fundraising quizzes: setup, join, gameplay, payouts, and reporting.',
      canonical: ABS(hostOrigin, '/web3/how-it-works'),
      keywords:
        'how it works web3 fundraising, crypto quiz flow, on-chain transparency',
    },

    '/web3/testimonials': {
      title: 'Crypto Fundraising Testimonials — Communities & DAOs Using FundRaisely',
      description:
        'Stories from web3 communities running transparent, high-energy fundraisers.',
      canonical: ABS(hostOrigin, '/web3/testimonials'),
      keywords:
        'web3 testimonials, crypto fundraising reviews, DAO case studies',
    },

    // --- WEB3 IMPACT CAMPAIGN (seasonal, canonical lives here year-round) ---
    '/web3/impact-campaign': {
      title: 'Web3 Impact Campaign — Annual Crypto Fundraising Drive | FundRaisely',
      description:
        'Join the annual 3-month Web3 Impact Campaign. Host or participate to raise on-chain for verified charities.',
      canonical: ABS(hostOrigin, '/web3/impact-campaign'),
      keywords:
        'web3 impact campaign, crypto fundraising event, blockchain charity event',
      type: 'event',
    },

    '/web3/impact-campaign/join': {
      title: 'Join the Web3 Impact Campaign — Host or Participate | FundRaisely',
      description:
        'Pledge your community, get co-piloted support, or launch a self-serve web3 quiz fundraiser.',
      canonical: ABS(hostOrigin, '/web3/impact-campaign/join'),
      keywords: 'join web3 impact campaign, host crypto fundraiser',
      type: 'event',
    },

    '/web3/impact-campaign/leaderboard': {
      title: 'Web3 Impact Campaign Leaderboard — Live Standings | FundRaisely',
      description:
        'Track participating communities, funds raised on-chain, and live standings.',
      canonical: ABS(hostOrigin, '/web3/impact-campaign/leaderboard'),
      keywords: 'web3 campaign leaderboard, crypto fundraising leaderboard',
      type: 'event',
    },

    '/web3/features': {
      title: 'Web3 Fundraising Features: Smart Contracts, On-Chain Payouts & Verified Charities | FundRaisely',
      description:
        'How FundRaisely works: smart contract payout enforcement, verified non-profits via The Giving Block, multi-chain support on Solana and Base, and a transparent split for every event.',
      canonical: ABS(hostOrigin, '/web3/features'),
      keywords:
        'web3 fundraising features, smart contract payouts, on-chain charity, Solana fundraising, Base fundraising, The Giving Block',
    },

    '/web3/elimination': {
      title: 'Elimination Game Fundraising — On-Chain, Live Events | FundRaisely',
      description:
        'Host an elimination-style fundraising game on Solana or Base. Entry fees go into a smart contract. Last player standing wins. Charity gets 35% automatically.',
      canonical: ABS(hostOrigin, '/web3/elimination'),
      keywords:
        'elimination game fundraiser, crypto elimination game, web3 fundraising game, on-chain elimination',
    },

    '/web3/quiz': {
      title: 'Web3 Quiz Night Fundraising — Crypto-Powered, Transparent | FundRaisely',
      description:
        'Run a crypto quiz fundraiser on Solana or Base. Smart contracts handle entry fees and pay out winner, host, and charity the moment the quiz ends.',
      canonical: ABS(hostOrigin, '/web3/quiz'),
      keywords:
        'web3 quiz night, crypto quiz fundraiser, blockchain quiz, on-chain trivia fundraiser',
    },

    '/web3/partners': {
      title: 'Web3 Fundraising Partners — The Giving Block, Solana & Base | FundRaisely',
      description:
        'FundRaisely verifies every charity through The Giving Block and runs on Solana and Base. Meet the infrastructure behind transparent on-chain fundraising.',
      canonical: ABS(hostOrigin, '/web3/partners'),
      keywords:
        'web3 partners, The Giving Block, crypto donations, Solana fundraising partner, Base fundraising',
    },

    '/campaigns/clubs-league': {
      title: 'Junior Sports Clubs Quiz League 2026 — Family Fundraiser for U8 to U10 | FundRaisely',
      description:
        'Join the FundRaisely Junior Sports Clubs Quiz League. Your club runs one family quiz night before 30 June 2026, raises funds for junior teams, and competes for prizes and a €2,000 club grant. Limited to 25 clubs.',
      canonical: ABS(hostOrigin, '/campaigns/clubs-league'),
      keywords:
        'club fundraising, quiz night fundraiser, youth sports fundraising, GAA fundraiser, soccer club fundraiser, family quiz night, fundraising',
      type: 'event',
      robots: 'index, follow',
    },
  };

  return { ...common, ...(byPath[clean] || byPath['/']) };
}
