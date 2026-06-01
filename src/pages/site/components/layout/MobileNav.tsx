import { useState } from 'react';
import { Link } from 'react-router-dom';
import { navGroups } from '../../config/siteNavigation';
import { siteBrand, socialLinks } from '../../config/siteBrand';

function SocialIcon({ label }: { label: string }) {
  if (label.includes('LinkedIn')) return <>in</>;
  if (label.includes('Instagram')) return <>◎</>;
  return <>X</>;
}

export function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mobile-nav">
      <button className="mobile-nav__toggle" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="mobile-nav-panel">
        Menu
      </button>
      {open && (
        <div className="mobile-nav__panel" id="mobile-nav-panel">
          {navGroups.map((group) => (
            <div className="mobile-nav__group" key={group.label}>
              <p>{group.label}</p>
              {group.items.map((item) => (
                <Link key={item.to} to={item.to} onClick={() => setOpen(false)}>{item.label}</Link>
              ))}
            </div>
          ))}
          <Link to="/pricing" onClick={() => setOpen(false)}>Pricing</Link>
          <a href={siteBrand.loginUrl} onClick={() => setOpen(false)}>Login</a>
          <Link to="/demo" className="button button--primary-dark" onClick={() => setOpen(false)}>Book a demo</Link>
          <div className="mobile-nav__socials" aria-label="FundRaisely social links">
            {socialLinks.map((link) => (
              <a key={link.label} href={link.href} target="_blank" rel="noreferrer" aria-label={link.label} className="social-icon">
                <SocialIcon label={link.label} />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
