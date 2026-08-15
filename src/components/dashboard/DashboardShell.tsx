// src/components/dashboard/DashboardShell.tsx
//
// The frame every authenticated dashboard renders inside. It owns:
//   1. Auth guard - redirects to / if no user is logged in.
//   2. Top bar - Menu button (left) + Club name + User name (right).
//   3. Notifications ticker - app-level, from Fundraisely to the user.
//   4. Nav tabs - Events / Peer Fundraising, below notifications.
//   5. Club drawer trigger - opens ClubDrawer from the left.

import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { CalendarDays, Menu, Users } from 'lucide-react';

import { useAuthStore } from '../../features/auth';
import NotificationsTicker from '../mgtsystem/components/dashboard/NotificationsTicker';
import ClubDrawer from './ClubDrawer';
import { brand } from './branding';

const NAV = [
  { to: '/event-dashboard',  label: 'Events',           Icon: CalendarDays },
  { to: '/peer-dashboard',  label: 'Peer Fundraising',  Icon: Users },
];

export default function DashboardShell() {
  const navigate = useNavigate();
  const [clubOpen, setClubOpen] = useState(false);

  const isAuthenticated = useAuthStore((s: any) => s.isAuthenticated);
  const initialized     = useAuthStore((s: any) => s.initialized);
  const user            = useAuthStore((s: any) => s.user);
  const club            = useAuthStore((s: any) => s.club);

  const clubName = club?.name || user?.club_name || user?.clubName || '';
  const userName = user?.name || user?.full_name || user?.first_name || '';

  useEffect(() => {
    if (initialized && !isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [initialized, isAuthenticated, navigate]);

  // Show spinner while auth store is hydrating from the API
  if (!initialized) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: brand.bg }}
      >
        <div
          className="h-7 w-7 animate-spin rounded-full border-4"
          style={{ borderColor: brand.teal, borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div style={{ backgroundColor: brand.bg, minHeight: '100vh' }}>

      {/* ── Top bar: Menu button + Club name + User name ── */}
      <header
        className="sticky top-0 z-40"
        style={{ background: brand.surface, borderBottom: `1px solid ${brand.border}` }}
      >
        <div className="container mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2">

          {/* Left: hamburger menu */}
          <button
            type="button"
            onClick={() => setClubOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition"
            style={{ background: brand.tan, color: brand.navy }}
            onMouseEnter={e => (e.currentTarget.style.background = brand.tanStrong)}
            onMouseLeave={e => (e.currentTarget.style.background = brand.tan)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
            <span>Menu</span>
          </button>

          {/* Right: Club name + logged-in user */}
          <div className="flex items-center gap-2 text-sm">
            {clubName && (
              <span className="font-bold" style={{ color: brand.navy }}>
                {clubName}
              </span>
            )}
            {clubName && userName && (
              <span style={{ color: brand.border }}>·</span>
            )}
            {userName && (
              <span className="font-medium" style={{ color: brand.slate }}>
                {userName}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ── Notifications + Nav tabs on the same surface ── */}
{/* ── Notifications + Nav tabs on the same surface ── */}
<div className="container mx-auto max-w-7xl px-4 pt-3">
  {/* min-h reserves space so content below doesn't shift when ticker loads */}
  <div style={{ minHeight: '48px' }}>
    <NotificationsTicker />
  </div>

  <nav className="flex items-center gap-0 mt-2">
    {NAV.map(({ to, label, Icon }) => (
      <NavLink
        key={to}
        to={to}
        end
        className="inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold transition border-b-2 whitespace-nowrap"
        style={({ isActive }) =>
          isActive
            ? { color: brand.teal, borderBottomColor: brand.teal }
            : { color: brand.slate, borderBottomColor: 'transparent' }
        }
      >
        <Icon className="h-4 w-4" />
        {label}
      </NavLink>
    ))}
  </nav>
</div>

      {/* Whichever dashboard matched the route renders here */}
      <Outlet />

      {/* Club drawer (slides from left) */}
      <ClubDrawer open={clubOpen} onClose={() => setClubOpen(false)} />
    </div>
  );
}