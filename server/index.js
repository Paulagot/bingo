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
import impact_campaign_leaderboard from './quiz/api/impact-campaign-leaderboard.js';

import { initializeDatabase } from './config/database.js';

import createDepositAddress from './tgb/api/create-deposit-address.js';
import tgbWebhookHandler from './tgb/api/webhook.js';

import contactRoute from './routes/contact.js';
import passwordResetRoute from './routes/passwordReset.js';

// ✅ NEW: import mailer verify helper
import { verifyMailer } from './utils/mailer.js';

import { seoRoutes } from './SeoRoutes.js';
import { getSeoForPath } from './seoMap.js';
import helmet from 'helmet';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { v4 as uuidv4 } from 'uuid';
import { logger, loggers, logRequest, logResponse } from './config/logging.js';
import web2RoomsApi from './quiz/api/web2-rooms.js';
import eventIntegrationsApi from './mgtsystem/routes/eventIntegrations.js';
import paymentMethodsApi from './mgtsystem/routes/paymentMethods.js';
import reconciliationRoutes from './mgtsystem/routes/quizReconciliation.js';
import ticketsRouter from './mgtsystem/routes/quizTicketsRouter.js';
import quizPaymentMethodsRoutes from './mgtsystem/routes/quizPaymentMethodsRoutes.js';
import quizLatePayments from './mgtsystem/routes/quizLatePayments.js';
import quizPersonalisedRoundRouter from './mgtsystem/routes/quizPersonalisedRoundRouter.js';
import quizStatsRoutes from './mgtsystem/routes/quizStats.js';
import { stripeRouter } from './stripe/stripeRoutes.js';
import { stripeWebhookHandler } from './stripe/stripeWebhooks.js';
import frameRoutes from './quiz/api/frameRoutes.js';

const app = express();

let isDatabaseReady = false;

// 🔍 Verify SMTP once at startup (non-blocking)
verifyMailer().catch((err) => {
  console.warn('📧 SMTP verify threw (will still try on send):', err?.message || err);
});

// ─────────────────────────────────────────────────────────
// Health check — MUST be first, always available
// ─────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3001
  });
});

app.use(cors());

// ✅ Stripe webhook MUST be raw and MUST be mounted before express.json()
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhookHandler);

// Accept JSON bodies
app.use(express.json({
  limit: '100kb',
  strict: true
}));

// Accept raw/text bodies (TGB may send raw encrypted string bodies)
app.use(express.text({ type: 'text/*', limit: '100kb' }));

// ✅ Frame / Mini App routes — mounted early, before SPA catch-all
app.use('/frame', frameRoutes);

// Handle JSON parsing errors
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

