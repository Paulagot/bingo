// Summer Quest — Admin API calls
import { sqApi, downloadSqFile } from './sqApiClient';

export interface AdminDashboardSummary {
  currentWeek: number;
  totalPlayers: number;
  activeThisWeek: number;
  logsSubmittedThisWeek: number;
  challengeSubmissionsThisWeek: number;
  parentSignoffsCompleted: number;
  playersNeedingSignoff: number;
  totalSessions: number;
  totalOptionalMinutes: number;
}

export function getAdminDashboard() {
  return sqApi.get<AdminDashboardSummary>('/admin/dashboard');
}

export interface AdminPlayerRow {
  id: number;
  displayName: string;
  parentName: string;
  isActive: boolean;
  thisWeekCompletion: { completedDays: number; targetDays: number };
  currentStreak: number;
  challengeSubmitted: boolean;
  parentSigned: boolean;
  lastActive: string | null;
  badgeCount: number;
}

export function getAdminPlayerTable() {
  return sqApi.get<{ weekNumber: number; players: AdminPlayerRow[] }>('/admin/players');
}

export interface AdminPlayerDetail {
  player: {
    id: number;
    displayName: string;
    internalName: string | null;
    squad: string;
    isActive: boolean;
    createdAt: string;
    parent: { id: number; name: string; email: string };
  };
  dailyLogs: Record<string, unknown>[];
  weeklyChallenges: Record<string, unknown>[];
  weeklySignoffs: Record<string, unknown>[];
  badges: { badge_key: string; name: string; icon: string; colour: string; unlocked_at: string }[];
}

export function getAdminPlayerDetail(playerId: number) {
  return sqApi.get<AdminPlayerDetail>(`/admin/players/${playerId}`);
}

export interface AdminInvite {
  id: number;
  invited_email: string;
  invited_name: string | null;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export function getInvites() {
  return sqApi.get<AdminInvite[]>('/admin/invites');
}

export function createInvite(invitedEmail: string, invitedName?: string) {
  return sqApi.post<{ id: number; token: string; expiresAt: string }>('/admin/invites', { invitedEmail, invitedName });
}

export function revokeInvite(inviteId: number) {
  return sqApi.patch(`/admin/invites/${inviteId}/revoke`);
}

export function createCoach(name: string, email: string, password: string) {
  return sqApi.post<{ ok: boolean; email: string }>('/admin/coaches', { name, email, password });
}

export interface AdminCoach {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

export function getCoaches() {
  return sqApi.get<AdminCoach[]>('/admin/coaches');
}

export const EXPORT_FILES = [
  { path: '/admin/exports/player-summaries.csv', filename: 'player-summaries.csv', label: 'Player summaries' },
  { path: '/admin/exports/daily-logs.csv', filename: 'daily-logs.csv', label: 'Daily logs' },
  { path: '/admin/exports/weekly-challenges.csv', filename: 'weekly-challenges.csv', label: 'Weekly challenges' },
  { path: '/admin/exports/signoffs.csv', filename: 'signoffs.csv', label: 'Parent sign-offs' },
];

export function downloadExport(path: string, filename: string) {
  return downloadSqFile(path, filename);
}
