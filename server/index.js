import dotenv from 'dotenv';
dotenv.config();

// ADD DEBUG immediately after:
console.log('🔍 Server Environment Debug:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_PORT:', process.env.DB_PORT);

//server/index.js
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { setupSocketHandlers } from './socketHandler.js';
import { PORT } from './config.js';
import { logAllRooms } from './roomManager.js';
import createRoomApi from './quiz/api/create-room.js';
console.log('🔍 About to import community-registration...');
import communityRegistrationApi from './quiz/api/community-registration.js';
console.log('✅ Community registration imported:', communityRegistrationApi);
console.log('📦 Type:', typeof communityRegistrationApi);

import { initializeDatabase } from './config/database.js';

import { seoRoutes } from './SeoRoutes.js';
import { getSeoForPath } from './seoMap.js'; // ⬅️ NEW: route→SEO map (server/seoMap.js)

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url} - Headers:`, req.headers);
  next();
});

console.log('🛠️ Setting up routes...');
app.use('/quiz/api', createRoomApi);
console.log('🔗 Setting up community registration route...');
app.use('/quiz/api/community-registration', communityRegistrationApi);
console.log('✅ Routes setup complete'); 

console.log('📋 Registered routes:');
app._router.stack.forEach((middleware) => {
  if (middleware.route) {
    console.log(`  ${Object.keys(middleware.route.methods)} ${middleware.route.path}`);
  } else if (middleware.name === 'router') {
    console.log(`  Router: ${middleware.regexp}`);
  }
});

app.get('/quiz/api/community-registration/test', (req, res) => {
  res.json({ message: 'Route is working!' });
});

// Add this BEFORE your existing static file serving
// Dynamic sitemap and robots.txt based on domain
app.get('/sitemap.xml', (req, res) => {
  const host = req.get('host');
  console.log(`🗺️ Serving sitemap for host: ${host}`);
  
  let sitemapFile;
  
  if (host?.includes('fundraisely.co.uk')) {
    sitemapFile = 'sitemap-uk.xml';
  } else if (host?.includes('fundraisely.ie')) {
    sitemapFile = 'sitemap-ie.xml';
  } else {
    // Default to UK for localhost/development
    sitemapFile = 'sitemap-uk.xml';
  }
  
  const sitemapPath = path.join(__dirname, '../public', sitemapFile);
  
  res.type('application/xml');
  res.sendFile(sitemapPath, (err) => {
    if (err) {
      console.error(`❌ Error serving ${sitemapFile}:`, err);
      res.status(404).send('Sitemap not found');
    }
  });
});

app.get('/robots.txt', (req, res) => {
  const host = req.get('host');
  console.log(`🤖 Serving robots.txt for host: ${host}`);
  
  let robotsFile;
  
  if (host?.includes('fundraisely.co.uk')) {
    robotsFile = 'robots-uk.txt';
  } else if (host?.includes('fundraisely.ie')) {
    robotsFile = 'robots-ie.txt';
  } else {
    robotsFile = 'robots-uk.txt';
  }
  
  const robotsPath = path.join(__dirname, '../public', robotsFile);
  
  res.type('text/plain');
  res.sendFile(robotsPath, (err) => {
    if (err) {
      console.error(`❌ Error serving ${robotsFile}:`, err);
      res.status(404).send('Robots.txt not found');
    }
  });
});

// ✅ Serve static files in development
app.use(express.static(path.join(__dirname, '../public')));

// ---------- SEO HEAD INJECTION HELPERS (NEW) ----------
function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function buildHeadTags(seo) {
  const {
    title,
    description,
    image,
    type = 'website',
    canonical,
    keywords,
    robots = 'index, follow',
  } = seo;

  return [
    `<title>${escapeHtml(title)}</title>`,

    // Basic
    `<meta id="meta-description" name="description" content="${escapeHtml(description)}">`,
    robots ? `<meta id="meta-robots" name="robots" content="${robots}">` : '',
    keywords ? `<meta id="meta-keywords" name="keywords" content="${escapeHtml(keywords)}">` : '',

    // Open Graph
    `<meta id="og-title" property="og:title" content="${escapeHtml(title)}">`,
    `<meta id="og-description" property="og:description" content="${escapeHtml(description)}">`,
    `<meta id="og-image" property="og:image" content="${escapeHtml(image)}">`,
    `<meta id="og-type" property="og:type" content="${type}">`,
    canonical ? `<meta id="og-url" property="og:url" content="${escapeHtml(canonical)}">` : '',
    `<meta id="og-site" property="og:site_name" content="FundRaisely">`,

    // Twitter
    `<meta id="tw-card" name="twitter:card" content="summary_large_image">`,
    `<meta id="tw-title" name="twitter:title" content="${escapeHtml(title)}">`,
    `<meta id="tw-description" name="twitter:description" content="${escapeHtml(description)}">`,
    `<meta id="tw-image" name="twitter:image" content="${escapeHtml(image)}">`,

    // Canonical (id so SEO.tsx updates, not duplicates)
    canonical ? `<link id="link-canonical" rel="canonical" href="${escapeHtml(canonical)}">` : '',
  ].filter(Boolean).join('\n    ');
}


// ✅ Serve frontend build in production with optimized cache headers
if (process.env.NODE_ENV === 'production') {
  // Serve static assets with aggressive caching
  app.use('/assets', express.static(path.join(__dirname, '../dist/assets'), {
    maxAge: '31536000000', // 1 year in milliseconds
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      // Set aggressive caching for static assets
      if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        console.log(`💾 Setting 1-year cache for: ${path.basename(filePath)}`);
      } else if (filePath.endsWith('.woff2') || filePath.endsWith('.woff')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=31536000');
      }
    }
  }));

  // Serve other static files with normal caching
  app.use(express.static(path.join(__dirname, '../dist'), {
    index: false,             // ⬅️ important so our catch-all below always runs
    maxAge: '3600000', // 1 hour for other files
    etag: true,
    lastModified: true
  }));

  // Serve HTML with server-injected <head> (no-cache for HTML)
  app.get('*', (req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');

    const indexPath = path.join(__dirname, '../dist/index.html');
    fs.readFile(indexPath, 'utf8', (err, html) => {
      if (err) {
        console.error('❌ Failed to read index.html', err);
        return res.status(500).send('Server error');
      }
      const proto = (req.headers['x-forwarded-proto']?.toString()) || (req.secure ? 'https' : 'http');
      const origin = `${proto}://${req.get('host')}`;
      const seo = getSeoForPath(req.path, origin);
      const head = buildHeadTags(seo);

      const out = html.replace('<!--app-head-->', head);
      res.status(200).send(out);
    });
  });
} else {
  // Development mode - serve dist if it exists (no implicit index)
  app.use(express.static(path.join(__dirname, '../dist'), { index: false }));
  
  // Dev HTML with server-injected <head>, disable cache to avoid confusion
  app.get('*', (req, res) => {
    const indexPath = path.join(__dirname, '../dist/index.html');
    fs.readFile(indexPath, 'utf8', (err, html) => {
      if (err) {
        console.error('❌ Failed to read index.html', err);
        return res.status(500).send('Server error');
      }
      const proto = (req.headers['x-forwarded-proto']?.toString()) || (req.secure ? 'https' : 'http');
      const origin = `${proto}://${req.get('host')}`;
      const seo = getSeoForPath(req.path, origin);
      const head = buildHeadTags(seo);

      const out = html.replace('<!--app-head-->', head);
      res.set('Cache-Control', 'no-store');
      res.status(200).send(out);
    });
  });
}

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: [
      'https://fundraisely.ie',
      'https://www.fundraisely.ie',
      'https://fundraisely.co.uk',
      'https://www.fundraisely.co.uk',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:3000',
      'http://localhost:3001'
    ],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Host-based sitemap/robots helper (your existing module)
seoRoutes(app);

// Socket handlers
setupSocketHandlers(io);

// ✅ Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// ✅ Room debug
app.get('/debug/rooms', (req, res) => {
  const roomStates = logAllRooms();
  res.json({
    totalRooms: roomStates.length,
    rooms: roomStates
  });
});

// Add this before starting the server
// Replace the startServer function and the final listen call with this:
async function startServer() {
  try {
    // Initialize database connection FIRST
    await initializeDatabase();
    
    // THEN start the server (only once!)
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`💾 Cache headers: ${process.env.NODE_ENV === 'production' ? 'Optimized (1 year)' : 'Development mode'}`);
      console.log(`🗄️ Database connected`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Call the startup function (replaces the duplicate httpServer.listen)
startServer().catch(console.error);
