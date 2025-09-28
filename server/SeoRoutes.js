// server/seoRoutes.js (new tiny helper)
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, '../public');

export function seoRoutes(app) {
  // Host-based sitemap
  app.get('/sitemap.xml', (req, res) => {
    const host = (req.get('host') || '').toLowerCase();
    const isIE = host.includes('fundraisely.ie'); // matches with/without www
    const file = isIE ? 'sitemap-ie.xml' : 'sitemap-uk.xml';
    const filePath = path.join(PUBLIC_DIR, file);

    res.type('application/xml');
    res.set('Cache-Control', 'public, max-age=3600, s-maxage=3600'); // 1h cache
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error(`❌ Error serving ${file}:`, err);
        res.status(404).send('Sitemap not found');
      }
    });
  });

  // Host-based robots
  app.get('/robots.txt', (req, res) => {
    const host = (req.get('host') || '').toLowerCase();
    const isIE = host.includes('fundraisely.ie');
    const file = isIE ? 'robots-ie.txt' : 'robots-uk.txt';
    const filePath = path.join(PUBLIC_DIR, file);

    res.type('text/plain; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=3600, s-maxage=3600'); // 1h cache
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error(`❌ Error serving ${file}:`, err);
        res.status(404).send('Robots.txt not found');
      }
    });
  });
}