// ─────────────────────────────────────────────────────────
// Base Mini App manifest
// ─────────────────────────────────────────────────────────
app.get('/.well-known/farcaster.json', (req, res) => {
  const BASE_URL = process.env.BASE_URL || 'https://fundraisely-staging.up.railway.app';
  
  res.json({
    accountAssociation: {
      header: "eyJmaWQiOi0xLCJ0eXBlIjoiYXV0aCIsImtleSI6IjB4NWI1MWIwMDQ0NDA1RDQ2NjNDZmM4QWE5ODFBMjMyY0VCMzM1MjM1ZCJ9",
      payload: "eyJkb21haW4iOiJmdW5kcmFpc2VseS1zdGFnaW5nLnVwLnJhaWx3YXkuYXBwIn0",
      signature: "AAAAAAAAAAAAAAAAyhG94Fl3s2MRZwKIYr4qFzl2yhEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeSCrVbLAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAC6XtDGqoxJA4-Bnlh-JjPEqfQooAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOQ_-6NvAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQE6oErBpRJgB1NH4sd7O2SHVZFQgKbSn1R6efWmoROk6hZ6BSLTCkTp-gXHlV7KV3yYMWOse4HfWRwyD47DMlu0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABxsbuhUz7DWbk4Mp7eqUkfp-MGGMfPsfDeSMNibitn79zELdD-5PvcgGk8ZxjikSJEXtUqBwsm4Wrl-2onMl0QwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAl8ZgIay2xclZzG8RWZzuWvO8j9R0fus3XxDee9lRlVy8FAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEMeyJ0eXBlIjoid2ViYXV0aG4uZ2V0IiwiY2hhbGxlbmdlIjoid1p2NW0wR2ktQnJjOGxyMFlwbEZZMXBMcEhLb3czNnVWcVRqbDVXd3hyVSIsIm9yaWdpbiI6Imh0dHBzOi8va2V5cy5jb2luYmFzZS5jb20iLCJjcm9zc09yaWdpbiI6ZmFsc2UsIm90aGVyX2tleXNfY2FuX2JlX2FkZGVkX2hlcmUiOiJkbyBub3QgY29tcGFyZSBjbGllbnREYXRhSlNPTiBhZ2FpbnN0IGEgdGVtcGxhdGUuIFNlZSBodHRwczovL3Blcm1hbmVudGx5LXJlbW92ZWQuaW52YWxpZC95YWJQZXgifQAAAAAAAAAAAAAAAAAAAAAAAAAAZJJkkmSSZJJkkmSSZJJkkmSSZJJkkmSSZJJkkmSSZJI"
    },

     miniapp: {
      version: '1',
      name: 'FundRaisely Quiz',
      homeUrl: `${BASE_URL}/web3/impact-campaign/baseapp`,  // ← updated TARGET_PATH
      builderCode: 'bc_vpqki8ri',                           // ← NEW: your Base builder code
      iconUrl: `${BASE_URL}/icon.png`,
      imageUrl: `${BASE_URL}/embed-image.png`,
      splashImageUrl: `${BASE_URL}/splash.png`,
      splashBackgroundColor: '#0f0f1a',
      tagline: 'Host. Play. Raise. Impact.',
      subtitle: 'Host. Play. Raise. Impact.',
      description: 'Turn your community into a force for good. Host or join a quiz night where every entry fee goes directly to a verified charity.',
      ogTitle: 'FundRaisely Quiz',
      ogDescription: 'Host a quiz. Fund a charity. On-chain, transparent, no middlemen.',
      primaryCategory: 'social',
      tags: ['quiz', 'fundraising', 'web3', 'base'],
      heroImageUrl: `${BASE_URL}/embed-image.png`,
     screenshotUrls: [
  `${BASE_URL}/Picture2.png`,
  `${BASE_URL}/Picture3.png`,
  `${BASE_URL}/Picture4.png`,
],
      ogImageUrl: `${BASE_URL}/embed-image.png`
    }
  });
});

// Database guard for API routes
app.use((req, res, next) => {
  if (req.path === '/health' || req.path === '/api/health') return next();

  if (req.path.startsWith('/api') || req.path.startsWith('/quiz/api')) {
    if (!isDatabaseReady) {
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'Database is still initializing'
      });
    }
  }
  next();
});

const isProd = process.env.NODE_ENV === 'production';

