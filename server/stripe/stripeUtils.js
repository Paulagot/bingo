//server/stripe/stripeUtils.js
const ALLOWED_APP_ORIGINS = new Set([
  'http://localhost:5173',
  'http://localhost:5174',
  'https://fundraisely.ie',
  'https://www.fundraisely.ie',
  'https://fundraisely.co.uk',
  'https://www.fundraisely.co.uk',
 'https://fundraisely-staging.up.railway.app',
  'http://fundraisely-staging.up.railway.app'
]);

export const getBaseUrl = (req) => {
  const candidate =
    req.headers['x-app-origin'] ||
    req.body?.appOrigin ||
    '';

  if (ALLOWED_APP_ORIGINS.has(candidate)) {
    return candidate;
  }

  // Fallback (works in production)
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers.host;
  return `${proto}://${host}`;
};