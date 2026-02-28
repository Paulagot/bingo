import express from 'express';

const router = express.Router();

const BASE_URL = process.env.BASE_URL || 'https://fundraisely-staging.up.railway.app';
const TARGET_PATH = '/web3/impact-campaign/join';

// ─────────────────────────────────────────────
// GET /frame/image  — rendered HTML banner (legacy/fallback)
// ─────────────────────────────────────────────
router.get('/image', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Cache-Control', 'public, max-age=3600');

  res.send(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1910px; height: 1000px; overflow: hidden;
    background: #0f0f1a;
    font-family: 'Segoe UI', system-ui, sans-serif;
    display: flex; align-items: center; justify-content: center;
    position: relative;
  }
  .blob1 {
    position: absolute; width: 700px; height: 700px; border-radius: 50%;
    background: radial-gradient(circle, rgba(99,60,230,0.35) 0%, transparent 70%);
    top: -150px; left: -100px; pointer-events: none;
  }
  .blob2 {
    position: absolute; width: 600px; height: 600px; border-radius: 50%;
    background: radial-gradient(circle, rgba(56,189,248,0.2) 0%, transparent 70%);
    bottom: -100px; right: 200px; pointer-events: none;
  }
  .card {
    position: relative; z-index: 2; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 36px;
    text-align: center; padding: 60px 120px;
  }
  .tagline { font-size: 64px; font-weight: 800; color: #ffffff; line-height: 1.15; letter-spacing: -1px; }
  .tagline span { background: linear-gradient(90deg, #7c5cf6, #38bdf8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .sub { font-size: 32px; color: rgba(255,255,255,0.65); max-width: 1100px; line-height: 1.5; }
  .badge {
    display: inline-flex; align-items: center; gap: 10px;
    background: rgba(99,60,230,0.25); border: 1px solid rgba(99,60,230,0.5);
    border-radius: 50px; padding: 12px 32px; font-size: 26px; color: #a78bfa; font-weight: 600;
  }
  .badge-dot { width: 12px; height: 12px; border-radius: 50%; background: #7c5cf6; animation: pulse 1.8s ease-in-out infinite; }
  @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.85); } }
</style>
</head>
<body>
  <div class="blob1"></div>
  <div class="blob2"></div>
  <div class="card">
    <div class="tagline">Play. Raise. <span>Impact.</span></div>
    <div class="sub">Join a Web3 fundraising quiz — support real causes on-chain, compete with your community, and make every answer count.</div>
    <div class="badge"><div class="badge-dot"></div>Live on Base &amp; Avalanche</div>
  </div>
</body>
</html>`);
});

// ─────────────────────────────────────────────
// GET /frame  — Mini App embed metadata page
// Post THIS URL in the Base app to get a rich card
// ─────────────────────────────────────────────
router.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html');

  const miniappEmbed = JSON.stringify({
    version: '1',
    imageUrl: `${BASE_URL}/embed-image.png`,
    button: {
      title: '🎮 Join a Fundraising Quiz',
      action: {
        type: 'launch_frame',
        name: 'FundRaisely Quiz',
        url: `${BASE_URL}${TARGET_PATH}`,
        splashImageUrl: `${BASE_URL}/splash.png`,
        splashBackgroundColor: '#0f0f1a'
      }
    }
  });

  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="base:app_id" content="69a1865e991116aebf36caae" />
  <title>FundRaisely — Web3 Fundraising Quiz</title>
  <meta name="fc:miniapp" content='${miniappEmbed}' />
  <meta name="fc:frame" content='${miniappEmbed}' />
  <meta property="og:title" content="FundRaisely — Web3 Fundraising Quiz" />
  <meta property="og:description" content="Play, raise, and make an impact on-chain." />
  <meta property="og:image" content="${BASE_URL}/embed-image.png" />
</head>
<body>FundRaisely Mini App</body>
</html>`);
});

export default router;