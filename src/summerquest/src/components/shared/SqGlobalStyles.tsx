import React from 'react';
import { SQ_THEME_CSS } from '../../config/theme';
import { SQ_BUTTON_CSS } from './SqButton';
import { SQ_FORM_CSS } from './SqFormPrimitives';
import { SQ_LANDING_CSS } from '../../pages/LandingPage';
import { SQ_AUTH_PAGE_CSS } from '../../pages/PlayerLoginPage';
import { SQ_INVITE_CSS } from '../../pages/InvitePage';
import { SQ_STATE_CSS } from './SqStateComponents';
import { SQ_BOTTOM_NAV_CSS } from './SqBottomNav';
import { SQ_RING_CSS } from './SqProgressRing';
import { SQ_DASHBOARD_CSS } from '../../pages/player/PlayerDashboardPage';
import { SQ_LOG_PAGE_CSS } from '../../pages/player/LogTodayPage';
import { SQ_BADGES_PAGE_CSS } from '../../pages/player/BadgesPage';
import { SQ_PROGRESS_PAGE_CSS } from '../../pages/player/ProgressPage';
import { SQ_TEAM_BOARD_CSS } from '../../pages/TeamBoardPage';
import { SQ_NUTRITION_PAGE_CSS } from '../../pages/NutritionPage';
import { SQ_CHALLENGE_INPUT_CSS } from '../player/ChallengeInputRenderer';
import { SQ_CHALLENGES_PAGE_CSS } from '../../pages/player/ChallengesPage';
import { SQ_PARENT_DASHBOARD_CSS } from '../../pages/parent/ParentDashboardPage';
import { SQ_PARENT_PLAYER_PAGE_CSS } from '../../pages/parent/ParentPlayerPage';
import { SQ_SIGNOFF_PAGE_CSS } from '../../pages/parent/WeeklySignoffPage';
import { SQ_ADMIN_DASHBOARD_CSS } from '../../pages/admin/AdminDashboardPage';
import { SQ_ADMIN_PLAYERS_CSS } from '../../pages/admin/AdminPlayersPage';
import { SQ_ADMIN_PLAYER_DETAIL_CSS } from '../../pages/admin/AdminPlayerDetailPage';
import { SQ_ADMIN_INVITES_CSS } from '../../pages/admin/AdminInvitesPage';
import { SQ_ADMIN_EXPORTS_CSS } from '../../pages/admin/AdminExportsPage';
import { SQ_BADGE_MODAL_CSS } from './BadgeUnlockModal';
import { SQ_POWERED_BY_CSS } from './PoweredByFundraisely';

// Mount this ONCE near the root of the Summer Quest module (e.g. in
// whatever layout/router wrapper holds all /summer-quest/* routes).
// Keeping all the CSS in one <style> tag avoids fighting with
// Fundraisely's own global styles, since everything here is scoped
// under .sq-root.
export function SqGlobalStyles() {
  return (
    <style>
      {SQ_THEME_CSS + SQ_BUTTON_CSS + SQ_FORM_CSS + SQ_LANDING_CSS + SQ_AUTH_PAGE_CSS + SQ_INVITE_CSS +
        SQ_STATE_CSS + SQ_BOTTOM_NAV_CSS + SQ_RING_CSS + SQ_DASHBOARD_CSS + SQ_LOG_PAGE_CSS + SQ_BADGES_PAGE_CSS +
        SQ_PROGRESS_PAGE_CSS + SQ_TEAM_BOARD_CSS + SQ_NUTRITION_PAGE_CSS + SQ_CHALLENGE_INPUT_CSS + SQ_CHALLENGES_PAGE_CSS +
        SQ_PARENT_DASHBOARD_CSS + SQ_PARENT_PLAYER_PAGE_CSS + SQ_SIGNOFF_PAGE_CSS +
        SQ_ADMIN_DASHBOARD_CSS + SQ_ADMIN_PLAYERS_CSS + SQ_ADMIN_PLAYER_DETAIL_CSS + SQ_ADMIN_INVITES_CSS + SQ_ADMIN_EXPORTS_CSS +
        SQ_BADGE_MODAL_CSS + SQ_POWERED_BY_CSS}
    </style>
  );
}
