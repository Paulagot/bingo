// src/utils/deviceDetection.ts
//
// Used to decide, for crypto payments only, whether it's safe to render
// the wallet-connect flow IN-PAGE (inside a modal or iframe) versus
// sending the person to a real top-level browser tab.
//
// Why this matters specifically for crypto: on desktop, wallet
// connection is either a browser extension (no navigation at all) or a
// QR code scanned by a SEPARATE device (the desktop tab never leaves,
// so nesting doesn't matter). On mobile, tapping a wallet in AppKit's
// list typically triggers an app-switch - browser -> wallet app ->
// back to browser - and that return has to land on the exact page that
// initiated it. If that page was nested inside an iframe, the deep
// link's return is unverified and may not find its way back correctly
// (confirmed as an open, untested risk - see CryptoDonationCheckoutPage.tsx
// and the ticket-embed crypto discussion). This is ALSO a real risk for
// in-app browsers (Instagram/Facebook/TikTok's built-in browser),
// hence checking broadly rather than just a strict phone/tablet regex.
//
// Deliberately conservative: this is only ever used to decide whether
// to skip the safe path, never to justify skipping a check. Any
// ambiguous or unrecognized user agent should fall through to the
// existing, already-proven new-tab flow.
export function isMobileOrTablet(): boolean {
  if (typeof navigator === 'undefined') return true; // no navigator at all - fail safe
  return /Android|iPhone|iPad|iPod|Mobile|Tablet|Silk|Kindle/i.test(navigator.userAgent);
}