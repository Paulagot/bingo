// Summer Quest — Challenge API calls
import { sqApi } from './sqApiClient';

export interface ChallengeSubmission {
  week_number: number;
  challenge_key: string;
  numeric_value: number | null;
  text_value: string | null;
  json_value: Record<string, unknown> | null;
  note: string | null;
  submitted_at: string;
}

export function getCurrentChallenge() {
  return sqApi.get<{ weekNumber: number; submission: ChallengeSubmission | null }>('/player/challenges/current');
}

export function getAllChallenges() {
  return sqApi.get<ChallengeSubmission[]>('/player/challenges');
}

export interface ChallengeSubmitResult {
  submission: ChallengeSubmission;
  newlyUnlockedBadges: string[];
}

export function submitChallenge(weekNumber: number, body: Record<string, unknown>) {
  return sqApi.post<ChallengeSubmitResult>(`/player/challenges/${weekNumber}`, body);
}
