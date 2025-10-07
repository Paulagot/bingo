// scripts/generateStaticSeoFiles.js
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// PUBLIC PAGES YOU WANT INDEXED
const publicPages = [
  { path: '/', priority: 1.0, changefreq: 'weekly' },
  { path: '/whats-new', priority: 0.8, changefreq: 'weekly' },
  { path: '/blog', priority: 0.7, changefreq: 'weekly' },

  // Impact Campaign (no trailing slash for canonical consistency)
  { path: '/web3/impact-campaign', priority: 0.9, changefreq: 'monthly' },
  { path: '/web3/impact-campaign/join', priority: 0.8, changefreq: 'weekly' },
  { path: '/web3/impact-campaign/leaderboard', priority: 0.6, changefreq: 'daily' },

  { path: '/free-trial', priority: 0.8, changefreq: 'monthly' },
  { path: '/testimonials', priority: 0.7, changefreq: 'monthly' },
  { path: '/quiz/demo', priority: 0.7, changefreq: 'monthly' },

  // Quiz marketing pages
  { path: '/quiz/how-it-works', priority: 0.8, changefreq: 'monthly' },
  { path: '/quiz/features', priority: 0.8, changefreq: 'monthly' },
  { path: '/quiz/use-cases', priority: 0.7, changefreq: 'monthly' },
  { path: '/quiz/use-cases/charities', priority: 0.8, changefreq: 'monthly' },
  { path: '/quiz/use-cases/clubs', priority: 0.8, changefreq: 'monthly' },
  { path: '/quiz/use-cases/schools', priority: 0.8, changefreq: 'monthly' },

  // Web3 hub
  { path: '/web3', priority: 0.8, changefreq: 'monthly' },
  { path: '/web3/how-it-works', priority: 0.8, changefreq: 'monthly' },
  { path: '/web3/features', priority: 0.8, changefreq: 'monthly' },
  { path: '/web3/partners', priority: 0.7, changefreq: 'monthly' },
  { path: '/web3/testimonials', priority: 0.7, changefreq: 'monthly' },
];

// Optional: page-specific lastmod map (leave empty if not needed)
const lastmodMap = {
  // '/whats-new': '2025-09-26',
};

const UK_HOST = 'fundraisely.co.uk';
const IE_HOST = 'fundraisely.ie';

// Which domain should produce the default sitemap.xml / robots.txt in /public ?
// Set SEO_DEFAULT_DOMAIN to "uk" or "ie" in your build environment.
const DEFAULT_DOMAIN = (process.env.SEO_DEFAULT_DOMAIN || 'uk').toLowerCase();

function dateFor(path) {
  return lastmodMap[path] || new Date().toISOString().split('T')[0];
}

function altHreflangLinks(domain, path) {
  const ukUrl = `https://${UK_HOST}${path}`;
  const ieUrl = `https://${IE_HOST}${path}`;
  // Emit both alternates + x-default on EVERY url entry (in BOTH sitemaps)
  return [
    `    <xhtml:link rel="alternate" hreflang="en-GB" href="${ukUrl}" />`,
    `    <xhtml:link rel="alternate" hreflang="en-IE" href="${ieUrl}" />`,
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${ukUrl}" />` // choose UK as x-default (swap if IE is your default)
  ].join('\n');
}

function generateSitemap(domain, pages) {
  const baseUrl = `https://${domain}`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${pages
  .map((page) => `  <url>
    <loc>${baseUrl}${page.path}</loc>
    <lastmod>${dateFor(page.path)}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
${altHreflangLinks(domain, page.path)}
  </url>`).join('\n')}
</urlset>`;
}

function generateRobotsTxt(domain) {
  return `User-agent: *

# ALLOW - Public pages
Allow: /
Allow: /whats-new
Allow: /blog

# Web3 hub + Impact Campaign
Allow: /web3
Allow: /web3/
Allow: /web3/how-it-works
Allow: /web3/features
Allow: /web3/partners
Allow: /web3/testimonials
Allow: /web3/impact-campaign
Allow: /web3/impact-campaign/join
Allow: /web3/impact-campaign/leaderboard

# Quiz marketing pages
Allow: /quiz/demo
Allow: /quiz/how-it-works
Allow: /quiz/features
Allow: /quiz/use-cases
Allow: /quiz/use-cases/
Allow: /quiz/use-cases/charities
Allow: /quiz/use-cases/clubs
Allow: /quiz/use-cases/schools

# BLOCK - Private sections
Disallow: /game/
Disallow: /quiz/           # app/private quiz routes are blocked...
                           # ...but explicit Allows above keep the marketing pages open
Disallow: /BingoBlitz
Disallow: /admin/
Disallow: /dashboard/
Disallow: /user/
Disallow: /login
Disallow: /signup
Disallow: /payment/
Disallow: /checkout/
Disallow: /api/

# Sitemap for THIS domain only
Sitemap: https://${domain}/sitemap.xml

Crawl-delay: 1
`;
}

// Write files
try {
  mkdirSync('public', { recursive: true });

  // UK
  const ukSitemap = generateSitemap(UK_HOST, publicPages);
  const ukRobots = generateRobotsTxt(UK_HOST);
  writeFileSync(join('public', 'sitemap-uk.xml'), ukSitemap);
  writeFileSync(join('public', 'robots-uk.txt'), ukRobots);

  // IE
  const ieSitemap = generateSitemap(IE_HOST, publicPages);
  const ieRobots = generateRobotsTxt(IE_HOST);
  writeFileSync(join('public', 'sitemap-ie.xml'), ieSitemap);
  writeFileSync(join('public', 'robots-ie.txt'), ieRobots);

  // Default copies based on env (so the correct one is served as /sitemap.xml & /robots.txt)
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
  console.log(`  - sitemap.xml / robots.txt (defaults = ${DEFAULT_DOMAIN.toUpperCase()})`);
} catch (error) {
  console.error('❌ Error generating static SEO files:', error);
}

