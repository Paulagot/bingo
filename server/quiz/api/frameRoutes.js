import express from 'express';

const router = express.Router();

const BASE_URL = process.env.BASE_URL || 'https://fundraisely-staging.up.railway.app';
const TARGET_PATH = '/web3/impact-campaign/join';

const LOGO_B64 = '...'; // keep your existing base64 logo

// ─────────────────────────────────────────────
// GET /frame/image  — embed preview image (stays the same)
// ─────────────────────────────────────────────
router.get('/image', (req, res) => {
  // ... keep your existing /frame/image route exactly as-is
});

// ─────────────────────────────────────────────
// GET /frame  — embed metadata page
// Post THIS URL in the Base app to get a rich card
// ─────────────────────────────────────────────
router.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html');

  const miniappEmbed = JSON.stringify({
    version: "next",
    imageUrl: `${BASE_URL}/frame/image`,
    button: {
      title: "🎮 Join a Fundraising Quiz",
      action: {
        type: "launch_miniapp",
        name: "FundRaisely Quiz",
        url: `${BASE_URL}${TARGET_PATH}`,
        splashImageUrl: `${BASE_URL}/frame/image`,
        splashBackgroundColor: "#0f0f1a"
      }
    }
  });

  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>FundRaisely — Web3 Fundraising Quiz</title>
  <meta name="fc:miniapp" content='${miniappEmbed}' />
  <meta property="og:title" content="FundRaisely — Web3 Fundraising Quiz" />
  <meta property="og:description" content="Play, raise, and make an impact on-chain." />
  <meta property="og:image" content="${BASE_URL}/frame/image" />
</head>
<body>FundRaisely Mini App</body>
</html>`);
});

// No POST handler needed anymore — Base app handles the button click natively

export default router;