// Request ID and logging middleware
app.use((req, res, next) => {
  req.requestId = uuidv4();
  req.startTime = Date.now();

  if (process.env.LOG_LEVEL === 'debug') {
    logRequest(loggers.server, req);
  }

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

/* ──────────────────────────────────────────────────────────
   TGB endpoints
   ────────────────────────────────────────────────────────── */
app.post('/api/tgb/create-deposit-address', createDepositAddress);
app.post('/api/tgb/webhook', tgbWebhookHandler);

/* ──────────────────────────────────────────────────────────
   Stripe endpoints
   ────────────────────────────────────────────────────────── */
app.set('trust proxy', 1);
app.use('/api/stripe', stripeRouter);

/* ──────────────────────────────────────────────────────────
   Security headers
   ────────────────────────────────────────────────────────── */
app.use(helmet({
  xPoweredBy: false,
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

const ALLOWED_CONNECT = [
  "'self'",
  'https:',
  'wss:',
  'https://mgtsystem-production.up.railway.app',
  'https://rpc.walletconnect.org',
  'https://*.walletconnect.com',
  'wss://*.walletconnect.com',
  'https://relay.walletconnect.com',
  'wss://relay.walletconnect.com',
  'https://relay.walletconnect.org',
  'wss://relay.walletconnect.org',
  'https://mainnet.base.org',
  'https://sepolia.base.org',
  'https://api.avax.network',
  'https://api.avax-test.network',
  'https://avalanche-fuji-c-chain.publicnode.com',
  'https://*.publicnode.com',
  'https://*.ankr.com',
  'https://*.llamarpc.com',
  'wss://avalanche-fuji.drpc.org',
  ...(process.env.CSP_CONNECT_EXTRA?.split(',').map(s => s.trim()).filter(Boolean) ?? []),
];

const cspDirectives = {
  defaultSrc: ["'self'"],
  baseUri: ["'self'"],
  objectSrc: ["'none'"],
  scriptSrc: ["'self'", 'https:', "'unsafe-inline'"],
  scriptSrcElem: ["'self'", 'https:', "'unsafe-inline'"],
  scriptSrcAttr: ["'none'"],
  styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
  imgSrc: ["'self'", 'data:', 'blob:', 'https:', 'https://images.walletconnect.com', 'https://static.walletconnect.com'],
  fontSrc: ["'self'", 'https:', 'data:'],
  mediaSrc: ["'self'", 'https:'],
  workerSrc: ["'self'", 'blob:'],
  manifestSrc: ["'self'"],
  frameSrc: [
    "'self'",
    'https://verify.walletconnect.com',
    'https://verify.walletconnect.org',
    'https://www.youtube.com',
    'https://www.youtube-nocookie.com',
    'https://player.vimeo.com',
  ],
  childSrc: [
    "'self'",
    'https://verify.walletconnect.com',
    'https://verify.walletconnect.org',
  ],
 frameAncestors:["*"],
  connectSrc: ALLOWED_CONNECT,
  upgradeInsecureRequests: [],
};

app.use(helmet.contentSecurityPolicy({
  directives: cspDirectives,
  reportOnly: false,
}));

/* ──────────────────────────────────────────────────────────
   301 redirects — before routes/static/SPA handlers
   ────────────────────────────────────────────────────────── */
app.use((req, res, next) => {
  const { path: p } = req;

  const redirect = (target) => {
    const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    return res.redirect(301, target + qs);
  };

  if (/^\/web3\/web3(\/.*)?$/i.test(p)) {
    const tail = p.replace(/^\/web3\/web3/i, '/web3');
    return redirect(tail);
  }

  const m1 = p.match(/^\/web3-impact-event(?:\/(.*))?$/i) || p.match(/^\/Web3-Impact-Event(?:\/(.*))?$/);
  if (m1) return redirect('/web3/impact-campaign' + (m1[1] ? '/' + m1[1] : ''));

  const m2 = p.match(/^\/impact(?:\/(.*))?$/i);
  if (m2) return redirect('/web3/impact-campaign' + (m2[1] ? '/' + m2[1] : ''));

  const m3 = p.match(/^\/web3-fundraising-quiz(?:\/(.*))?$/i);
  if (m3) return redirect('/web3' + (m3[1] ? '/' + m3[1] : ''));

  if (/^\/(uk|ireland)\/?$/i.test(p)) return redirect('/');

  next();
});

/* ──────────────────────────────────────────────────────────
   Request logging
   ────────────────────────────────────────────────────────── */
app.use((req, res, next) => {
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

/* ──────────────────────────────────────────────────────────
   API routers
   ────────────────────────────────────────────────────────── */
console.log('🛠️ Setting up routes...');
app.use('/quiz/api/community-registration', communityRegistrationApi);
app.use('/quiz/api/impactcampaign/pledge', impactCampaignPledgeApi);
app.use('/api/impact-campaign/leaderboard', impact_campaign_leaderboard);
app.use('/quiz/api', web2RoomsApi);
app.use('/', eventIntegrationsApi);
app.use('/api/payment-methods', paymentMethodsApi);
app.use('/api/quiz-reconciliation', reconciliationRoutes);
app.use('/api/quiz/tickets', ticketsRouter);
app.use('/api/quiz/web2', quizStatsRoutes);
app.use('/api', quizPaymentMethodsRoutes);
app.use('/quiz/api', createRoomApi);
app.use('/api/mgtsystem/quiz-late-payments', quizLatePayments);
app.use('/api/quiz/personalised-round', quizPersonalisedRoundRouter);
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
   Sitemap / robots
   ────────────────────────────────────────────────────────── */
app.get('/sitemap.xml', (req, res) => {
  const host = req.get('host');
  console.log(`🗺️ Serving sitemap for host: ${host}`);
  const sitemapFile =
    host?.includes('fundraisely.co.uk') ? 'sitemap-uk.xml'
    : host?.includes('fundraisely.ie')  ? 'sitemap-ie.xml'
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
  const robotsFile =
    host?.includes('fundraisely.co.uk') ? 'robots-uk.txt'
    : host?.includes('fundraisely.ie')  ? 'robots-ie.txt'
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

// Serve public static files (images, etc.)
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
    `<meta id="meta-description" name="description" content="${escapeHtml(description)}">`,
    robots ? `<meta id="meta-robots" name="robots" content="${robots}">` : '',
    keywords ? `<meta id="meta-keywords" name="keywords" content="${escapeHtml(keywords)}">` : '',
    `<meta id="og-title" property="og:title" content="${escapeHtml(title)}">`,
    `<meta id="og-description" property="og:description" content="${escapeHtml(description)}">`,
    `<meta id="og-image" property="og:image" content="${escapeHtml(image)}">`,
    `<meta id="og-type" property="og:type" content="${type}">`,
    canonical ? `<meta id="og-url" property="og:url" content="${escapeHtml(canonical)}">` : '',
    `<meta id="og-site" property="og:site_name" content="FundRaisely">`,
    `<meta id="tw-card" name="twitter:card" content="summary_large_image">`,
    `<meta id="tw-title" name="twitter:title" content="${escapeHtml(title)}">`,
    `<meta id="tw-description" name="twitter:description" content="${escapeHtml(description)}">`,
    `<meta id="tw-image" name="twitter:image" content="${escapeHtml(image)}">`,
    canonical ? `<link id="link-canonical" rel="canonical" href="${escapeHtml(canonical)}">` : '',
  ].filter(Boolean).join('\n    ');
}

/* ──────────────────────────────────────────────────────────
   Static files + SPA catch-all
   ✅ FIXED: dev catch-all is now properly inside the else block
   ────────────────────────────────────────────────────────── */
if (process.env.NODE_ENV === 'production') {

  app.use('/assets', express.static(path.join(__dirname, '../dist/assets'), {
    maxAge: '31536000000',
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.js')) res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      if (filePath.endsWith('.css')) res.setHeader('Content-Type', 'text/css; charset=utf-8');
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

  app.use(express.static(path.join(__dirname, '../dist'), {
    index: false,
    maxAge: '3600000',
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.js')) res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      if (filePath.endsWith('.css')) res.setHeader('Content-Type', 'text/css; charset=utf-8');
    }
  }));

  // ✅ Production SPA catch-all
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

  // ✅ Dev static (no implicit index, no caching)
  app.use(express.static(path.join(__dirname, '../dist'), {
    index: false,
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }));

  // ✅ Dev SPA catch-all — INSIDE else block, not floating outside
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

} // ✅ END of if/else — nothing after this except server setup

/* ──────────────────────────────────────────────────────────
   HTTP server + Socket.io
   ────────────────────────────────────────────────────────── */
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

try {
  seoRoutes(app);
} catch (error) {
  console.error('⚠️ Failed to setup SEO routes:', error.message);
}

try {
  setupSocketHandlers(io);
} catch (error) {
  console.error('⚠️ Failed to setup socket handlers:', error.message);
}

try {
  app.use('/api/contact', contactRoute);
  app.use('/api/auth/reset', passwordResetRoute);
} catch (error) {
  console.error('⚠️ Failed to setup API routes:', error.message);
}

/* ──────────────────────────────────────────────────────────
   Global error handler — must be last middleware
   ────────────────────────────────────────────────────────── */
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return next(err);
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

  if (res.headersSent) {
    console.error('[Server] ❌ Response already sent, cannot send error');
    return next(err);
  }

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
    try {
      if (!res.headersSent) {
        res.status(500);
        res.setHeader('Content-Type', 'text/plain');
        res.end('Internal server error: ' + (err?.message || 'Unknown error'));
        console.log('[Server] ✅ Plain text error response sent');
      }
    } catch (finalErr) {
      console.error('[Server] ❌❌ Cannot send any response');
    }
  }
});

/* ──────────────────────────────────────────────────────────
   Process-level error handlers
   ────────────────────────────────────────────────────────── */
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise);
  console.error('❌ Reason:', reason);
  if (reason instanceof Error) {
    console.error('❌ Error stack:', reason.stack);
  }
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.error('❌ Error stack:', error.stack);
  console.error('❌ Server will exit due to uncaught exception');
  process.exit(1);
});

/* ──────────────────────────────────────────────────────────
   Utility endpoints
   ────────────────────────────────────────────────────────── */
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/debug/rooms', (req, res) => {
  const roomStates = logAllRooms();
  res.json({ totalRooms: roomStates.length, rooms: roomStates });
});

/* ──────────────────────────────────────────────────────────
   Start server
   ────────────────────────────────────────────────────────── */
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

/* ──────────────────────────────────────────────────────────
   Database init (non-blocking, runs after server starts)
   ────────────────────────────────────────────────────────── */
(async () => {
  try {
    await initializeDatabase();
    isDatabaseReady = true;
    console.log('🗄️ Database connected and ready');
  } catch (dbError) {
    console.error('❌ Database initialization failed:', dbError?.message || dbError);
    process.exit(1);
  }
})().catch((err) => {
  console.error('❌ Database initialization threw:', err);
  process.exit(1);
});


