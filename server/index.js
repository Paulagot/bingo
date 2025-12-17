// server/index.js
import dotenv from 'dotenv';
dotenv.config();

// ADD DEBUG immediately after:
console.log('🔍 Server Environment Debug:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_PORT:', process.env.DB_PORT);

// 🔍 SMTP debug
console.log('SMTP_HOST:', process.env.SMTP_HOST);
console.log('SMTP_PORT:', process.env.SMTP_PORT);
console.log('SMTP_SECURE:', process.env.SMTP_SECURE);
console.log('SMTP_USER:', process.env.SMTP_USER);
console.log('MAIL_FROM:', process.env.MAIL_FROM);

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
import impactCampaignPledgeApi from './quiz/api/impactcampaign-pledge.js';
console.log('✅ Community registration imported:', communityRegistrationApi);
console.log('📦 Type:', typeof communityRegistrationApi);

import { initializeDatabase } from './config/database.js';

import createDepositAddress from './tgb/api/create-deposit-address.js';
import tgbWebhookHandler from './tgb/api/webhook.js';

import contactRoute from './routes/contact.js';
import passwordResetRoute from './routes/passwordReset.js';

// ✅ NEW: import mailer verify helper
import { verifyMailer } from './utils/mailer.js';

import { seoRoutes } from './SeoRoutes.js';
import { getSeoForPath } from './seoMap.js'; // route→SEO map (server/seoMap.js)
import helmet from 'helmet';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { v4 as uuidv4 } from 'uuid';
import { logger, loggers, logRequest, logResponse } from './config/logging.js';

const app = express();

// 🔍 Verify SMTP once at startup (non-blocking)
verifyMailer().catch((err) => {
  console.warn('📧 SMTP verify threw (will still try on send):', err?.message || err);
});

// Health check endpoint - MUST be first so it's always available
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3001
  });
});

app.use(cors());

// Accept JSON bodies (existing)
app.use(express.json({ limit: '100kb' }));
// Accept raw/text bodies too (TGB may send raw encrypted string bodies)
app.use(express.text({ type: 'text/*', limit: '100kb' }));
// JSON body parser - Express will automatically handle parsing errors
app.use(express.json({ 
  limit: '100kb',
  strict: true
}));

// Handle JSON parsing errors (Express throws SyntaxError for invalid JSON)
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('[Server] ❌ JSON parsing error:', err.message);
    console.error('[Server] ❌ Request path:', req.path);
    console.error('[Server] ❌ Request method:', req.method);
    console.error('[Server] ❌ Request headers:', {
      'content-type': req.headers['content-type'],
      'content-length': req.headers['content-length']
    });
    
    if (!res.headersSent) {
      try {
        res.status(400);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ 
          error: 'Invalid JSON',
          message: 'Request body contains invalid JSON',
          details: err.message
        }));
        console.log('[Server] ✅ JSON parsing error response sent');
        return;
      } catch (sendErr) {
        console.error('[Server] ❌ Failed to send JSON parsing error response:', sendErr);
      }
    }
  }
  next(err);
});

const isProd = process.env.NODE_ENV === 'production';

// Request ID and logging middleware
app.use((req, res, next) => {
  req.requestId = uuidv4();
  req.startTime = Date.now();

  // Log incoming requests
  if (process.env.LOG_LEVEL === 'debug') {
    logRequest(loggers.server, req);
  }

  // Log response when finished
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - req.startTime;
    if (process.env.LOG_LEVEL === 'debug') {
      logResponse(loggers.server, req, res, duration);
    }
    return originalSend.call(this, data);
  };

  next();
});

// Health check endpoint is already defined at the top for immediate availability

/* ──────────────────────────────────────────────────────────
   TGB endpoints (deposit address creation + webhook)
   Keep these grouped and mounted early (before heavy middleware)
   ────────────────────────────────────────────────────────── */
app.post('/api/tgb/create-deposit-address', createDepositAddress);
app.post('/api/tgb/webhook', tgbWebhookHandler);

/* ──────────────────────────────────────────────────────────
   Security headers (safe defaults; CSP in Report-Only)
   ────────────────────────────────────────────────────────── */
// Security headers (safe defaults)
app.use(helmet({
  xPoweredBy: false,
  // Coinbase Smart Wallet: COOP must NOT be 'same-origin'.
  // Use 'same-origin-allow-popups' globally, or disable on wallet routes.
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  // Keep resource policy conservative; adjust if you serve from multiple domains.
  crossOriginResourcePolicy: { policy: 'same-site' },
}));

