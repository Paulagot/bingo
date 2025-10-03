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
    // Add more marketing pages here:
    // '/quiz/how-it-works': { ... },
    // '/quiz/features': { ... },
    // '/quiz/use-cases/schools': { ... },
  };

  return { ...common, ...(byPath[clean] || byPath['/']) };
}
