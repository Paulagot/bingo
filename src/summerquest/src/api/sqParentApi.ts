// Summer Quest — Parent API calls
import { sqApi } from './sqApiClient';

export interface ParentDashboardPlayer {
  id: number;
  displayName: string;
  streak: number;
  currentWeekSignedOff: boolean;
}

export function getParentDashboard() {
  return sqApi.get<{ weekNumber: number; players: ParentDashboardPlayer[] }>('/parent/dashboard');
}

export interface ParentPlayer {
  id: number;
  display_name: string;
  internal_name: string | null;
  squad: string;
  is_active: boolean;
  created_at: string;
}

export function getParentPlayer(playerId: number) {
  return sqApi.get<ParentPlayer>(`/parent/players/${playerId}`);
}

export function resetPlayerCode(playerId: number) {
  return sqApi.post<{ newPlayerCode: string }>(`/parent/players/${playerId}/reset-code`);
}

export interface WeekSummary {
  weekNumber: number;
  logs: Record<string, unknown>[];
  completedDays: number;
  challenge: Record<string, unknown> | null;
  existingSignoff: { parent_signature_name: string; parent_note: string | null; signed_at: string } | null;
  isLocked: boolean;
}

export function getWeekSummary(playerId: number, weekNumber: number) {
  return sqApi.get<WeekSummary>(`/parent/players/${playerId}/weeks/${weekNumber}`);
}

export function submitSignoff(playerId: number, weekNumber: number, signedName: string, note: string) {
  return sqApi.post(`/parent/players/${playerId}/weeks/${weekNumber}/signoff`, { signedName, note });
}