// Build scalable allowlists from env
const ALLOWED_CONNECT = [
  "'self'",
  "https:",
  "wss:",
  // API
  "https://mgtsystem-production.up.railway.app",
  // WalletConnect & RPCs (wildcards where possible)
  "https://rpc.walletconnect.org",
  "https://*.walletconnect.com",
  "wss://*.walletconnect.com",
    "https://relay.walletconnect.com",     // ✅ Main relay
  "wss://relay.walletconnect.com",       // ✅ WebSocket relay
  "https://relay.walletconnect.org",     // ✅ Alt domain
  "wss://relay.walletconnect.org", 
  // Base
  "https://mainnet.base.org",
  "https://sepolia.base.org",
  // Avalanche
  "https://api.avax.network",
  "https://api.avax-test.network",
  "https://avalanche-fuji-c-chain.publicnode.com",
  "https://*.publicnode.com",
  "https://*.ankr.com",
  "https://*.llamarpc.com",
  "wss://avalanche-fuji.drpc.org",
  // Add more chains via env (comma-separated)
  ...(process.env.CSP_CONNECT_EXTRA?.split(',').map(s => s.trim()).filter(Boolean) ?? []),
];

const cspDirectives = {
  defaultSrc: ["'self'"],
  baseUri: ["'self'"],
  objectSrc: ["'none'"],

  scriptSrc: ["'self'", "https:", "'unsafe-inline'"],
  scriptSrcElem: ["'self'", "https:", "'unsafe-inline'"],
  scriptSrcAttr: ["'none'"],
  styleSrc: ["'self'", "https:", "'unsafe-inline'"],

  imgSrc: ["'self'", "data:", "blob:", "https:", "https://images.walletconnect.com", "https://static.walletconnect.com"],
  fontSrc: ["'self'", "https:", "data:"],
  mediaSrc: ["'self'", "https:"],
  workerSrc: ["'self'", "blob:"],
  manifestSrc: ["'self'"],

  // ✅ UPDATED: Added WalletConnect verification domains
  frameSrc: [
    "'self'", 
    "https://www.youtube.com", 
    "https://www.youtube-nocookie.com", 
    "https://player.vimeo.com",
    "https://verify.walletconnect.com",
    "https://verify.walletconnect.org",
    "https://secure.walletconnect.com",
    "https://secure.walletconnect.org"
  ],
  frameAncestors: ["'self'"],

  connectSrc: ALLOWED_CONNECT,

  upgradeInsecureRequests: [],
};

app.use(helmet.contentSecurityPolicy({
  directives: cspDirectives,
  reportOnly: false, // You can flip to true temporarily to test
}));

// ──────────────────────────────────────────────────────────
// 301 redirects (run BEFORE routes/static/SPA handlers)
// ──────────────────────────────────────────────────────────
app.use((req, res, next) => {
  const { path: p } = req;

  // helper to redirect with preserved querystring
  const redirect = (target) => {
    const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    return res.redirect(301, target + qs);
  };

  // Collapse accidental double /web3/web3/*
  if (/^\/web3\/web3(\/.*)?$/i.test(p)) {
    const tail = p.replace(/^\/web3\/web3/i, '/web3');
    return redirect(tail);
  }

  // Legacy: /web3-impact-event[/...]*  → /web3/impact-campaign[/...]*
  const m1 = p.match(/^\/web3-impact-event(?:\/(.*))?$/i) || p.match(/^\/Web3-Impact-Event(?:\/(.*))?$/);
  if (m1) return redirect('/web3/impact-campaign' + (m1[1] ? '/' + m1[1] : ''));

  // Legacy: /impact[/...]* → /web3/impact-campaign[/...]*
  const m2 = p.match(/^\/impact(?:\/(.*))?$/i);
  if (m2) return redirect('/web3/impact-campaign' + (m2[1] ? '/' + m2[1] : ''));

  // Legacy: /web3-fundraising-quiz[/...]* → /web3[/...]*
  const m3 = p.match(/^\/web3-fundraising-quiz(?:\/(.*))?$/i);
  if (m3) return redirect('/web3' + (m3[1] ? '/' + m3[1] : ''));

  // Convenience: /uk or /ireland → /
  if (/^\/(uk|ireland)\/?$/i.test(p)) return redirect('/');

  next();
});


// Trusted Types (Report-Only) — surfaces DOM sink usage without breaking anything
// app.use((req, res, next) => {
//   const existing = res.getHeader('Content-Security-Policy-Report-Only') || '';
//   res.setHeader('Content-Security-Policy-Report-Only', String(existing) + `; require-trusted-types-for 'script'`);
//   next();
// });

