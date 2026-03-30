// src/components/GeneralSite2/Web3Header.tsx
import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { Menu, X, ChevronDown, Crosshair, Trophy, Gamepad2 } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Web3 Hub', to: '/web3' },
  { label: 'Features', to: '/web3/features' },
  { label: 'Partners', to: '/web3/partners' },
  { label: 'Blog', to: '/blog' },
] as const;

const HOST_LINKS = [
  {
    label: 'Host a Quiz',
    to: '/web3/quiz',
    icon: <Trophy className="h-4 w-4" />,
    accent:
      'text-[#a3f542] border-[#a3f542]/40 bg-[#a3f542]/10 hover:border-[#a3f542]/80 hover:bg-[#a3f542]/20',
  },
  {
    label: 'Host Elimination',
    to: '/web3/elimination',
    icon: <Crosshair className="h-4 w-4" />,
    accent:
      'text-orange-400 border-orange-400/40 bg-orange-400/10 hover:border-orange-400/80 hover:bg-orange-400/20',
  },
] as const;

export function Web3Header() {
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileHostOpen, setMobileHostOpen] = useState(false);

  const isActive = (to: string) =>
    to === '/web3'
      ? pathname === '/web3' || pathname === '/web3/'
      : pathname.startsWith(to);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[#1e2d42] bg-[#0a0e14]/95 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand - use same FundRaisely home link/logo style as main header */}
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2">
            <Gamepad2 className="h-5 w-5 text-indigo-400 sm:h-6 sm:w-6" />
            <h1 className="bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-lg font-bold text-transparent sm:text-xl">
              FundRaisely
            </h1>
          </Link>
          <span className="hidden text-xs text-white/30 sm:inline">/ web3</span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Web3 navigation">
          {NAV_LINKS.map(({ label, to }) => (
            <Link
              key={to}
              to={to}
              className={`rounded-lg px-3 py-2 font-mono text-sm transition ${
                isActive(to)
                  ? 'bg-[#a3f542]/10 text-[#a3f542]'
                  : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              {label}
            </Link>
          ))}

          {/* Host dropdown */}
          <div className="group relative ml-2">
            <button
              className="flex items-center gap-1 rounded-lg border border-[#1e2d42] px-3 py-2 font-mono text-sm font-semibold text-white/70 transition hover:border-white/20 hover:text-white"
              aria-haspopup="true"
            >
              Host
              <ChevronDown className="h-3.5 w-3.5 transition-transform group-hover:rotate-180" />
            </button>
            <div className="invisible absolute right-0 top-full mt-1 w-52 rounded-xl border border-[#1e2d42] bg-[#0f1520] py-2 opacity-0 shadow-xl transition-all duration-150 group-hover:visible group-hover:opacity-100">
              {HOST_LINKS.map(({ label, to, icon, accent }) => (
                <Link
                  key={to}
                  to={to}
                  className={`mx-2 my-0.5 flex items-center gap-2 rounded-lg border px-4 py-2.5 font-mono text-sm font-semibold transition ${accent}`}
                >
                  {icon}
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </nav>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="rounded-lg border border-[#1e2d42] p-2 text-white/60 transition hover:border-white/20 hover:text-white md:hidden"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          aria-controls="web3-mobile-menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          id="web3-mobile-menu"
          className="border-t border-[#1e2d42] bg-[#0a0e14] md:hidden"
          role="navigation"
          aria-label="Web3 mobile navigation"
        >
          <div className="container mx-auto space-y-1 px-4 py-4">
            {NAV_LINKS.map(({ label, to }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={`block rounded-lg px-3 py-2.5 font-mono text-sm transition ${
                  isActive(to)
                    ? 'bg-[#a3f542]/10 text-[#a3f542]'
                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`}
              >
                {label}
              </Link>
            ))}

            {/* Host accordion */}
            <button
              onClick={() => setMobileHostOpen((v) => !v)}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 font-mono text-sm font-semibold text-white/60 transition hover:bg-white/5 hover:text-white"
              aria-expanded={mobileHostOpen}
            >
              <span>Host</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${mobileHostOpen ? 'rotate-180' : ''}`} />
            </button>
            {mobileHostOpen && (
              <div className="ml-2 space-y-1">
                {HOST_LINKS.map(({ label, to, icon, accent }) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 font-mono text-sm font-semibold transition ${accent}`}
                  >
                    {icon}
                    {label}
                  </Link>
                ))}
              </div>
            )}

            {/* Back to main site */}
            <div className="mt-3 border-t border-[#1e2d42] pt-3">
              <Link
                to="/"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition hover:bg-white/5"
              >
                <Gamepad2 className="h-4 w-4 text-indigo-400" />
                <span className="bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text font-bold text-transparent">
                  FundRaisely
                </span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}