// server/seoMap.js

const DEFAULT_IMAGE_PATH = '/social/fundraisely-og.jpg';

const ABS = (hostOrigin, path) =>
  `${hostOrigin}${path.startsWith('/') ? path : `/${path}`}`;

function normalizePath(reqPath) {
  return reqPath.replace(/\/+$/, '') || '/';
}

function noindexSeo(hostOrigin, cleanPath, title = 'FundRaisely') {
  return {
    type: 'website',
    robots: 'noindex, nofollow',
    image: ABS(hostOrigin, DEFAULT_IMAGE_PATH),
    title: `${title} | FundRaisely`,
    description: 'This FundRaisely page is not intended for search indexing.',
    canonical: ABS(hostOrigin, cleanPath),
  };
}

function isNoindexPath(cleanPath) {
  const noindexPrefixes = [
    '/old',
    '/game',
    '/quiz',
    '/tickets',
    '/elimination',
    '/challenges',
    '/join',
    '/mini-app',
    '/BingoBlitz',
    '/admin',
    '/dashboard',
    '/user',
    '/login',
    '/signup',
    '/auth',
    '/reset-password',
    '/forgot-password',
    '/payment',
    '/checkout',
    '/api',
    '/mgmt',
    '/socket.io',
    '/debug',
  ];

  return noindexPrefixes.some(
    (prefix) => cleanPath === prefix || cleanPath.startsWith(`${prefix}/`),
  );
}

