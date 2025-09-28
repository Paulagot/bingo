// scripts/generateStaticSeoFiles.js
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// PUBLIC PAGES YOU WANT INDEXED
const publicPages = [
  { path: '/', priority: 1.0, changefreq: 'weekly' },
  { path: '/whats-new', priority: 0.8, changefreq: 'weekly' },
  { path: '/Web3-Impact-Event', priority: 0.9, changefreq: 'monthly' },
  { path: '/free-trial', priority: 0.8, changefreq: 'monthly' },
  { path: '/testimonials', priority: 0.7, changefreq: 'monthly' },
  { path: '/quiz/demo', priority: 0.7, changefreq: 'monthly' }, // ✅ explicitly indexable
];

// Optional: page-specific lastmod map (leave empty if not needed)
const lastmodMap = {
  // '/whats-new': '2025-09-26', // example
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
  // We emit BOTH alternates + x-default on EVERY url entry (in BOTH sitemaps)
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
  </url>`)
  .join('\n')}
</urlset>`;
}

function generateRobotsTxt(domain) {
  return `User-agent: *

# ALLOW - Public pages
Allow: /
Allow: /whats-new
Allow: /Web3-Impact-Event
Allow: /free-trial
Allow: /testimonials
Allow: /quiz/demo   # ✅ explicit exception under /quiz/

# BLOCK - Private sections
Disallow: /game/
Disallow: /quiz/
Disallow: /pitch-deck
Disallow: /pitch-deck-content
Disallow: /BingoBlitz
Disallow: /admin/
Disallow: /dashboard/
Disallow: /user/
Disallow: /login
Disallow: /signup
Disallow: /payment/
Disallow: /checkout/
Disallow: /api/

# Sitemaps for THIS domain only
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
