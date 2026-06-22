// Summer Quest — Player API calls
import { sqApi } from './sqApiClient';

export interface DailyLogFields {
  ballMasteryDone?: boolean;
  ballMasteryMinutes?: number | null;
  passingDone?: boolean;
  passingMinutes?: number | null;
  speedWorkDone?: boolean;
  speedWorkMinutes?: number | null;
  jugglingDone?: boolean;
  jugglingMinutes?: number | null;
  freePlayType?: string | null;
  freePlayMinutes?: number | null;
  restAcknowledged?: boolean;
  effortFeeling?: 'easy' | 'good' | 'hard' | 'tried_my_best' | null;
  note?: string | null;
}

export interface PlayerDashboard {
  player: { id: number; displayName: string };
  today: { date: string; log: Record<string, unknown> | null };
  weekNumber: number;
  streak: number;
  weeklyCompletion: { completedDays: number; targetDays: number };
  badgeCount: number;
  weeklyChallenge: { key: string; title: string; description: string; icon: string; colour: string; submitted: boolean } | null;
  nutritionTip: { title: string; body: string } | null;
}

export function getPlayerDashboard() {
  return sqApi.get<PlayerDashboard>('/player/dashboard');
}

export function getTodayLog() {
  return sqApi.get<{ date: string; log: Record<string, unknown> | null }>('/player/today');
}

export function getLogForDate(logDate: string) {
  return sqApi.get<{ date: string; log: Record<string, unknown> | null }>(`/player/log/${logDate}`);
}

export function getRecentLogs() {
  return sqApi.get<Record<string, unknown>[]>('/player/recent-logs');
}

export interface DailyLogSaveResult {
  log: Record<string, unknown>;
  newlyUnlockedBadges: string[];
}

export function saveDailyLog(fields: DailyLogFields, logDate?: string) {
  return sqApi.post<DailyLogSaveResult>('/player/daily-log', { logDate, ...fields });
}

export interface BadgeRow {
  badge_key: string;
  name: string;
  description: string;
  icon: string;
  colour: string;
  unlocked: boolean;
  unlockedAt: string | null;
}

export function getBadges() {
  return sqApi.get<BadgeRow[]>('/player/badges');
}
