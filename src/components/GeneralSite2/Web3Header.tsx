import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import {
  Menu,
  X,
  Gamepad2,
  Loader2,
  Wallet,
  LayoutDashboard,
  Calendar,
  Rocket,
  HeartHandshake,
  ChevronDown,
  BadgeCheck,
  Trophy,
  Crosshair,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { useWeb3FundraiserAuth } from '../../hooks/useWeb3FundraiserAuth';

const PRIMARY_LINKS = [
  { label: 'Find events', to: '/web3/events', icon: Calendar },
  { label: 'Host', to: '/web3/host', icon: Rocket },
  { label: 'Causes', to: '/web3/causes', icon: HeartHandshake },
] as const;

const MORE_LINKS = [
  { label: 'Features', to: '/web3/features', icon: Sparkles },
  { label: 'Partners', to: '/web3/partners', icon: BadgeCheck },
  { label: 'Quiz', to: '/web3/quiz', icon: Trophy },
  { label: 'Elimination', to: '/web3/elimination', icon: Crosshair },
  { label: 'Web2 Hub', to: '/', icon: ExternalLink },
] as const;

export function Web3Header() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement | null>(null);

  const { stage, walletAddress, error, startConnect, startDisconnect } =
    useWeb3FundraiserAuth({
      onVerified: () => {
        setMobileOpen(false);
        navigate('/web3/fundraisersdashboard');
      },
      onDisconnected: () => {
        setMobileOpen(false);
        navigate('/web3');
      },
    });

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!moreRef.current) return;
      if (!moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }

    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setMoreOpen(false);
    }

    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);

    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);

  const isActive = (to: string) => {
    if (to === '/') return pathname === '/';
    if (to === '/web3') return pathname === '/web3' || pathname === '/web3/';
    return pathname.startsWith(to);
  };

  const isVerified = stage === 'verified';
  const isBusy = stage === 'connecting' || stage === 'signing' || stage === 'verifying';
  const isOnDashboard = pathname.startsWith('/web3/fundraisersdashboard');

  const busyLabel = (() => {
    if (stage === 'connecting') return 'Connecting...';
    if (stage === 'signing') return 'Sign to continue';
    if (stage === 'verifying') return 'Verifying...';
    return null;
  })();

  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : null;

  const handleWalletClick = () => {
    if (isVerified) startDisconnect();
    else if (!isBusy) startConnect();
  };

  const moreActive = MORE_LINKS.some(link => isActive(link.to));

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[#1e2d42] bg-[#0a0e14]/95 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <Link to="/web3" className="flex items-center gap-2">
            <Gamepad2 className="h-5 w-5 text-indigo-400 sm:h-6 sm:w-6" />
            <h1 className="bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-lg font-bold text-transparent sm:text-xl">
              FundRaisely
            </h1>
          </Link>
          <span className="hidden text-xs text-white/30 sm:inline">/ web3</span>
        </div>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Web3 navigation">
          {PRIMARY_LINKS.map(({ label, to }) => (
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

          <div className="relative" ref={moreRef}>
            <button
              onClick={() => setMoreOpen(v => !v)}
              className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 font-mono text-sm transition ${
                moreActive || moreOpen
                  ? 'bg-[#a3f542]/10 text-[#a3f542]'
                  : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`}
              aria-expanded={moreOpen}
              aria-haspopup="menu"
            >
              More
              <ChevronDown className={`h-4 w-4 transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
            </button>

            {moreOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl border border-[#1e2d42] bg-[#0f1520] shadow-2xl">
                <div className="p-2">
                  {MORE_LINKS.map(({ label, to, icon: Icon }) => (
                    <Link
                      key={to}
                      to={to}
                      onClick={() => setMoreOpen(false)}
                      className={`flex items-center gap-2 rounded-lg px-3 py-2.5 font-mono text-sm transition ${
                        isActive(to)
                          ? 'bg-[#a3f542]/10 text-[#a3f542]'
                          : 'text-white/60 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {isVerified && !isOnDashboard && (
            <Link
              to="/web3/fundraisersdashboard"
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 font-mono text-sm text-white/60 transition hover:bg-white/5 hover:text-white"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              Dashboard
            </Link>
          )}

          <div className="ml-2 flex items-center gap-2">
            {isVerified && shortAddress && (
              <span className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 font-mono text-[11px] text-white/40">
                {shortAddress}
              </span>
            )}

            {error && <span className="font-mono text-[10px] text-red-400">{error}</span>}

            <button
              onClick={handleWalletClick}
              disabled={isBusy}
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 font-mono text-xs font-semibold transition ${
                isVerified
                  ? 'border-red-500/40 bg-red-500/10 text-red-400 hover:border-red-500/70 hover:bg-red-500/20'
                  : isBusy
                  ? 'cursor-not-allowed border-white/10 bg-white/5 text-white/40'
                  : 'border-[#a3f542]/40 bg-[#a3f542]/10 text-[#a3f542] hover:border-[#a3f542]/80 hover:bg-[#a3f542]/20'
              }`}
            >
              {isBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Wallet className="h-3.5 w-3.5" />
              )}
              {isBusy ? busyLabel : isVerified ? 'Disconnect' : 'Connect Wallet'}
            </button>
          </div>
        </nav>

        <button
          onClick={() => setMobileOpen(v => !v)}
          className="rounded-lg border border-[#1e2d42] p-2 text-white/60 transition hover:border-white/20 hover:text-white md:hidden"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          aria-controls="web3-mobile-menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div
          id="web3-mobile-menu"
          className="border-t border-[#1e2d42] bg-[#0a0e14] md:hidden"
          role="navigation"
          aria-label="Web3 mobile navigation"
        >
          <div className="container mx-auto space-y-1 px-4 py-4">
            {PRIMARY_LINKS.map(({ label, to, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2.5 font-mono text-sm transition ${
                  isActive(to)
                    ? 'bg-[#a3f542]/10 text-[#a3f542]'
                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}

            <div className="border-t border-[#1e2d42] pt-3">
              <p className="px-3 pb-2 font-mono text-[11px] uppercase tracking-widest text-white/25">
                More
              </p>
              {MORE_LINKS.map(({ label, to, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2.5 font-mono text-sm transition ${
                    isActive(to)
                      ? 'bg-[#a3f542]/10 text-[#a3f542]'
                      : 'text-white/60 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))}
            </div>

            {isVerified && !isOnDashboard && (
              <Link
                to="/web3/fundraisersdashboard"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 font-mono text-sm text-white/60 transition hover:bg-white/5 hover:text-white"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
            )}

            <div className="border-t border-[#1e2d42] pt-3">
              {isVerified && shortAddress && (
                <p className="mb-2 px-3 font-mono text-xs text-white/40">{shortAddress}</p>
              )}

              {isBusy ? (
                <button
                  disabled
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 font-mono text-sm text-white/40"
                >
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {busyLabel}
                </button>
              ) : isVerified ? (
                <button
                  onClick={() => {
                    startDisconnect();
                    setMobileOpen(false);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2.5 font-mono text-sm font-semibold text-red-400 transition hover:border-red-500/70 hover:bg-red-500/20"
                >
                  <Wallet className="h-4 w-4" />
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={() => {
                    startConnect();
                    setMobileOpen(false);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#a3f542]/40 bg-[#a3f542]/10 px-3 py-2.5 font-mono text-sm font-semibold text-[#a3f542] transition hover:border-[#a3f542]/80 hover:bg-[#a3f542]/20"
                >
                  <Wallet className="h-4 w-4" />
                  Connect Wallet
                </button>
              )}

              {error && <p className="mt-1 px-3 font-mono text-xs text-red-400">{error}</p>}
            </div>

            <div className="border-t border-[#1e2d42] pt-3">
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