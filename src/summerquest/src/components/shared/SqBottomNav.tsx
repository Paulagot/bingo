import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Spec section 15.1. Five tabs, simple icons (emoji rather than an
// icon library import here, since this module avoids adding frontend
// dependencies beyond what's already in the host app's React setup).

const TABS = [
  { path: '/summer-quest/player/dashboard', label: 'Today', icon: '🗓️' },
  { path: '/summer-quest/player/progress', label: 'Progress', icon: '📈' },
  { path: '/summer-quest/player/challenges', label: 'Challenge', icon: '🏆' },
  { path: '/summer-quest/team-board', label: 'Team', icon: '👥' },
  { path: '/summer-quest/nutrition', label: 'Guide', icon: '📖' },
];

export function SqBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="sq-bottom-nav">
      {TABS.map((tab) => {
        const active = location.pathname === tab.path;
        return (
          <button
            key={tab.path}
            className={`sq-nav-tab ${active ? 'sq-nav-tab-active' : ''}`}
            onClick={() => navigate(tab.path)}
          >
            <span className="sq-nav-icon">{tab.icon}</span>
            <span className="sq-nav-label">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export const SQ_BOTTOM_NAV_CSS = `
.sq-bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  background: var(--sq-white);
  border-top: 1px solid var(--sq-border);
  padding: 6px 4px calc(6px + env(safe-area-inset-bottom));
  z-index: 40;
}
.sq-nav-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  background: none;
  border: none;
  padding: 6px 2px;
  cursor: pointer;
  color: var(--sq-grey);
}
.sq-nav-icon { font-size: 20px; }
.sq-nav-label { font-size: 11px; font-weight: 700; }
.sq-nav-tab-active { color: var(--sq-orange-dark); }

/* Page content needs bottom padding so the fixed nav never covers it. */
.sq-page-with-nav { padding-bottom: 110px; }
`;
