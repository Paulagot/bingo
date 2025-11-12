// server/tgb/auth.js
import fs from 'node:fs';
import path from 'node:path';

const REFRESH_STORE = path.join(process.cwd(), 'data', 'tgb_refresh.json');

function baseUrl() {
  const useSandbox = process.env.TGB_USE_SANDBOX === 'true';
  const prod = process.env.TGB_BASE_URL ?? 'https://public-api.tgbwidget.com';
  const sandbox = process.env.TGB_SANDBOX_BASE_URL ?? 'https://public-api.sandbox.thegivingblock.com';
  return useSandbox ? sandbox : prod;
}

// --- token cache structure ---
// cachedToken = { token: 'Bearer ...', exp: <ms since epoch>, refreshToken?: 'rt_xxx' }
let cachedToken = null;

/** persist refresh token to disk (optional) */
function loadRefreshFromDisk() {
  try {
    if (!fs.existsSync(REFRESH_STORE)) return null;
    const raw = fs.readFileSync(REFRESH_STORE, 'utf8');
    if (!raw) return null;
    const j = JSON.parse(raw);
    return j?.refresh_token ?? j?.refreshToken ?? null;
  } catch (e) {
    console.warn('Unable to read TGB refresh store:', e?.message || e);
    return null;
  }
}
function saveRefreshToDisk(refreshToken) {
  try {
    const dir = path.dirname(REFRESH_STORE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(REFRESH_STORE, JSON.stringify({ refresh_token: refreshToken }), 'utf8');
  } catch (e) {
    console.warn('Unable to persist TGB refresh token:', e?.message || e);
  }
}

/** Local dev fallback: read /tmp/tgb_login.json if available and extract a token */
function readLoginJsonFallback() {
  try {
    const tmp = '/tmp/tgb_login.json';
    if (!fs.existsSync(tmp)) return null;
    const raw = fs.readFileSync(tmp, 'utf8');
    if (!raw) return null;
    const obj = JSON.parse(raw);

    // common shapes observed in sandbox login responses
    const tokenCandidates = [
      obj?.data?.accessToken,
      obj?.data?.access_token,
      obj?.accessToken,
      obj?.access_token,
      obj?.token,
      obj?.data?.token,
      obj?.data?.data?.accessToken,
      obj?.data?.data?.access_token
    ];
    const token = tokenCandidates.find(t => t && typeof t === 'string') ?? '';

    if (!token) return null;
    const normalized = String(token).trim();
    return normalized.toLowerCase().startsWith('bearer ') ? normalized : `Bearer ${normalized}`;
  } catch (e) {
    console.warn('Error reading /tmp/tgb_login.json fallback:', e?.message || e);
    return null;
  }
}

/**
 * Returns a Bearer token to call TGB.
 * Modes:
 *  - TGB_STATIC_BEARER (set to a raw token or "Bearer <token>") -> used directly
 *  - TGB_AUTH_MODE=client_credentials -> uses client_id/client_secret to exchange at /v1/auth/token
 *  - TGB_AUTH_MODE=password -> uses username/password at /v1/login and refresh tokens at /v1/refresh-tokens
 * Falls back to /tmp/tgb_login.json for local dev convenience if no other mode is configured.
 */
export async function getAccessToken() {
  // 1) static bearer in env (dev convenience)
  const staticBearer = process.env.TGB_STATIC_BEARER;
  if (staticBearer && staticBearer.trim().length > 0) {
    const s = staticBearer.trim();
    return s.toLowerCase().startsWith('bearer ') ? s : `Bearer ${s}`;
  }

  // 2) quick return if cached and not expiring soon
  if (cachedToken && Date.now() < (cachedToken.exp || 0) - 10_000) {
    return cachedToken.token;
  }

  // 3) choose auth mode
  const mode = (process.env.TGB_AUTH_MODE || '').trim();

  // ---------- client_credentials flow ----------
  if (mode === 'client_credentials') {
    const clientId = process.env.TGB_CLIENT_ID;
    const clientSecret = process.env.TGB_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error('Missing TGB_CLIENT_ID or TGB_CLIENT_SECRET for client_credentials flow');
    }

    const tokenEndpoint = process.env.TGB_TOKEN_URL ?? `${baseUrl()}/v1/auth/token`;

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
    const token = data.access_token || data.accessToken || data.token;
    const expiresIn = data.expires_in ?? data.expiresIn ?? 3600;
    if (!token) throw new Error('TGB client_credentials flow succeeded but no token found in response');
    const exp = Date.now() + (expiresIn * 1000);
    cachedToken = { token: token.startsWith('Bearer ') ? token : `Bearer ${token}`, exp };
    return cachedToken.token;
  }

  // ---------- password (username/password) flow ----------
  if (mode === 'password') {
    // Attempt: if we have a cached refresh token, use it first to refresh
    const persistedRefresh = loadRefreshFromDisk();
    // prefer persisted refresh if no cachedToken or cachedToken expired
    if (persistedRefresh && !(cachedToken && Date.now() < (cachedToken.exp || 0) - 10_000)) {
      try {
        const refreshUrl = `${baseUrl()}/v1/refresh-tokens`;
        const resp = await fetch(refreshUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: persistedRefresh })
        });
        const text = await resp.text().catch(() => '');
        if (resp.ok) {
          const json = JSON.parse(text);
          // Accept snake_case or camelCase shapes from sandbox
          const access = json.access_token || json.accessToken || json.token || json?.data?.access_token || json?.data?.accessToken;
          const refresh = json.refresh_token || json.refreshToken || persistedRefresh;
          const expiresIn = json.expires_in ?? json.expiresIn ?? 3600;
          const tokenVal = access.startsWith('Bearer ') ? access : `Bearer ${access}`;
          const exp = Date.now() + (expiresIn * 1000);
          cachedToken = { token: tokenVal, exp, refreshToken: refresh };
          // persist refresh token if provided
          if (refresh) saveRefreshToDisk(refresh);
          return cachedToken.token;
        } else {
          // fallthrough to username/password exchange
          console.warn('TGB refresh-token attempt failed; will try login flow', { status: resp.status, body: text });
        }
      } catch (e) {
        console.warn('TGB refresh attempt error; falling back to login flow', e?.message || e);
      }
    }

    // If we reach here, either no persisted refresh or refresh failed -> do login with credentials
    // TGB expects the field "login" in the POST body (sandbox docs)
    const login = process.env.TGB_USERNAME;
    const password = process.env.TGB_PASSWORD;
    if (!login || !password) {
      throw new Error('TGB login/password not configured (set TGB_USERNAME and TGB_PASSWORD) for password auth mode');
    }

    const loginUrl = `${baseUrl()}/v1/login`;
    const r = await fetch(loginUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, password })
    });

    const text = await r.text().catch(() => '');
    if (!r.ok) {
      throw new Error(`TGB login request failed (${r.status}): ${text || '<no-body>'}`);
    }

    const data = JSON.parse(text);

    // Try common response shapes: snake_case, camelCase, token, or nested data
    const access = data.access_token || data.accessToken || data.token || data?.data?.access_token || data?.data?.accessToken;
    const refresh = data.refresh_token || data.refreshToken || data?.data?.refresh_token || data?.data?.refreshToken || null;
    const expiresIn = data.expires_in ?? data.expiresIn ?? data?.data?.expires_in ?? 3600;

    if (!access) {
      throw new Error('TGB login succeeded but no access token found in response');
    }

    const tokenVal = access.startsWith('Bearer ') ? access : `Bearer ${access}`;
    const exp = Date.now() + (expiresIn * 1000);
    cachedToken = { token: tokenVal, exp, refreshToken: refresh ?? undefined };

    // Persist refresh token if available
    if (refresh) {
      try { saveRefreshToDisk(refresh); } catch (e) { console.warn('Failed to persist refresh token', e?.message || e); }
    }

    return cachedToken.token;
  }

  // Quick dev convenience: support TGB_STATIC_BEARER env (again as fallback)
  if (staticBearer && staticBearer.trim()) {
    const s = staticBearer.trim();
    return s.toLowerCase().startsWith('bearer ') ? s : `Bearer ${s}`;
  }

  // Dev fallback: read /tmp/tgb_login.json for local sessions (convenience)
  const tmpToken = readLoginJsonFallback();
  if (tmpToken) {
    console.warn('Using fallback token from /tmp/tgb_login.json');
    return tmpToken;
  }

  // If no known auth mode provided:
  throw new Error('No TGB token available. Set TGB_STATIC_BEARER for now, enable client credentials (TGB_AUTH_MODE=client_credentials & TGB_CLIENT_ID/TGB_CLIENT_SECRET), or enable password auth (TGB_AUTH_MODE=password and set TGB_USERNAME/TGB_PASSWORD).');
}

export function tgbBaseUrl() {
  return baseUrl();
}



