// Summer Quest — Progress / Team Board / Nutrition API calls
import { sqApi } from './sqApiClient';

export interface ActivityProgress {
  sessionsCompleted: number;
  minutesTotal: number;
  sessionsThisWeek: number;
  badgeProgress: { current: number; target: number; badgeKey: string };
}

export interface PlayerProgress {
  weekNumber: number;
  ballMastery: ActivityProgress;
  passing: ActivityProgress;
  speedWork: ActivityProgress & {
    sprint10m: {
      history: { week_number: number; value: string; unit: string }[];
      improvement: { firstValue: number; latestValue: number; improvedBy: number } | null;
    };
  };
  juggling: ActivityProgress & {
    keepyUppy: { bestScore: number | null; latestScore: number | null };
  };
}

export function getPlayerProgress() {
  return sqApi.get<PlayerProgress>('/player/progress');
}

export interface TeamBoard {
  weekNumber: number;
  totalSessionsCompleted: number;
  totalMinutesPractised: number;
  activePlayersThisWeek: number;
  weeklyChallengesSubmitted: number;
  parentSignoffsCompleted: number;
  teamGoal: number;
  goalProgressThisWeek: number;
  anonymousMilestones: string[];
}

export function getTeamBoard() {
  return sqApi.get<TeamBoard>('/player/team-board');
}

export interface NutritionContent {
  hydration: { id: number; title: string; body: string }[];
  before_training: { id: number; title: string; body: string }[];
  after_training: { id: number; title: string; body: string }[];
  everyday: { id: number; title: string; body: string }[];
  parent_tip: { id: number; title: string; body: string }[];
}

export function getNutritionContent() {
  return sqApi.get<NutritionContent>('/player/nutrition');
}

export function acknowledgeNutritionGuide() {
  return sqApi.post<{ ok: boolean }>('/player/nutrition/acknowledge');
}