// ──────────────────────────────────────────────────────────
//  Request logging
// ──────────────────────────────────────────────────────────
app.use((req, res, next) => {
  // Only log API requests to reduce noise
  if (req.path.startsWith('/quiz/api') || req.path.startsWith('/api')) {
    console.log(`📥 ${req.method} ${req.url}`);
    console.log(`📥 Headers:`, {
      'content-type': req.headers['content-type'],
      'content-length': req.headers['content-length'],
      'user-agent': req.headers['user-agent']?.substring(0, 50)
    });
  }
  next();
});

// Mount quiz and other API routers
app.use('/quiz/api/community-registration', communityRegistrationApi);
app.use('/quiz/api/impactcampaign/pledge', impactCampaignPledgeApi);

console.log('🛠️ Setting up routes...');
app.use('/quiz/api', createRoomApi);
console.log('🔗 Setting up community registration route...');

console.log('✅ Routes setup complete');

console.log('📋 Registered routes:');
app._router?.stack?.forEach((mw) => {
  if (mw.route) console.log(`  ${Object.keys(mw.route.methods)} ${mw.route.path}`);
  else if (mw.name === 'router') console.log(`  Router: ${mw.regexp}`);
});

app.get('/quiz/api/community-registration/test', (req, res) => {
  res.json({ message: 'Route is working!' });
});

/* ──────────────────────────────────────────────────────────
   Host-based sitemap / robots
   ────────────────────────────────────────── */
app.get('/sitemap.xml', (req, res) => {
  const host = req.get('host');
  console.log(`🗺️ Serving sitemap for host: ${host}`);
  let sitemapFile =
    host?.includes('fundraisely.co.uk') ? 'sitemap-uk.xml'
    : host?.includes('fundraisely.ie')   ? 'sitemap-ie.xml'
    : 'sitemap-uk.xml';
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
  let robotsFile =
    host?.includes('fundraisely.co.uk') ? 'robots-uk.txt'
    : host?.includes('fundraisely.ie')   ? 'robots-ie.txt'
    : 'robots-uk.txt';
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

/* ──────────────────────────────────────────────────────────
   SEO head injection helpers
   ────────────────────────────────────────────────────────── */
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
    robots: robotsFromSeo = 'index, follow',
  } = seo;

  const isStaging = process.env.APP_ENV === 'staging';
  const robots = isStaging ? 'noindex, nofollow' : robotsFromSeo;

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

/* ──────────────────────────────────────────────────────────
   Static + SPA catch-all with SEO head injection
   ────────────────────────────────────────────────────────── */
if (process.env.NODE_ENV === 'production') {
  // Static assets with aggressive caching
  app.use('/assets', express.static(path.join(__dirname, '../dist/assets'), {
    maxAge: '31536000000', // 1 year
    etag: true,
    lastModified: true,

    // ⭐ FIX: Ensure correct MIME type for Vite-built ES modules
    setHeaders: (res, filePath) => {
      // MIME type fixes
      if (filePath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      }
      if (filePath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
      }

      // Your original caching logic (unchanged)
      if (
        filePath.endsWith('.js') ||
        filePath.endsWith('.css') ||
        filePath.endsWith('.woff2') ||
        filePath.endsWith('.woff')
      ) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        console.log(`💾 Setting 1-year cache for: ${path.basename(filePath)}`);
      } else {
        res.setHeader('Cache-Control', 'public, max-age=31536000');
      }
    }
  }));

  // Other static files (no implicit index)
  app.use(express.static(path.join(__dirname, '../dist'), {
    index: false,
    maxAge: '3600000', // 1 hour
    etag: true,
    lastModified: true,

    // ⭐ FIX: Also correct MIME for JS/CSS here
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      }
      if (filePath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
      }
    }
  }));

  // HTML with injected <head> (no-cache for HTML)
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
  // Dev: static without implicit index and no caching
  app.use(express.static(path.join(__dirname, '../dist'), {
    index: false,
    setHeaders: (res) => {
      // Disable caching in development to prevent stale code issues
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }));
}


  // Dev HTML injection (disable cache)
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
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      res.status(200).send(out);
    });
  });


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
      'http://localhost:3001',
      'https://fundraisely-staging.up.railway.app'
    ],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Host-based sitemap/robots helper
try {
  seoRoutes(app);
} catch (error) {
  console.error('⚠️ Failed to setup SEO routes:', error.message);
  // Continue - SEO routes are not critical for server startup
}

// Socket handlers
try {
  setupSocketHandlers(io);
} catch (error) {
  console.error('⚠️ Failed to setup socket handlers:', error.message);
  // Continue - sockets are not critical for healthcheck
}

