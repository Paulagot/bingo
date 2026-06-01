import { Link } from 'react-router-dom';
import { footerGroups } from '../../config/siteNavigation';
import { getMarketConfig } from '../../config/marketConfig';
import { siteBrand, socialLinks } from '../../config/siteBrand';

function SocialIcon({ label }: { label: string }) {
  if (label.includes('LinkedIn')) return <>in</>;
  if (label.includes('Instagram')) return <>◎</>;
  return <>X</>;
}

export function SiteFooter() {
  const market = getMarketConfig();
  return (
    <footer className="site-footer">
      <div className="site-shell site-footer__inner">
        <div className="site-footer__brand">
          <Link to="/" className="brand brand--footer">
            {siteBrand.logoSrc ? (
              <img className="brand__logo" src={siteBrand.logoSrc} alt={siteBrand.logoAlt} />
            ) : (
              <>
                <span className="brand__mark" aria-hidden="true">F</span>
                <span className="brand__text">FundRaisely</span>
              </>
            )}
          </Link>
          <p>Campaigns, events, ready-to-run fundraising formats, payment tracking and reports for clubs, schools, charities and community groups.</p>
          <div className="site-footer__socials" aria-label="FundRaisely social links">
            {socialLinks.map((link) => (
              <a key={link.label} href={link.href} target="_blank" rel="noreferrer" aria-label={link.label} className="social-icon social-icon--footer">
                <SocialIcon label={link.label} />
              </a>
            ))}
          </div>
          <p className="site-footer__market">Market: {market.countryName} · {market.currencyCode}</p>
        </div>
        <div className="site-footer__links">
          {footerGroups.map((group) => (
            <div key={group.label}>
              <h2>{group.label}</h2>
              {group.items.map((item) => (
                <Link key={`${group.label}-${item.to}`} to={item.to}>{item.label}</Link>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="site-shell site-footer__bottom">
        <span>© {new Date().getFullYear()} FundRaisely. All rights reserved.</span>
        <span>Built for ready-to-run fundraisers, real-world payments and clearer records.</span>
      </div>
    </footer>
  );
}
