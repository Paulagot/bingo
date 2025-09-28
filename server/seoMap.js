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
    // Add more marketing pages here:
    // '/quiz/how-it-works': { ... },
    // '/quiz/features': { ... },
    // '/quiz/use-cases/schools': { ... },
  };

  return { ...common, ...(byPath[clean] || byPath['/']) };
}
