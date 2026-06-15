// server/SeoRoutes.js

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, '../public');

function isIrelandHost(host) {
  return host.includes('fundraisely.ie');
}

export function seoRoutes(app) {
  app.get('/sitemap.xml', (req, res) => {
    const host = (req.get('host') || '').toLowerCase();
    const file = isIrelandHost(host) ? 'sitemap-ie.xml' : 'sitemap-uk.xml';
    const filePath = path.join(PUBLIC_DIR, file);

    res.type('application/xml; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');

    res.sendFile(filePath, (err) => {
      if (err) {
        console.error(`❌ Error serving ${file}:`, err);
        res.status(404).send('Sitemap not found');
      }
    });
  });

  app.get('/robots.txt', (req, res) => {
    if (process.env.APP_ENV === 'staging') {
      res.type('text/plain; charset=utf-8');
      res.set('Cache-Control', 'public, max-age=0, must-revalidate');
      return res.send('User-agent: *\nDisallow: /\n');
    }

    const host = (req.get('host') || '').toLowerCase();
    const file = isIrelandHost(host) ? 'robots-ie.txt' : 'robots-uk.txt';
    const filePath = path.join(PUBLIC_DIR, file);

    res.type('text/plain; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');

    res.sendFile(filePath, (err) => {
      if (err) {
        console.error(`❌ Error serving ${file}:`, err);
        res.status(404).send('Robots.txt not found');
      }
    });
  });
}