// Returns the SEO config for a given request path + origin.
export function getSeoForPath(reqPath, hostOrigin) {
  const clean = normalizePath(reqPath);

  const common = {
    type: 'website',
    robots: 'index, follow',
    image: ABS(hostOrigin, DEFAULT_IMAGE_PATH),
  };

  const byPath = {
    '/': {
      title: 'Fundraising Platform for Clubs, Schools and Charities | FundRaisely',
      description:
        'FundRaisely helps clubs, schools, charities, nonprofits and community groups turn fundraising ideas into ready-to-run campaigns, events and games with payment tracking and reporting built in.',
      canonical: ABS(hostOrigin, '/'),
      keywords:
        'fundraising platform, charity fundraising, club fundraising, school fundraising, fundraising events, payment tracking, fundraising reports',
    },

    '/demo': {
      title: 'Book a FundRaisely Demo | Fundraising event software',
      description:
        'Book a demo to see how FundRaisely can support quiz fundraisers, ticketing, payment tracking and reports.',
      canonical: ABS(hostOrigin, '/demo'),
      keywords:
        'fundraising software demo, charity fundraising demo, club fundraising demo, fundraising platform demo',
    },

    '/pricing': {
      title: 'FundRaisely Pricing | Fundraising software plans',
      description:
        'Simple fundraising software pricing for clubs, schools, charities and nonprofits, with ticketing, payment tracking, reports and digital fundraising games included.',
      canonical: ABS(hostOrigin, '/pricing'),
      keywords:
        'fundraising software pricing, charity fundraising platform pricing, club fundraising software pricing',
    },

    '/how-it-works': {
      title: 'How FundRaisely Works | Create, share, track and report on fundraisers',
      description:
        'Learn how FundRaisely helps organisers create fundraisers, share links, track payments and review reports.',
      canonical: ABS(hostOrigin, '/how-it-works'),
      keywords:
        'how fundraising software works, fundraising event setup, fundraising payment tracking, fundraising reports',
    },

    '/about': {
      title: 'About FundRaisely | Community fundraising platform',
      description:
        'Learn about FundRaisely and its mission to make community fundraising easier to organise and report on.',
      canonical: ABS(hostOrigin, '/about'),
      keywords:
        'about FundRaisely, community fundraising, fundraising platform, grassroots fundraising',
    },

    '/contact': {
      title: 'Contact FundRaisely | Fundraising demos and support',
      description:
        'Contact FundRaisely about quiz fundraisers, fundraising games and platform demos.',
      canonical: ABS(hostOrigin, '/contact'),
      keywords:
        'contact FundRaisely, fundraising software contact, fundraising platform demo',
    },

    // Feature pages
    '/features': {
      title: 'Fundraising Platform Features for Clubs, Charities and Nonprofits | FundRaisely',
      description:
        'Explore FundRaisely features for campaigns, events, ticketing, payment reconciliation, financial reports, impact reports, CRM and AI prize finding.',
      canonical: ABS(hostOrigin, '/features'),
      keywords:
        'fundraising platform features, campaign manager, event manager, ticketing, payment reconciliation, fundraising reports',
    },

    '/features/dashboard': {
      title: 'Fundraising Event Dashboard for Clubs, Charities and Non-profits | FundRaisely',
      description:
        'View upcoming and ended fundraising events, ticket sales, targets, totals, event links and reports from one dashboard for clubs, charities and non-profits.',
      canonical: ABS(hostOrigin, '/features/dashboard'),
      keywords:
        'fundraising dashboard, event dashboard, charity dashboard, club fundraising dashboard, fundraising reports',
    },

    '/features/campaign-manager': {
      title: 'Campaign Manager for connected fundraising activity | FundRaisely',
      description:
        'A coming-soon workspace for grouping events, event formats, campaign pages and progress updates around one fundraising goal.',
      canonical: ABS(hostOrigin, '/features/campaign-manager'),
      keywords:
        'fundraising campaign manager, charity campaign software, club campaign management',
    },

    '/features/event-manager': {
      title: 'Fundraising Event Management for Clubs, Charities and Non-profits | FundRaisely',
      description:
        'Plan, ticket and launch fundraising events from one place. FundRaisely helps clubs, charities and non-profits manage prices, payments, goals and event records.',
      canonical: ABS(hostOrigin, '/features/event-manager'),
      keywords:
        'fundraising event management, charity event software, club event manager, event fundraising platform',
    },

    '/features/ticketing': {
      title: 'Fundraising Ticketing and Registration | FundRaisely',
      description:
        'Create clear supporter journeys for paid entry, attendance, participation, QR codes and event access.',
      canonical: ABS(hostOrigin, '/features/ticketing'),
      keywords:
        'fundraising ticketing, charity event tickets, club event ticketing, QR code tickets, event registration',
    },

    '/features/payments': {
      title: 'Payment Reconciliation for Fundraising Events | FundRaisely',
      description:
        'Track expected, claimed, confirmed, late, disputed and written-off payments across cash, card, bank transfer and instant payments.',
      canonical: ABS(hostOrigin, '/features/payments'),
      keywords:
        'payment reconciliation, fundraising payments, charity payment tracking, club payment tracking, event payment tracking',
    },

    '/features/reports': {
      title: 'Financial Reports and Fundraising Records | FundRaisely',
      description:
        'Give organisers, treasurers and committees clear after-event records without rebuilding everything in a spreadsheet.',
      canonical: ABS(hostOrigin, '/features/reports'),
      keywords:
        'fundraising reports, charity financial reports, club fundraising records, event reports',
    },

    '/features/impact-reports': {
      title: 'Impact Reports and Fundraising Records | FundRaisely',
      description:
        'Show the real-world impact of what was raised and how it was spent, with clear records of participation, prizes, sponsors and outcomes.',
      canonical: ABS(hostOrigin, '/features/impact-reports'),
      keywords:
        'impact reports, charity impact reporting, fundraising impact records, donor reporting',
    },

    '/features/crm': {
      title: 'CRM and Supporter Management for Fundraising | FundRaisely',
      description:
        'Keep supporter, donor, participant, volunteer and sponsor records connected to the fundraisers they helped make happen.',
      canonical: ABS(hostOrigin, '/features/crm'),
      keywords:
        'supporter CRM, charity CRM, fundraising CRM, supporter management, donor records',
    },

    '/features/ai-prize-finder': {
      title: 'AI Prize Finder for Fundraising Events | FundRaisely',
      description:
        'Help volunteers find, contact and track possible prize donors and local sponsors without spending hours starting from scratch.',
      canonical: ABS(hostOrigin, '/features/ai-prize-finder'),
      keywords:
        'AI prize finder, fundraising sponsors, prize sponsor finder, charity raffle prizes, local sponsors',
    },

    // Event formats
    '/event-formats': {
      title: 'Ready-to-Run Fundraising Event Formats | FundRaisely',
      description:
        'Explore FundRaisely ready-to-run fundraising formats, including quiz fundraisers, elimination games, puzzle challenges, escape rooms and treasure hunts.',
      canonical: ABS(hostOrigin, '/event-formats'),
      keywords:
        'fundraising event formats, digital fundraisers, quiz fundraiser, elimination game fundraiser, fundraising games',
    },

    '/event-formats/quiz': {
      title: 'Quiz Fundraisers | FundRaisely',
      description:
        'Run quiz fundraisers with ticketing, player records, payment tracking and reports for committees.',
      canonical: ABS(hostOrigin, '/event-formats/quiz'),
      keywords:
        'quiz fundraiser, charity quiz night, club quiz fundraiser, school quiz fundraiser, PTA quiz night',
    },

    '/event-formats/elimination': {
      title: 'Elimination fundraising games for supporter campaigns | FundRaisely',
      description:
        'A last-person-standing style digital fundraiser that can support longer selling windows and one clear winner.',
      canonical: ABS(hostOrigin, '/event-formats/elimination'),
      keywords:
        'elimination game fundraiser, last person standing fundraiser, digital fundraising game, supporter campaign',
    },

    '/event-formats/puzzle-challenges': {
      title: 'Puzzle challenges for fundraising events | FundRaisely',
      description:
        'A digital challenge format for supporters who enjoy puzzles, problem-solving and prize-led campaigns.',
      canonical: ABS(hostOrigin, '/event-formats/puzzle-challenges'),
      keywords:
        'puzzle challenge fundraiser, puzzle fundraiser, digital fundraising challenge, prize-led fundraiser',
    },

    '/event-formats/escape-room': {
      title: 'Escape room fundraisers | FundRaisely',
      description:
        'A team-based challenge format for schools, clubs, charities and community groups that want a more immersive fundraiser.',
      canonical: ABS(hostOrigin, '/event-formats/escape-room'),
      keywords:
        'escape room fundraiser, digital escape room fundraiser, team fundraising challenge',
    },

    '/event-formats/treasure-hunt': {
      title: 'Treasure hunt fundraisers | FundRaisely',
      description:
        'A local challenge format for community trails, family fundraisers and supporter campaigns.',
      canonical: ABS(hostOrigin, '/event-formats/treasure-hunt'),
      keywords:
        'treasure hunt fundraiser, charity treasure hunt, school treasure hunt fundraiser, community trail fundraiser',
    },

    // Use cases
    '/use-cases': {
      title: 'FundRaisely Use Cases for Clubs, Schools, Charities and Community Groups',
      description:
        'Explore how FundRaisely supports sports clubs, schools, PTAs, charities and community groups with fundraising campaigns, events, games, payment tracking and reports.',
      canonical: ABS(hostOrigin, '/use-cases'),
      keywords:
        'fundraising use cases, club fundraising, school fundraising, charity fundraising, community fundraising',
    },

    '/use-cases/sports-clubs': {
      title: 'Fundraising Software for Sports Clubs and Social Clubs | FundRaisely',
      description:
        'FundRaisely helps sports and social clubs run fundraising events, sell tickets, track payments, manage sponsors and prepare clearer reports for committees.',
      canonical: ABS(hostOrigin, '/use-cases/sports-clubs'),
      keywords:
        'sports club fundraising software, GAA fundraising, football club fundraiser, rugby club fundraising, club fundraising',
    },

    '/use-cases/schools-ptas': {
      title: 'Fundraising Tools for Schools and PTAs | FundRaisely',
      description:
        'FundRaisely helps schools and PTAs run fundraising events, sell tickets, track payments, manage prizes and prepare clearer reports for committees and parent volunteers.',
      canonical: ABS(hostOrigin, '/use-cases/schools-ptas'),
      keywords:
        'school fundraising software, PTA fundraiser, school quiz fundraiser, parent association fundraising',
    },

    '/use-cases/charities': {
      title: 'Fundraising Software for Charities and Nonprofits | FundRaisely',
      description:
        'FundRaisely helps charities and nonprofits run fundraising events, sell tickets, track payments, manage prizes and prepare clearer reports.',
      canonical: ABS(hostOrigin, '/use-cases/charities'),
      keywords:
        'charity fundraising software, nonprofit fundraising, charity event platform, charity quiz fundraiser',
    },

    '/use-cases/community-groups': {
      title: 'Fundraising Tools for Community Groups | FundRaisely',
      description:
        'FundRaisely helps community groups and local organisers run practical fundraisers with ticketing, payment tracking, event records and reports.',
      canonical: ABS(hostOrigin, '/use-cases/community-groups'),
      keywords:
        'community group fundraising, local fundraising software, community fundraiser, volunteer fundraising',
    },

    // Resources
    '/blog': {
      title: 'FundRaisely Blog | Fundraising notes, ideas and product updates',
      description:
        'Fundraising articles, updates and practical ideas for clubs, schools and community groups.',
      canonical: ABS(hostOrigin, '/blog'),
      keywords:
        'fundraising blog, charity fundraising tips, club fundraising ideas, school fundraising ideas',
    },

    '/resources': {
      title: 'Fundraising Resources | FundRaisely',
      description:
        'Resources and guides for clubs, schools, charities and community fundraising organisers.',
      canonical: ABS(hostOrigin, '/resources'),
      keywords:
        'fundraising resources, charity fundraising guides, club fundraising ideas, community fundraising',
    },

    '/resources/fundraising-ideas': {
      title: 'Fundraising Ideas for Clubs, Schools and Community Groups | FundRaisely',
      description:
        'Fundraising ideas for clubs, schools, charities and community groups.',
      canonical: ABS(hostOrigin, '/resources/fundraising-ideas'),
      keywords:
        'fundraising ideas, charity fundraising ideas, club fundraising ideas, school fundraising ideas',
    },

    '/resources/guides': {
      title: 'Fundraising Guides | FundRaisely',
      description:
        'Practical fundraising guides for planning, tickets, payments, reports and community events.',
      canonical: ABS(hostOrigin, '/resources/guides'),
      keywords:
        'fundraising guides, charity fundraising guide, fundraising event planning, payment tracking guide',
    },

    // Legal pages — public, but not SEO landing pages.
    '/legal/privacy': {
      title: 'Privacy Policy | FundRaisely',
      description: 'Read the FundRaisely privacy policy.',
      canonical: ABS(hostOrigin, '/legal/privacy'),
      robots: 'noindex, follow',
    },

    '/legal/terms': {
      title: 'Terms of Service | FundRaisely',
      description: 'Read the FundRaisely terms of service.',
      canonical: ABS(hostOrigin, '/legal/terms'),
      robots: 'noindex, follow',
    },

    '/legal/cookies': {
      title: 'Cookie Policy | FundRaisely',
      description: 'Read the FundRaisely cookie policy.',
      canonical: ABS(hostOrigin, '/legal/cookies'),
      robots: 'noindex, follow',
    },

    // Web3 public/searchable pages.
    '/web3': {
      title: 'Web3 Fundraising | FundRaisely',
      description:
        'Explore FundRaisely’s Web3 fundraising tools for crypto-enabled fundraising events, transparent records and community-led fundraising.',
      canonical: ABS(hostOrigin, '/web3'),
      keywords:
        'web3 fundraising, crypto fundraising, blockchain charity, on-chain fundraising, DAO fundraising',
    },

    '/web3/features': {
      title: 'Web3 Fundraising Features | FundRaisely',
      description:
        'Explore FundRaisely Web3 features including crypto payments, transparent fundraising records, smart contract flows and blockchain-enabled fundraising games.',
      canonical: ABS(hostOrigin, '/web3/features'),
      keywords:
        'web3 fundraising features, crypto charity, smart contract fundraising, blockchain fundraising software',
    },

    '/web3/partners': {
      title: 'Web3 Fundraising Partners | FundRaisely',
      description:
        'Meet the Web3 ecosystem, infrastructure and community partners supporting FundRaisely’s blockchain-enabled fundraising work.',
      canonical: ABS(hostOrigin, '/web3/partners'),
      keywords:
        'web3 fundraising partners, crypto fundraising partners, blockchain charity partners, Solana fundraising, Base fundraising',
    },

    '/web3/events': {
      title: 'Web3 Fundraising Events | FundRaisely',
      description:
        'Discover Web3 fundraising events, crypto-enabled community fundraisers and blockchain-supported fundraising activity.',
      canonical: ABS(hostOrigin, '/web3/events'),
      keywords:
        'web3 fundraising events, crypto charity events, blockchain fundraising events',
    },

    '/web3/host': {
      title: 'Host a Web3 Fundraiser | FundRaisely',
      description:
        'Host a Web3 fundraising event with FundRaisely using crypto payments, transparent records and digital game formats.',
      canonical: ABS(hostOrigin, '/web3/host'),
      keywords:
        'host web3 fundraiser, crypto fundraising host, host blockchain charity event',
    },

    '/web3/causes': {
      title: 'Web3 Fundraising Causes | FundRaisely',
      description:
        'Explore causes and fundraising destinations supported by FundRaisely’s Web3 fundraising tools.',
      canonical: ABS(hostOrigin, '/web3/causes'),
      keywords:
        'web3 causes, crypto charity causes, blockchain fundraising causes',
    },

    '/web3/elimination': {
      title: 'Web3 Elimination Game Fundraising | FundRaisely',
      description:
        'Explore elimination-style Web3 fundraising games with crypto payments, live participation and transparent fundraising records.',
      canonical: ABS(hostOrigin, '/web3/elimination'),
      keywords:
        'web3 elimination game, crypto elimination game fundraiser, blockchain fundraising game',
    },

    '/web3/quiz': {
      title: 'Web3 Quiz Fundraising | Crypto-powered quiz nights | FundRaisely',
      description:
        'Run a Web3 quiz fundraiser with crypto payments, live gameplay, transparent records and impact reporting.',
      canonical: ABS(hostOrigin, '/web3/quiz'),
      keywords:
        'web3 quiz, crypto quiz fundraiser, blockchain quiz night, on-chain trivia fundraiser',
    },

    // Web3 routes that exist but should not be searchable.
    '/web3/impact-campaign': {
      title: 'Web3 Impact Campaign | FundRaisely',
      description: 'FundRaisely Web3 Impact Campaign page.',
      canonical: ABS(hostOrigin, '/web3/impact-campaign'),
      robots: 'noindex, nofollow',
    },

    '/web3/impact-campaign/join': {
      title: 'Join the Web3 Impact Campaign | FundRaisely',
      description: 'FundRaisely Web3 Impact Campaign join page.',
      canonical: ABS(hostOrigin, '/web3/impact-campaign/join'),
      robots: 'noindex, nofollow',
    },

    '/web3/impact-campaign/baseapp': {
      title: 'Web3 Impact Campaign Mini App | FundRaisely',
      description: 'FundRaisely Web3 Impact Campaign mini app.',
      canonical: ABS(hostOrigin, '/web3/impact-campaign/baseapp'),
      robots: 'noindex, nofollow',
    },

    '/web3/fundraisersdashboard': {
      title: 'Web3 Fundraisers Dashboard | FundRaisely',
      description: 'Private FundRaisely Web3 fundraiser dashboard.',
      canonical: ABS(hostOrigin, '/web3/fundraisersdashboard'),
      robots: 'noindex, nofollow',
    },
    '/events/safe-streets-ireland-padel': {
  title: 'Safe Streets Ireland Padel Fundraiser | FundRaisely',
  description:
    'Safer Streets. Stronger Communities. Brighter Futures. Supported by FundRaisely.',
  canonical: ABS(hostOrigin, '/events/safe-streets-ireland-padel'),
  image: ABS(hostOrigin, '/partners/SSI_LOGO_Transparent.png'),
  type: 'event',
  robots: 'index, follow',
  keywords:
    'Safe Streets Ireland, padel fundraiser, House of Padel, community fundraiser, youth violence prevention, FundRaisely',
},

    // Existing public campaign page.
    '/campaigns/clubs-league': {
      title: 'Junior Sports Clubs Quiz League 2026 | FundRaisely',
      description:
        'Join the FundRaisely Junior Sports Clubs Quiz League. Your club runs one family quiz night, raises funds for junior teams, and competes for prizes.',
      canonical: ABS(hostOrigin, '/campaigns/clubs-league'),
      keywords:
        'club fundraising, quiz night fundraiser, youth sports fundraising, GAA fundraiser, soccer club fundraiser, family quiz night',
      type: 'website',
      robots: 'index, follow',
    },
  };

  if (byPath[clean]) {
    return { ...common, ...byPath[clean] };
  }

  if (isNoindexPath(clean)) {
    return noindexSeo(hostOrigin, clean);
  }

  return { ...common, ...byPath['/'] };
}
