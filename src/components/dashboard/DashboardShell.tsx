// src/components/dashboard/DashboardShell.tsx
//
// The frame every authenticated dashboard renders inside. It owns:
//   1. Auth guard - redirects to / if no user is logged in.
//   2. Top nav - switches between dashboards (Events, Peer, future).
//   3. Notifications ticker - app-level, from Fundraisely to the user.
//   4. Club drawer trigger - opens ClubDrawer from the left.
//
// It's a react-router layout route: renders <Outlet />, and whichever
// dashboard matched the URL appears inside. Add a new dashboard by
// adding one entry to NAV and one nested <Route> under this shell.

import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { CalendarDays, Menu, Users } from 'lucide-react';

import { useAuthStore } from '../../features/auth';
import NotificationsTicker from '../mgtsystem/components/dashboard/NotificationsTicker';
import ClubDrawer from './ClubDrawer';
import { brand } from './branding';

const NAV = [
  { to: '/eventdashboard', label: 'Events',        Icon: CalendarDays },
  { to: '/peer-dashboard', label: 'Peer Fundraising', Icon: Users },
];

export default function DashboardShell() {
  const navigate = useNavigate();
  const [clubOpen, setClubOpen] = useState(false);

  // ── Auth guard ──
  // Zustand selectors are reactive - when initialize() completes and
  // populates the store, these re-evaluate and the component re-renders.
  const isAuthenticated = useAuthStore((s: any) => !!s.user || !!s.token);
  const isInitialized   = useAuthStore((s: any) => s.initialized !== false);
  // Some auth stores expose `initialized`; if yours doesn't, the fallback
  // `!== false` means we skip the loading gate and let isAuthenticated
  // decide immediately, which is fine - worst case the user sees a flash
  // of redirect.

  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isInitialized, isAuthenticated, navigate]);

  // While the auth store is still hydrating, show nothing rather than a
  // flash of the redirect or an empty shell.
  if (!isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: brand.bg }}>
        <div className="h-7 w-7 animate-spin rounded-full border-4 border-t-transparent"
          style={{ borderColor: brand.teal, borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!isAuthenticated) return null; // useEffect above will redirect

  return (
    <div style={{ backgroundColor: brand.bg, minHeight: '100vh' }}>
      {/* ── Top nav ── */}
      <header
        className="sticky top-0 z-40"
        style={{ background: brand.surface, borderBottom: `1px solid ${brand.border}` }}
      >
        <div className="container mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2">
          {/* Left: club menu trigger */}
          <button
            type="button"
            onClick={() => setClubOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition"
            style={{ background: brand.tan, color: brand.navy }}
            onMouseEnter={e => (e.currentTarget.style.background = brand.tanStrong)}
            onMouseLeave={e => (e.currentTarget.style.background = brand.tan)}
            aria-label="Open club menu"
          >
            <Menu className="h-5 w-5" />
            <span className="hidden sm:inline">Club</span>
          </button>

          {/* Centre: dashboard tabs - prominent, pill-style */}
          <nav
            className="flex items-center gap-1 rounded-xl p-1"
            style={{ background: brand.bg }}
          >
            {NAV.map(({ to, label, Icon }) => (
              <NavLink
                key={to}
                to={to}
                end
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition whitespace-nowrap"
                style={({ isActive }) =>
                  isActive
                    ? { background: brand.teal, color: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }
                    : { background: 'transparent', color: brand.slate }
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Right: spacer to keep nav centred on desktop */}
          <div className="w-[72px] hidden sm:block" />
        </div>
      </header>

      {/* ── App-level notifications ── */}
      <div className="container mx-auto max-w-7xl px-4 pt-4">
        <NotificationsTicker />
      </div>

      {/* Whichever dashboard matched the route renders here */}
      <Outlet />

      {/* Club drawer (slides from left) */}
      <ClubDrawer open={clubOpen} onClose={() => setClubOpen(false)} />
    </div>
  );
}