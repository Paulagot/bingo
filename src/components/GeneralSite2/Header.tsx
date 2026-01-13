// src/components/GeneralSite/Header.tsx
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Gamepad2, Menu, X, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/features/auth';

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileQuizOpen, setMobileQuizOpen] = useState(false);
  const [mobilePricingOpen, setMobilePricingOpen] = useState(false);
  const [mobileCampaignsOpen, setMobileCampaignsOpen] = useState(false);

  const { isAuthenticated, user, club, logout } = useAuth();

  // Normalize for consistent comparisons
  const normalizedPath = location.pathname.replace(/\/+$/, '').toLowerCase();
  const isCurrent = (path: string) =>
    normalizedPath === path.replace(/\/+$/, '').toLowerCase();
  const hideIfCurrent = (path: string) => !isCurrent(path);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Routes
  const ROUTES = {
    // Campaigns
    impactCampaign: '/web3/impact-campaign',
    clubsLeague: '/campaigns/clubs-league',

    pricing: '/pricing',
    foundingPartner: '/founding-partners',
    blog: '/blog',
    login: '/auth',
    freeTrial: '/free-trial',

    // Quiz Fundraisers subroutes
    howItWorks: '/quiz/how-it-works',
    features: '/quiz/features',
    useCases: '/quiz/use-cases',
    demo: '/quiz/demo',
    testimonials: '/testimonials',

    // App
    createQuiz: '/quiz/create-fundraising-quiz',
    eventDashboard: '/quiz/eventdashboard',
  };

  // Page flags
  const onFreeTrial = isCurrent(ROUTES.freeTrial);
  const onCampaigns = isCurrent(ROUTES.impactCampaign) || isCurrent(ROUTES.clubsLeague);

  return (
    <header className="bg-white/90 fixed inset-x-0 top-0 z-50 shadow-sm backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2">
            <Gamepad2 className="h-5 w-5 text-indigo-600 sm:h-6 sm:w-6" />
            <h1 className="bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-lg font-bold text-transparent sm:text-xl">
              FundRaisely
            </h1>
          </Link>
        </div>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex">
          {/* Quiz Fundraisers (dropdown) */}
          <div className="relative group">
            <button
              className="flex items-center gap-1 text-sm font-medium text-indigo-700 hover:text-indigo-900"
              aria-haspopup="true"
              aria-expanded="false"
            >
              Quiz Fundraisers
              <ChevronDown className="h-4 w-4" />
            </button>
            <div className="invisible absolute left-0 top-full w-64 rounded-lg border border-gray-100 bg-white py-2 opacity-0 shadow-lg transition-all duration-150 group-hover:visible group-hover:opacity-100">
              <div className="flex flex-col">
                {hideIfCurrent(ROUTES.howItWorks) && (
                  <Link to={ROUTES.howItWorks} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    How it Works
                  </Link>
                )}
                {hideIfCurrent(ROUTES.features) && (
                  <Link to={ROUTES.features} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    Features
                  </Link>
                )}
                {hideIfCurrent(ROUTES.useCases) && (
                  <Link to={ROUTES.useCases} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    Use Cases (Schools, Clubs, Charities)
                  </Link>
                )}
                {hideIfCurrent(ROUTES.demo) && (
                  <Link to={ROUTES.demo} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    Demo
                  </Link>
                )}
                {hideIfCurrent(ROUTES.testimonials) && (
                  <Link to={ROUTES.testimonials} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    Testimonials
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Pricing (dropdown with Founding Partners + Pricing) */}
          <div className="relative group">
            <button
              className="flex items-center gap-1 text-sm font-medium text-indigo-700 hover:text-indigo-900"
              aria-haspopup="true"
              aria-expanded="false"
            >
              Pricing
              <ChevronDown className="h-4 w-4" />
            </button>
            <div className="invisible absolute left-0 top-full w-64 rounded-lg border border-gray-100 bg-white py-2 opacity-0 shadow-lg transition-all duration-150 group-hover:visible group-hover:opacity-100">
              <div className="flex flex-col">
                {hideIfCurrent(ROUTES.foundingPartner) && (
                  <Link to={ROUTES.foundingPartner} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    Founding Partners
                  </Link>
                )}
                {hideIfCurrent(ROUTES.pricing) && (
                  <Link to={ROUTES.pricing} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    Pricing
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Campaigns (dropdown) */}
          <div className="relative group">
            <button
              className="flex items-center gap-1 text-sm font-medium text-indigo-700 hover:text-indigo-900"
              aria-haspopup="true"
              aria-expanded="false"
            >
              Campaigns
              <ChevronDown className="h-4 w-4" />
            </button>

            <div className="invisible absolute left-0 top-full w-72 rounded-lg border border-gray-100 bg-white py-2 opacity-0 shadow-lg transition-all duration-150 group-hover:visible group-hover:opacity-100">
              <div className="flex flex-col">
                {hideIfCurrent(ROUTES.impactCampaign) && (
                  <Link to={ROUTES.impactCampaign} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    Web3 Impact Campaign
                  </Link>
                )}
                {hideIfCurrent(ROUTES.clubsLeague) && (
                  <Link to={ROUTES.clubsLeague} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    Junior Clubs Fundraising Quiz League
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Blog */}
          {hideIfCurrent(ROUTES.blog) && (
            <Link to={ROUTES.blog} className="text-sm font-medium text-indigo-700 hover:text-indigo-900">
              Blog
            </Link>
          )}

          {/* Login (hidden when authenticated) */}
          {!isAuthenticated && hideIfCurrent(ROUTES.login) && (
            <Link to={ROUTES.login} className="text-sm font-medium text-indigo-700 hover:text-indigo-900">
              Login
            </Link>
          )}

          {/* Auth-dependent action */}
          {isAuthenticated ? (
            <Link to={ROUTES.eventDashboard} className="text-sm font-semibold text-indigo-700 hover:text-indigo-900">
              Quiz Dashboard
            </Link>
          ) : (
            !onFreeTrial && (
              <Link
                to={ROUTES.freeTrial}
                className="rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:from-purple-700 hover:to-indigo-700"
              >
                Free Trial
              </Link>
            )
          )}

          {/* Greeting + Logout when authed */}
          {isAuthenticated && (
            <>
              <span className="text-sm text-gray-500">Hi, {club?.name ?? user?.name ?? user?.email}</span>
              <button
                onClick={handleLogout}
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
              >
                Log out
              </button>
            </>
          )}
        </nav>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-gray-700 transition-colors hover:text-indigo-600 md:hidden"
          aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-menu"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div
          className="bg-white/95 border-t border-gray-100 shadow-lg backdrop-blur-sm md:hidden"
          id="mobile-menu"
          role="navigation"
          aria-label="Mobile navigation"
        >
          <div className="container mx-auto space-y-2 px-4 py-4">
            {/* Quiz Fundraisers accordion */}
            <button
              onClick={() => setMobileQuizOpen((v) => !v)}
              className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm font-medium text-indigo-700 hover:bg-indigo-50"
              aria-expanded={mobileQuizOpen}
            >
              <span>Quiz Fundraisers</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${mobileQuizOpen ? 'rotate-180' : ''}`} />
            </button>
            {mobileQuizOpen && (
              <div className="ml-2 flex flex-col">
                {hideIfCurrent(ROUTES.howItWorks) && (
                  <Link
                    to={ROUTES.howItWorks}
                    className="rounded-md px-2 py-2 text-sm text-indigo-700 hover:bg-indigo-50"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    How it Works
                  </Link>
                )}
                {hideIfCurrent(ROUTES.features) && (
                  <Link
                    to={ROUTES.features}
                    className="rounded-md px-2 py-2 text-sm text-indigo-700 hover:bg-indigo-50"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Features
                  </Link>
                )}
                {hideIfCurrent(ROUTES.useCases) && (
                  <Link
                    to={ROUTES.useCases}
                    className="rounded-md px-2 py-2 text-sm text-indigo-700 hover:bg-indigo-50"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Use Cases (Schools, Clubs, Charities)
                  </Link>
                )}
                {hideIfCurrent(ROUTES.demo) && (
                  <Link
                    to={ROUTES.demo}
                    className="rounded-md px-2 py-2 text-sm text-indigo-700 hover:bg-indigo-50"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Demo
                  </Link>
                )}
                {hideIfCurrent(ROUTES.testimonials) && (
                  <Link
                    to={ROUTES.testimonials}
                    className="rounded-md px-2 py-2 text-sm text-indigo-700 hover:bg-indigo-50"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Testimonials
                  </Link>
                )}
              </div>
            )}

            {/* Pricing accordion */}
            <button
              onClick={() => setMobilePricingOpen((v) => !v)}
              className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm font-medium text-indigo-700 hover:bg-indigo-50"
              aria-expanded={mobilePricingOpen}
            >
              <span>Pricing</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${mobilePricingOpen ? 'rotate-180' : ''}`} />
            </button>
            {mobilePricingOpen && (
              <div className="ml-2 flex flex-col">
                {hideIfCurrent(ROUTES.foundingPartner) && (
                  <Link
                    to={ROUTES.foundingPartner}
                    className="rounded-md px-2 py-2 text-sm text-indigo-700 hover:bg-indigo-50"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Founding Partners
                  </Link>
                )}
                {hideIfCurrent(ROUTES.pricing) && (
                  <Link
                    to={ROUTES.pricing}
                    className="rounded-md px-2 py-2 text-sm text-indigo-700 hover:bg-indigo-50"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Pricing
                  </Link>
                )}
              </div>
            )}

            {/* Campaigns accordion */}
            <button
              onClick={() => setMobileCampaignsOpen((v) => !v)}
              className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm font-medium text-indigo-700 hover:bg-indigo-50"
              aria-expanded={mobileCampaignsOpen}
            >
              <span>Campaigns</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${mobileCampaignsOpen ? 'rotate-180' : ''}`} />
            </button>
            {mobileCampaignsOpen && (
              <div className="ml-2 flex flex-col">
                {hideIfCurrent(ROUTES.impactCampaign) && (
                  <Link
                    to={ROUTES.impactCampaign}
                    className="rounded-md px-2 py-2 text-sm text-indigo-700 hover:bg-indigo-50"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Web3 Impact Campaign
                  </Link>
                )}
                {hideIfCurrent(ROUTES.clubsLeague) && (
                  <Link
                    to={ROUTES.clubsLeague}
                    className="rounded-md px-2 py-2 text-sm text-indigo-700 hover:bg-indigo-50"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Junior Clubs Fundraising Quiz League
                  </Link>
                )}
              </div>
            )}

            {/* Blog */}
            {hideIfCurrent(ROUTES.blog) && (
              <Link
                to={ROUTES.blog}
                className="block rounded-md px-2 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
                onClick={() => setMobileMenuOpen(false)}
              >
                Blog
              </Link>
            )}

            {/* Auth / Actions */}
            {!isAuthenticated && hideIfCurrent(ROUTES.login) && (
              <Link
                to={ROUTES.login}
                className="block rounded-md px-2 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
                onClick={() => setMobileMenuOpen(false)}
              >
                Login
              </Link>
            )}

            {isAuthenticated ? (
              <>
                <Link
                  to={ROUTES.eventDashboard}
                  className="block rounded-md px-2 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Quiz Dashboard
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="mt-2 w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-left text-sm font-medium text-red-700 hover:bg-red-100"
                >
                  Log out
                </button>
              </>
            ) : (
              !onFreeTrial && (
                <Link
                  to={ROUTES.freeTrial}
                  className="mt-1 block rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-center text-sm font-semibold text-white shadow-sm hover:from-purple-700 hover:to-indigo-700"
                  onClick={() => setMobileMenuOpen(false)}
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











