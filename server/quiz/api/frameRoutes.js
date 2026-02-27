router.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html');

  const miniappEmbed = JSON.stringify({
    version: "1",
    imageUrl: `${BASE_URL}/embed-image.png`,
    button: {
      title: "🎮 Join a Fundraising Quiz",
      action: {
        type: "launch_frame",
        name: "FundRaisely Quiz",
        url: `${BASE_URL}${TARGET_PATH}`,
        splashImageUrl: `${BASE_URL}/splash.png`,
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
  <meta name="fc:frame" content='${miniappEmbed}' />
  <meta property="og:title" content="FundRaisely — Web3 Fundraising Quiz" />
  <meta property="og:description" content="Play, raise, and make an impact on-chain." />
  <meta property="og:image" content="${BASE_URL}/embed-image.png" />
</head>
<body>FundRaisely Mini App</body>
</html>`);
});