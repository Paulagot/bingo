// scripts/generateStaticSeoFiles.js

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// PUBLIC PAGES YOU WANT INDEXED.
// No trailing slash for canonical consistency.
const publicPages = [
  { path: '/', priority: 1.0, changefreq: 'weekly' },
  { path: '/demo', priority: 0.8, changefreq: 'monthly' },
  { path: '/pricing', priority: 0.8, changefreq: 'monthly' },
  { path: '/how-it-works', priority: 0.8, changefreq: 'monthly' },
  { path: '/about', priority: 0.6, changefreq: 'monthly' },
  { path: '/contact', priority: 0.6, changefreq: 'monthly' },

  // Features
  { path: '/features', priority: 0.9, changefreq: 'monthly' },
  { path: '/features/dashboard', priority: 0.8, changefreq: 'monthly' },
  { path: '/features/campaign-manager', priority: 0.7, changefreq: 'monthly' },
  { path: '/features/event-manager', priority: 0.8, changefreq: 'monthly' },
  { path: '/features/ticketing', priority: 0.9, changefreq: 'monthly' },
  { path: '/features/payments', priority: 0.9, changefreq: 'monthly' },
  { path: '/features/reports', priority: 0.8, changefreq: 'monthly' },
  { path: '/features/impact-reports', priority: 0.7, changefreq: 'monthly' },
  { path: '/features/crm', priority: 0.6, changefreq: 'monthly' },
  { path: '/features/ai-prize-finder', priority: 0.7, changefreq: 'monthly' },

  // Event formats
  { path: '/event-formats', priority: 0.9, changefreq: 'monthly' },
  { path: '/event-formats/quiz', priority: 0.9, changefreq: 'monthly' },
  { path: '/event-formats/elimination', priority: 0.7, changefreq: 'monthly' },
  { path: '/event-formats/puzzle-challenges', priority: 0.7, changefreq: 'monthly' },
  { path: '/event-formats/escape-room', priority: 0.6, changefreq: 'monthly' },
  { path: '/event-formats/treasure-hunt', priority: 0.6, changefreq: 'monthly' },

  // Use cases
  { path: '/use-cases', priority: 0.8, changefreq: 'monthly' },
  { path: '/use-cases/sports-clubs', priority: 0.8, changefreq: 'monthly' },
  { path: '/use-cases/schools-ptas', priority: 0.8, changefreq: 'monthly' },
  { path: '/use-cases/charities', priority: 0.8, changefreq: 'monthly' },
  { path: '/use-cases/community-groups', priority: 0.8, changefreq: 'monthly' },

  // Resources
  { path: '/blog', priority: 0.7, changefreq: 'weekly' },
  { path: '/resources', priority: 0.7, changefreq: 'monthly' },
  { path: '/resources/fundraising-ideas', priority: 0.7, changefreq: 'monthly' },
  { path: '/resources/guides', priority: 0.7, changefreq: 'monthly' },

  // Web3 public/searchable pages
  { path: '/web3', priority: 0.8, changefreq: 'monthly' },
  { path: '/web3/features', priority: 0.8, changefreq: 'monthly' },
  { path: '/web3/partners', priority: 0.7, changefreq: 'monthly' },
  { path: '/web3/events', priority: 0.7, changefreq: 'weekly' },
  { path: '/web3/host', priority: 0.7, changefreq: 'monthly' },
  { path: '/web3/causes', priority: 0.7, changefreq: 'monthly' },
  { path: '/web3/elimination', priority: 0.8, changefreq: 'monthly' },
  { path: '/web3/quiz', priority: 0.8, changefreq: 'monthly' },

  // Existing public campaign page
  { path: '/campaigns/clubs-league', priority: 0.7, changefreq: 'monthly' },
];

const lastmodMap = {
  // Add manual dates here if needed:
  // '/features/payments': '2026-05-30',
};

const UK_HOST = 'fundraisely.co.uk';
const IE_HOST = 'fundraisely.ie';

const DEFAULT_DOMAIN = 'fundraisely.ie';