try {
  app.use('/api/contact', contactRoute);
  app.use('/api/auth/reset', passwordResetRoute);
} catch (error) {
  console.error('⚠️ Failed to setup API routes:', error.message);
  // Continue - these routes are not critical for healthcheck
}


// Global error handler - must be last middleware (after all routes)
app.use((err, req, res, next) => {
  // Skip if this is a JSON parsing error (already handled above)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return next(err); // Let the JSON parsing error handler deal with it
  }
  
  console.error('--------------------------------------');
  console.error('[Server] ❌❌ GLOBAL ERROR HANDLER');
  console.error('[Server] ❌ Error type:', err?.constructor?.name);
  console.error('[Server] ❌ Error name:', err?.name);
  console.error('[Server] ❌ Error message:', err?.message);
  console.error('[Server] ❌ Error stack:', err?.stack);
  console.error('[Server] ❌ Request path:', req.path);
  console.error('[Server] ❌ Request method:', req.method);
  console.error('[Server] ❌ Response headers sent:', res.headersSent);
  console.error('[Server] ❌ Response status code:', res.statusCode);
  console.error('--------------------------------------');
  
  // Skip if response already sent
  if (res.headersSent) {
    console.error('[Server] ❌ Response already sent, cannot send error');
    return next(err);
  }
  
  // Handle all other errors
  try {
    const errorResponse = { 
      error: 'Internal error',
      message: err?.message || 'An unexpected error occurred',
      ...(process.env.NODE_ENV !== 'production' && { 
        details: err?.message,
        stack: err?.stack,
        name: err?.name,
        type: err?.constructor?.name
      })
    };
    
    res.status(500);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(errorResponse));
    console.log('[Server] ✅ Error response sent');
  } catch (sendErr) {
    console.error('[Server] ❌ Failed to send error response:', sendErr);
    console.error('[Server] ❌ Send error stack:', sendErr?.stack);
    // Last resort - try plain text
    try {
      if (!res.headersSent) {
        res.status(500);
        res.setHeader('Content-Type', 'text/plain');
        res.end('Internal server error: ' + (err?.message || 'Unknown error'));
        console.log('[Server] ✅ Plain text error response sent');
      }
    } catch (finalErr) {
      console.error('[Server] ❌❌ Cannot send any response');
      console.error('[Server] ❌❌ Final error:', finalErr);
    }
  }
});

// Process-level error handlers to catch unhandled errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise);
  console.error('❌ Reason:', reason);
  if (reason instanceof Error) {
    console.error('❌ Error stack:', reason.stack);
  }
  // Don't exit the process, just log it
  // In production, you might want to send this to a logging service
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.error('❌ Error stack:', error.stack);
  // For uncaught exceptions, we should exit the process
  // but log it first and give a graceful shutdown message
  console.error('❌ Server will exit due to uncaught exception');
  process.exit(1);
});

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Room debug
app.get('/debug/rooms', (req, res) => {
  const roomStates = logAllRooms();
  res.json({ totalRooms: roomStates.length, rooms: roomStates });
});

// Startup - Start server immediately, initialize database in background
// This ensures healthcheck can respond right away
console.log(`🔧 Starting server on port ${PORT}...`);
console.log(`🔧 PORT env var: ${process.env.PORT}`);
console.log(`🔧 NODE_ENV: ${process.env.NODE_ENV || 'development'}`);

try {
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`💾 Cache headers: ${process.env.NODE_ENV === 'production' ? 'Optimized (1 year)' : 'Development mode'}`);
    console.log(`✅ Healthcheck available at http://0.0.0.0:${PORT}/health`);
    console.log(`✅ Healthcheck available at http://localhost:${PORT}/health`);
  });

  // Handle listen errors
  httpServer.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use`);
      process.exit(1);
    } else {
      console.error(`❌ Server error:`, error);
      process.exit(1);
    }
  });
} catch (error) {
  console.error('❌ Failed to start server:', error);
  console.error('❌ Error stack:', error.stack);
  process.exit(1);
}

// Initialize database in background (non-blocking)
(async () => {
  try {
    await initializeDatabase();
    console.log(`🗄️ Database connected`);
  } catch (dbError) {
    console.warn('⚠️ Database connection failed, but continuing without it...');
    console.warn('⚠️ This is OK for local development if you only need Web3 rooms (in-memory)');
    console.warn('⚠️ Database features will not be available');
    console.warn(`⚠️ Error: ${dbError.message}`);
    // Don't exit - allow server to start for Web3/in-memory features
  }
})().catch((error) => {
  console.error('❌ Database initialization error:', error);
  // Don't exit - server is already running
});


