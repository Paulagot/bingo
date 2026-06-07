import { Link, NavLink, useNavigate } from 'react-router-dom';
import { navGroups } from '../../config/siteNavigation';
import { MobileNav } from './MobileNav';
import { siteBrand, socialLinks } from '../../config/siteBrand';
import { useAuth } from '@/features/auth';


function SocialIcon({ label }: { label: string }) {
  if (label.includes('LinkedIn')) return <>in</>;
  if (label.includes('Instagram')) return <>◎</>;
  return <>X</>;
}

export function SiteHeader() {
    const navigate = useNavigate();
  const { isAuthenticated,  logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };
  return (
    <header className="site-header" aria-label="Main site header">
      <div className="site-header__inner site-shell">
        <Link to="/" className="brand" aria-label="FundRaisely home">
          {siteBrand.logoSrc ? (
            <img className="brand__logo" src={siteBrand.logoSrc} alt={siteBrand.logoAlt} />
          ) : (
            <>
              <span className="brand__mark" aria-hidden="true">F</span>
              <span className="brand__text">{siteBrand.name}</span>
            </>
          )}
        </Link>

        <nav className="desktop-nav" aria-label="Primary navigation">
          {navGroups.map((group) => (
            <div className="desktop-nav__group" key={group.label}>
              <button className="desktop-nav__button" type="button">{group.label}</button>
              <div className="desktop-nav__dropdown">
                {group.items.map((item) => (
                  <NavLink key={item.to} to={item.to} className="desktop-nav__link">
                    <span>{item.label}</span>
                    {item.description && <small>{item.description}</small>}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
          <NavLink to="/pricing" className="desktop-nav__plain">Pricing</NavLink>
        </nav>

        <div className="site-header__actions">
          <div className="site-header__socials" aria-label="FundRaisely social links">
            {socialLinks.map((link) => (
              <a key={link.label} href={link.href} target="_blank" rel="noreferrer" aria-label={link.label} className="social-icon">
                <SocialIcon label={link.label} />
              </a>
            ))}
          </div>
       {isAuthenticated ? (
  <>
    <Link
      to="/quiz/eventdashboard"
      className="button button--small button--ghost-dark"
    >
      Dashboard
    </Link>
{/* 
    <span className="site-header__user">
      Hi, {club?.name ?? user?.name ?? user?.email}
    </span> */}

    <button
      type="button"
      onClick={handleLogout}
      className="button button--small button--ghost-dark"
    >
      Log out
    </button>
  </>
) : (
  <a href={siteBrand.loginUrl} className="button button--small button--ghost-dark">
    Login
  </a>
)}

{/* <Link to="/demo" className="button button--small button--outline-dark">Demo</Link> */}
<MobileNav />
        </div>
      </div>
    </header>
  );
}
