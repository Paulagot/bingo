import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { SqGlobalStyles } from './components/shared/SqGlobalStyles';
import LandingPage from './pages/LandingPage';
import PlayerLoginPage from './pages/PlayerLoginPage';
import ParentLoginPage from './pages/ParentLoginPage';
import AdminLoginPage from './pages/AdminLoginPage';
import InvitePage from './pages/InvitePage';
import PlayerDashboardPage from './pages/player/PlayerDashboardPage';
import LogTodayPage from './pages/player/LogTodayPage';
import BadgesPage from './pages/player/BadgesPage';
import ProgressPage from './pages/player/ProgressPage';
import ChallengesPage from './pages/player/ChallengesPage';
import TeamBoardPage from './pages/TeamBoardPage';
import NutritionPage from './pages/NutritionPage';
import ParentDashboardPage from './pages/parent/ParentDashboardPage';
import ParentPlayerPage from './pages/parent/ParentPlayerPage';
import WeeklySignoffPage from './pages/parent/WeeklySignoffPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminPlayersPage from './pages/admin/AdminPlayersPage';
import AdminPlayerDetailPage from './pages/admin/AdminPlayerDetailPage';
import AdminInvitesPage from './pages/admin/AdminInvitesPage';
import AdminExportsPage from './pages/admin/AdminExportsPage';

// Mount this once in your main app router, e.g.:
//   <Route path="/summer-quest/*" element={<SummerQuestApp />} />
//
// Groups 1-5 (auth shell, player core, player extras, parent, admin)
// are all live below. Group 6 (shared polish) is the only thing left —
// it touches existing pages rather than adding new routes.

export default function SummerQuestApp() {
  return (
    <>
      <SqGlobalStyles />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/player-login" element={<PlayerLoginPage />} />
        <Route path="/parent-login" element={<ParentLoginPage />} />
        <Route path="/admin-login" element={<AdminLoginPage />} />
        <Route path="/invite/:token" element={<InvitePage />} />

        <Route path="/player/dashboard" element={<PlayerDashboardPage />} />
        <Route path="/player/log-today" element={<LogTodayPage />} />
        <Route path="/player/badges" element={<BadgesPage />} />

        <Route path="/player/progress" element={<ProgressPage />} />
        <Route path="/player/challenges" element={<ChallengesPage />} />
        <Route path="/team-board" element={<TeamBoardPage />} />
        <Route path="/nutrition" element={<NutritionPage />} />

        <Route path="/parent/dashboard" element={<ParentDashboardPage />} />
        <Route path="/parent/player/:playerId" element={<ParentPlayerPage />} />
        <Route path="/parent/weekly-signoff/:playerId/:weekNumber" element={<WeeklySignoffPage />} />

        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
        <Route path="/admin/players" element={<AdminPlayersPage />} />
        <Route path="/admin/player/:playerId" element={<AdminPlayerDetailPage />} />
        <Route path="/admin/invites" element={<AdminInvitesPage />} />
        <Route path="/admin/exports" element={<AdminExportsPage />} />
      </Routes>
    </>
  );
}
