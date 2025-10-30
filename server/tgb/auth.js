// server/tgb/auth.js

let cachedToken = null;

function baseUrl() {
  const useSandbox = process.env.TGB_USE_SANDBOX === 'true';
  const prod = process.env.TGB_BASE_URL ?? 'https://public-api.tgbwidget.com';
  const sandbox = process.env.TGB_SANDBOX_BASE_URL ?? 'https://public-api.sandbox.thegivingblock.com';
  return useSandbox ? sandbox : prod;
}

/**
 * Returns a Bearer token to call TGB.
 * While waiting on real creds, set TGB_STATIC_BEARER in your env.
 * Later you can switch to client_credentials by setting TGB_AUTH_MODE=client_credentials
 * plus TGB_CLIENT_ID / TGB_CLIENT_SECRET (and optionally TGB_TOKEN_URL).
 */
export async function getAccessToken() {
  const staticBearer = process.env.TGB_STATIC_BEARER;
  if (staticBearer && staticBearer.trim().length > 0) {
    return staticBearer.trim();
  }

  if (cachedToken && Date.now() < cachedToken.exp - 10_000) {
    return cachedToken.token;
  }

  if (process.env.TGB_AUTH_MODE === 'client_credentials') {
    const clientId = process.env.TGB_CLIENT_ID;
    const clientSecret = process.env.TGB_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error('Missing TGB_CLIENT_ID or TGB_CLIENT_SECRET');
    }

    const tokenEndpoint =
      process.env.TGB_TOKEN_URL ?? `${baseUrl()}/v1/auth/token`; // adjust if TGB gives a different URL

    const body = new URLSearchParams();
    body.set('grant_type', 'client_credentials');
    body.set('client_id', clientId);
    body.set('client_secret', clientSecret);

    const r = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });

    const text = await r.text().catch(() => '');
    if (!r.ok) {
      throw new Error(`TGB token request failed (${r.status}): ${text || '<no-body>'}`);
    }

    const data = JSON.parse(text);
    const token = data.access_token;
    const exp = Date.now() + (data.expires_in ?? 3600) * 1000;
    cachedToken = { token, exp };
    return token;
  }

  throw new Error(
    'No TGB token available. Set TGB_STATIC_BEARER for now, or enable client credentials with TGB_AUTH_MODE=client_credentials and provide TGB_CLIENT_ID/TGB_CLIENT_SECRET.'
  );
}

export function tgbBaseUrl() {
  return baseUrl();
}

