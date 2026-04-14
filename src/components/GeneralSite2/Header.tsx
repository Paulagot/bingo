// src/components/GeneralSite/Header.tsx
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Gamepad2, Menu, X, ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth';

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileQuizOpen, setMobileQuizOpen] = useState(false);
  const [mobilePricingOpen, setMobilePricingOpen] = useState(false);
  const [mobileCampaignsOpen, setMobileCampaignsOpen] = useState(false);
  const [mobileWeb3Open, setMobileWeb3Open] = useState(false);

  const { isAuthenticated, user, club, logout } = useAuth();

  const normalizedPath = location.pathname.replace(/\/+$/, '').toLowerCase();
  const isCurrent = (path: string) =>
    normalizedPath === path.replace(/\/+$/, '').toLowerCase();
  const hideIfCurrent = (path: string) => !isCurrent(path);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  useEffect(() => {
    setMobileMenuOpen(false);
    setMobileQuizOpen(false);
    setMobilePricingOpen(false);
    setMobileCampaignsOpen(false);
    setMobileWeb3Open(false);
  }, [location.pathname]);

  const ROUTES = {
    // Campaigns
    clubsLeague: '/campaigns/clubs-league',

    // Web3 Fundraising
    web3Marketplace: '/web3',
    web3Host: '/web3/host',
    web3Causes: '/web3/causes',
    web3Quiz: '/web3/quiz',
    web3Elimination: '/web3/elimination',
    web3Features: '/web3/features',
    web3Partners: '/web3/partners',
    web3Testimonials: '/web3/testimonials',

    pricing: '/pricing',
    foundingPartner: '/founding-partners',
    blog: '/blog',
    login: '/auth',
    freeTrial: '/free-trial',

    // Quiz Fundraisers
    howItWorks: '/quiz/how-it-works',
    features: '/quiz/features',
    useCases: '/quiz/use-cases',
    demo: '/quiz/demo',
    testimonials: '/testimonials',

    // App
    createQuiz: '/quiz/create-fundraising-quiz',
    eventDashboard: '/quiz/eventdashboard',
  };

  const onFreeTrial = isCurrent(ROUTES.freeTrial);

  const desktopLinkClass =
    'text-sm font-medium text-indigo-700 transition-colors hover:text-indigo-900';

  const dropdownItemClass =
    'block px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 break-words';

  const mobileTopButtonClass =
    'flex w-full min-w-0 items-center justify-between rounded-md px-2 py-2 text-left text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-50';

  const mobileSubLinkClass =
    'block rounded-md px-2 py-2 text-sm text-indigo-700 transition-colors hover:bg-indigo-50 break-words';

  return (
    <header className="fixed inset-x-0 top-0 z-50 overflow-x-clip border-b border-gray-100 bg-white/90 shadow-sm backdrop-blur-sm">
      <div className="mx-auto flex h-16 w-full max-w-screen-xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="min-w-0 flex-1 md:flex-none">
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <Gamepad2 className="h-5 w-5 shrink-0 text-indigo-600 sm:h-6 sm:w-6" />
            <h1 className="truncate bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-lg font-bold text-transparent sm:text-xl">
              FundRaisely
            </h1>
          </Link>
        </div>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex">
          {/* Quiz Fundraisers */}
          <div className="group relative">
            <button
              className="flex items-center gap-1 text-sm font-medium text-indigo-700 hover:text-indigo-900"
              aria-haspopup="true"
              aria-expanded="false"
              type="button"
            >
              Quiz Fundraisers
              <ChevronDown className="h-4 w-4" />
            </button>

            <div className="invisible absolute left-0 top-full w-64 rounded-lg border border-gray-100 bg-white py-2 opacity-0 shadow-lg transition-all duration-150 group-hover:visible group-hover:opacity-100">
              {hideIfCurrent(ROUTES.howItWorks) && (
                <Link to={ROUTES.howItWorks} className={dropdownItemClass}>
                  How it Works
                </Link>
              )}
              {hideIfCurrent(ROUTES.features) && (
                <Link to={ROUTES.features} className={dropdownItemClass}>
                  Features
                </Link>
              )}
              {hideIfCurrent(ROUTES.useCases) && (
                <Link to={ROUTES.useCases} className={dropdownItemClass}>
                  Use Cases (Schools, Clubs, Charities)
                </Link>
              )}
              {hideIfCurrent(ROUTES.demo) && (
                <Link to={ROUTES.demo} className={dropdownItemClass}>
                  Demo
                </Link>
              )}
              {hideIfCurrent(ROUTES.testimonials) && (
                <Link to={ROUTES.testimonials} className={dropdownItemClass}>
                  Testimonials
                </Link>
              )}
            </div>
          </div>

          {/* Pricing */}
          <div className="group relative">
            <button
              className="flex items-center gap-1 text-sm font-medium text-indigo-700 hover:text-indigo-900"
              aria-haspopup="true"
              aria-expanded="false"
              type="button"
            >
              Pricing
              <ChevronDown className="h-4 w-4" />
            </button>

            <div className="invisible absolute left-0 top-full w-64 rounded-lg border border-gray-100 bg-white py-2 opacity-0 shadow-lg transition-all duration-150 group-hover:visible group-hover:opacity-100">
              {hideIfCurrent(ROUTES.foundingPartner) && (
                <Link to={ROUTES.foundingPartner} className={dropdownItemClass}>
                  Founding Partners
                </Link>
              )}
              {hideIfCurrent(ROUTES.pricing) && (
                <Link to={ROUTES.pricing} className={dropdownItemClass}>
                  Pricing
                </Link>
              )}
            </div>
          </div>

          {/* Campaigns */}
          <div className="group relative">
            <button
              className="flex items-center gap-1 text-sm font-medium text-indigo-700 hover:text-indigo-900"
              aria-haspopup="true"
              aria-expanded="false"
              type="button"
            >
              Campaigns
              <ChevronDown className="h-4 w-4" />
            </button>

            <div className="invisible absolute left-0 top-full w-72 rounded-lg border border-gray-100 bg-white py-2 opacity-0 shadow-lg transition-all duration-150 group-hover:visible group-hover:opacity-100">
              {hideIfCurrent(ROUTES.clubsLeague) && (
                <Link to={ROUTES.clubsLeague} className={dropdownItemClass}>
                  Junior Clubs Fundraising Quiz League
                </Link>
              )}
            </div>
          </div>

          {/* Blog */}
          {hideIfCurrent(ROUTES.blog) && (
            <Link to={ROUTES.blog} className={desktopLinkClass}>
              Blog
            </Link>
          )}

          {/* Login */}
          {!isAuthenticated && hideIfCurrent(ROUTES.login) && (
            <Link to={ROUTES.login} className={desktopLinkClass}>
              Login
            </Link>
          )}

          {/* Web3 Fundraising */}
          <div className="group relative">
            <button
              className="flex items-center gap-1 text-sm font-medium text-indigo-700 hover:text-indigo-900"
              aria-haspopup="true"
              aria-expanded="false"
              type="button"
            >
              Web3 Fundraising
              <ChevronDown className="h-4 w-4" />
            </button>

            <div className="invisible absolute left-0 top-full w-72 rounded-lg border border-gray-100 bg-white py-2 opacity-0 shadow-lg transition-all duration-150 group-hover:visible group-hover:opacity-100">
              {hideIfCurrent(ROUTES.web3Marketplace) && (
                <Link to={ROUTES.web3Marketplace} className={dropdownItemClass}>
                  Web3 Fundraising Marketplace
                </Link>
              )}
              {hideIfCurrent(ROUTES.web3Host) && (
                <Link to={ROUTES.web3Host} className={dropdownItemClass}>
                  Host on FundRaisely
                </Link>
              )}
              {hideIfCurrent(ROUTES.web3Causes) && (
                <Link to={ROUTES.web3Causes} className={dropdownItemClass}>
                  Causes
                </Link>
              )}
              {hideIfCurrent(ROUTES.web3Quiz) && (
                <Link to={ROUTES.web3Quiz} className={dropdownItemClass}>
                  Web3 Quiz
                </Link>
              )}
              {hideIfCurrent(ROUTES.web3Elimination) && (
                <Link to={ROUTES.web3Elimination} className={dropdownItemClass}>
                  Web3 Elimination
                </Link>
              )}
              {hideIfCurrent(ROUTES.web3Features) && (
                <Link to={ROUTES.web3Features} className={dropdownItemClass}>
                  Crypto-Powered Features
                </Link>
              )}
              {hideIfCurrent(ROUTES.web3Partners) && (
                <Link to={ROUTES.web3Partners} className={dropdownItemClass}>
                  Web3 Fundraising Partners
                </Link>
              )}
              {hideIfCurrent(ROUTES.web3Testimonials) && (
                <Link to={ROUTES.web3Testimonials} className={dropdownItemClass}>
                  Crypto Fundraising Testimonials
                </Link>
              )}
            </div>
          </div>

          {/* Auth-dependent action */}
          {isAuthenticated ? (
            <Link
              to={ROUTES.eventDashboard}
              className="text-sm font-semibold text-indigo-700 hover:text-indigo-900"
            >
              Quiz Dashboard
            </Link>
          ) : (
            !onFreeTrial && (
              <Link
                to={ROUTES.freeTrial}
                className="rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-purple-700 hover:to-indigo-700"
              >
                Free Trial
              </Link>
            )
          )}

          {/* Greeting + Logout */}
          {isAuthenticated && (
            <>
              <span className="max-w-[220px] truncate text-sm text-gray-500">
                Hi, {club?.name ?? user?.name ?? user?.email}
              </span>
              <button
                onClick={handleLogout}
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
                type="button"
              >
                Log out
              </button>
            </>
          )}
        </nav>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileMenuOpen((v) => !v)}
          className="ml-3 shrink-0 p-2 text-gray-700 transition-colors hover:text-indigo-600 md:hidden"
          aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-menu"
          type="button"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div
          id="mobile-menu"
          role="navigation"
          aria-label="Mobile navigation"
          className="border-t border-gray-100 bg-white/95 shadow-lg backdrop-blur-sm md:hidden"
        >
          <div className="mx-auto w-full max-w-screen-xl space-y-2 overflow-x-hidden px-4 py-4 sm:px-6">
            {/* Quiz Fundraisers */}
            <button
              onClick={() => setMobileQuizOpen((v) => !v)}
              className={mobileTopButtonClass}
              aria-expanded={mobileQuizOpen}
              type="button"
            >
              <span className="min-w-0 pr-3">Quiz Fundraisers</span>
              <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${mobileQuizOpen ? 'rotate-180' : ''}`} />
            </button>

            {mobileQuizOpen && (
              <div className="ml-2 flex min-w-0 flex-col">
                {hideIfCurrent(ROUTES.howItWorks) && (
                  <Link to={ROUTES.howItWorks} className={mobileSubLinkClass}>
                    How it Works
                  </Link>
                )}
                {hideIfCurrent(ROUTES.features) && (
                  <Link to={ROUTES.features} className={mobileSubLinkClass}>
                    Features
                  </Link>
                )}
                {hideIfCurrent(ROUTES.useCases) && (
                  <Link to={ROUTES.useCases} className={mobileSubLinkClass}>
                    Use Cases (Schools, Clubs, Charities)
                  </Link>
                )}
                {hideIfCurrent(ROUTES.demo) && (
                  <Link to={ROUTES.demo} className={mobileSubLinkClass}>
                    Demo
                  </Link>
                )}
                {hideIfCurrent(ROUTES.testimonials) && (
                  <Link to={ROUTES.testimonials} className={mobileSubLinkClass}>
                    Testimonials
                  </Link>
                )}
              </div>
            )}

            {/* Web3 Fundraising */}
            <button
              onClick={() => setMobileWeb3Open((v) => !v)}
              className={mobileTopButtonClass}
              aria-expanded={mobileWeb3Open}
              type="button"
            >
              <span className="min-w-0 pr-3">Web3 Fundraising</span>
              <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${mobileWeb3Open ? 'rotate-180' : ''}`} />
            </button>

            {mobileWeb3Open && (
              <div className="ml-2 flex min-w-0 flex-col">
                {hideIfCurrent(ROUTES.web3Marketplace) && (
                  <Link to={ROUTES.web3Marketplace} className={mobileSubLinkClass}>
                    Web3 Fundraising Marketplace
                  </Link>
                )}
                {hideIfCurrent(ROUTES.web3Host) && (
                  <Link to={ROUTES.web3Host} className={mobileSubLinkClass}>
                    Host on FundRaisely
                  </Link>
                )}
                {hideIfCurrent(ROUTES.web3Causes) && (
                  <Link to={ROUTES.web3Causes} className={mobileSubLinkClass}>
                    Causes
                  </Link>
                )}
                {hideIfCurrent(ROUTES.web3Quiz) && (
                  <Link to={ROUTES.web3Quiz} className={mobileSubLinkClass}>
                    Web3 Quiz
                  </Link>
                )}
                {hideIfCurrent(ROUTES.web3Elimination) && (
                  <Link to={ROUTES.web3Elimination} className={mobileSubLinkClass}>
                    Web3 Elimination
                  </Link>
                )}
                {hideIfCurrent(ROUTES.web3Features) && (
                  <Link to={ROUTES.web3Features} className={mobileSubLinkClass}>
                    Crypto-Powered Features
                  </Link>
                )}
                {hideIfCurrent(ROUTES.web3Partners) && (
                  <Link to={ROUTES.web3Partners} className={mobileSubLinkClass}>
                    Web3 Fundraising Partners
                  </Link>
                )}
                {hideIfCurrent(ROUTES.web3Testimonials) && (
                  <Link to={ROUTES.web3Testimonials} className={mobileSubLinkClass}>
                    Crypto Fundraising Testimonials
                  </Link>
                )}
              </div>
            )}

            {/* Pricing */}
            <button
              onClick={() => setMobilePricingOpen((v) => !v)}
              className={mobileTopButtonClass}
              aria-expanded={mobilePricingOpen}
              type="button"
            >
              <span className="min-w-0 pr-3">Pricing</span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 transition-transform ${mobilePricingOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {mobilePricingOpen && (
              <div className="ml-2 flex min-w-0 flex-col">
                {hideIfCurrent(ROUTES.foundingPartner) && (
                  <Link to={ROUTES.foundingPartner} className={mobileSubLinkClass}>
                    Founding Partners
                  </Link>
                )}
                {hideIfCurrent(ROUTES.pricing) && (
                  <Link to={ROUTES.pricing} className={mobileSubLinkClass}>
                    Pricing
                  </Link>
                )}
              </div>
            )}

            {/* Campaigns */}
            <button
              onClick={() => setMobileCampaignsOpen((v) => !v)}
              className={mobileTopButtonClass}
              aria-expanded={mobileCampaignsOpen}
              type="button"
            >
              <span className="min-w-0 pr-3">Campaigns</span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 transition-transform ${mobileCampaignsOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {mobileCampaignsOpen && (
              <div className="ml-2 flex min-w-0 flex-col">
                {hideIfCurrent(ROUTES.clubsLeague) && (
                  <Link to={ROUTES.clubsLeague} className={mobileSubLinkClass}>
                    Junior Clubs Fundraising Quiz League
                  </Link>
                )}
              </div>
            )}

            {/* Blog */}
            {hideIfCurrent(ROUTES.blog) && (
              <Link to={ROUTES.blog} className="block rounded-md px-2 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50">
                Blog
              </Link>
            )}

            {/* Login */}
            {!isAuthenticated && hideIfCurrent(ROUTES.login) && (
              <Link to={ROUTES.login} className="block rounded-md px-2 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50">
                Login
              </Link>
            )}

            {/* Actions */}
            {isAuthenticated ? (
              <>
                <Link
                  to={ROUTES.eventDashboard}
                  className="block rounded-md px-2 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
                >
                  Quiz Dashboard
                </Link>

                <button
                  onClick={handleLogout}
                  className="mt-2 w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-left text-sm font-medium text-red-700 hover:bg-red-100"
                  type="button"
                >
                  Log out
                </button>
              </>
            ) : (
              !onFreeTrial && (
                <Link
                  to={ROUTES.freeTrial}
                  className="mt-1 block rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-center text-sm font-semibold text-white shadow-sm transition hover:from-purple-700 hover:to-indigo-700"
                >
                  Free Trial
                </Link>
              )
            )}
          </div>
        </div>
      )}
    </header>
  );
}











