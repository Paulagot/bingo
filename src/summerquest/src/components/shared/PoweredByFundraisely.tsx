import React from 'react';

// Summer Quest — Sponsor Attribution
// Shown on player/parent facing pages so the squad sees Fundraisely is
// behind it, without this being a public-facing ad. Not linked from
// anywhere outside the invite-only app, and the module sets
// X-Robots-Tag: noindex on its API responses — pair that with a
// <meta name="robots" content="noindex"> on these page shells if you
// want belt-and-braces.
//
// The mark below is a small inline SVG matching the FundRaisely logo
// (teal rounded-square "F", dark teal wordmark) rather than an image
// import, so it always renders crisply with zero asset-loading risk.

interface PoweredByFundraiselyProps {
  variant?: 'footer' | 'inline';
}

function FundraiselyMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <rect width="40" height="40" rx="11" fill="#1A6E6E" />
      <text
        x="20"
        y="27"
        textAnchor="middle"
        fontFamily="'Nunito', 'Inter', sans-serif"
        fontWeight="800"
        fontSize="20"
        fill="#FFFFFF"
      >
        F
      </text>
    </svg>
  );
}

export function PoweredByFundraisely({ variant = 'footer' }: PoweredByFundraiselyProps) {
  if (variant === 'inline') {
    return (
      <a
        href="https://fundraisely.ie"
        target="_blank"
        rel="noopener noreferrer"
        className="sq-powered-by-inline"
      >
        <FundraiselyMark size={16} />
        <span>Powered by <strong>FundRaisely</strong></span>
      </a>
    );
  }

  return (
    <a
      href="https://fundraisely.ie"
      target="_blank"
      rel="noopener noreferrer"
      className="sq-powered-by-footer"
    >
      <span className="sq-powered-by-label">Sponsored by</span>
      <span className="sq-powered-by-brand">
        <FundraiselyMark size={22} />
        <span className="sq-powered-by-wordmark">FundRaisely</span>
      </span>
    </a>
  );
}

export const SQ_POWERED_BY_CSS = `
.sq-powered-by-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-decoration: none;
  padding: 14px 16px;
  margin-top: 8px;
  border-top: 1px solid var(--sq-border);
}
.sq-powered-by-label { font-size: 12px; color: var(--sq-grey); }
.sq-powered-by-brand { display: flex; align-items: center; gap: 6px; }
.sq-powered-by-wordmark { font-size: 14px; font-weight: 800; color: #1A6E6E; }

.sq-powered-by-inline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  text-decoration: none;
  font-size: 12px;
  color: var(--sq-grey);
}
.sq-powered-by-inline strong { color: #1A6E6E; font-weight: 800; }
`;
