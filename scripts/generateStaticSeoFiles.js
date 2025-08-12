// scripts/generateStaticSeoFiles.js
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const publicPages = [
  {
    path: '/',
    priority: 1.0,
    changefreq: 'weekly'
  },
  {
    path: '/whats-new',
    priority: 0.8,
    changefreq: 'weekly'
  },
  {
    path: '/Web3-Impact-Event',
    priority: 0.9,
    changefreq: 'monthly'
  }
];

function generateSitemap(domain, pages) {
  const baseUrl = `https://${domain}`;
  const alternateBaseUrl = domain === 'fundraisely.co.uk' 
    ? 'https://fundraisely.ie' 
    : 'https://fundraisely.co.uk';
  
  const today = new Date().toISOString().split('T')[0];
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" 
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${pages.map(page => `  <url>
    <loc>${baseUrl}${page.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
    <xhtml:link rel="alternate" hreflang="${domain === 'fundraisely.co.uk' ? 'en-IE' : 'en-GB'}" href="${alternateBaseUrl}${page.path}" />
  </url>`).join('\n')}
</urlset>`;
}

function generateRobotsTxt(domain) {
  return `User-agent: *

# ALLOW - Public pages
Allow: /
Allow: /whats-new
Allow: /Web3-Impact-Event

# BLOCK - Private pages
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

Crawl-delay: 1
Sitemap: https://${domain}/sitemap.xml
`;
}

// Generate files
try {
  // Ensure public directory exists
  mkdirSync('public', { recursive: true });
  
  // Generate UK files
  const ukSitemap = generateSitemap('fundraisely.co.uk', publicPages);
  const ukRobots = generateRobotsTxt('fundraisely.co.uk');
  
  writeFileSync(join('public', 'sitemap-uk.xml'), ukSitemap);
  writeFileSync(join('public', 'robots-uk.txt'), ukRobots);
  
  // Generate IE files
  const ieSitemap = generateSitemap('fundraisely.ie', publicPages);
  const ieRobots = generateRobotsTxt('fundraisely.ie');
  
  writeFileSync(join('public', 'sitemap-ie.xml'), ieSitemap);
  writeFileSync(join('public', 'robots-ie.txt'), ieRobots);
  
  // Create default files (UK version)
  writeFileSync(join('public', 'sitemap.xml'), ukSitemap);
  writeFileSync(join('public', 'robots.txt'), ukRobots);
  
  console.log('✅ Static SEO files generated successfully!');
  console.log('  - sitemap-uk.xml, sitemap-ie.xml, sitemap.xml');
  console.log('  - robots-uk.txt, robots-ie.txt, robots.txt');
} catch (error) {
  console.error('❌ Error generating static SEO files:', error);
}