function dateFor(path) {
  return lastmodMap[path] || new Date().toISOString().split('T')[0];
}

function altHreflangLinks(domain, path) {
  const ukUrl = `https://${UK_HOST}${path}`;
  const ieUrl = `https://${IE_HOST}${path}`;
  const defaultUrl = domain === IE_HOST ? ieUrl : ukUrl;

  return [
    `    <xhtml:link rel="alternate" hreflang="en-GB" href="${ukUrl}" />`,
    `    <xhtml:link rel="alternate" hreflang="en-IE" href="${ieUrl}" />`,
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${defaultUrl}" />`,
  ].join('\n');
}

function generateSitemap(domain, pages) {
  const baseUrl = `https://${domain}`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${pages
  .map(
    (page) => `  <url>
    <loc>${baseUrl}${page.path}</loc>
    <lastmod>${dateFor(page.path)}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
${altHreflangLinks(domain, page.path)}
  </url>`,
  )
  .join('\n')}
</urlset>`;
}

function generateRobotsTxt(domain) {
  return `User-agent: *

# ALLOW — Public marketing pages
Allow: /
Allow: /demo
Allow: /pricing
Allow: /how-it-works
Allow: /about
Allow: /contact
Allow: /features
Allow: /features/
Allow: /event-formats
Allow: /event-formats/
Allow: /use-cases
Allow: /use-cases/
Allow: /blog
Allow: /resources
Allow: /resources/

# ALLOW — Public Web3 pages
Allow: /web3
Allow: /web3/
Allow: /web3/features
Allow: /web3/partners
Allow: /web3/events
Allow: /web3/host
Allow: /web3/causes
Allow: /web3/elimination
Allow: /web3/quiz

# ALLOW — Public campaign pages
Allow: /campaigns/clubs-league

# BLOCK — Old, private, app and system routes
Disallow: /old/
Disallow: /search
Disallow: /game/
Disallow: /quiz/
Disallow: /tickets/
Disallow: /elimination/
Disallow: /challenges/
Disallow: /join/
Disallow: /mini-app/
Disallow: /BingoBlitz
Disallow: /admin/
Disallow: /dashboard/
Disallow: /user/
Disallow: /login
Disallow: /signup
Disallow: /auth
Disallow: /reset-password
Disallow: /forgot-password
Disallow: /payment/
Disallow: /checkout/
Disallow: /api/
Disallow: /mgmt/
Disallow: /socket.io/
Disallow: /debug/

# Sitemap for THIS domain only
Sitemap: https://${domain}/sitemap.xml

# Note: Google ignores Crawl-delay
Crawl-delay: 1
`;
}

try {
  mkdirSync('public', { recursive: true });

  const ukSitemap = generateSitemap(UK_HOST, publicPages);
  const ukRobots = generateRobotsTxt(UK_HOST);
  writeFileSync(join('public', 'sitemap-uk.xml'), ukSitemap);
  writeFileSync(join('public', 'robots-uk.txt'), ukRobots);

  const ieSitemap = generateSitemap(IE_HOST, publicPages);
  const ieRobots = generateRobotsTxt(IE_HOST);
  writeFileSync(join('public', 'sitemap-ie.xml'), ieSitemap);
  writeFileSync(join('public', 'robots-ie.txt'), ieRobots);

  if (DEFAULT_DOMAIN === 'ie') {
    writeFileSync(join('public', 'sitemap.xml'), ieSitemap);
    writeFileSync(join('public', 'robots.txt'), ieRobots);
  } else {
    writeFileSync(join('public', 'sitemap.xml'), ukSitemap);
    writeFileSync(join('public', 'robots.txt'), ukRobots);
  }

  console.log('✅ Static SEO files generated successfully!');
  console.log('  - sitemap-uk.xml / robots-uk.txt');
  console.log('  - sitemap-ie.xml / robots-ie.txt');
  console.log(`  - sitemap.xml / robots.txt (default = ${DEFAULT_DOMAIN.toUpperCase()})`);
} catch (error) {
  console.error('❌ Error generating static SEO files:', error);
}

