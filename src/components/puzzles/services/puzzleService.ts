// src/components/puzzles/services/PuzzleService.ts

import BaseService from '../../mgtsystem/services/BaseService';
import type {
  PuzzleLoadResponse,
  PuzzleSubmitResponse,
} from '../puzzleTypes';

const SUPPORTER_TOKEN_KEY = 'supporter_auth_token';

export interface PuzzleSubmitPayload {
  puzzleType:       string;
  answer:           Record<string, unknown>;
  timeTakenSeconds: number;
}

class PuzzleService extends BaseService {

  /**
   * CRITICAL: if a supporter token exists, use it EXCLUSIVELY.
   * Only fall back to auth_token when no supporter token is present at all
   * (dev/test path for club users on /dev/puzzles).
   *
   * Never use ?? chaining between the two tokens — that silently fires the
   * club token if a club user is also logged in on the same browser, which
   * stores their integer user ID as player_id instead of the supporter UUID.
   */
  protected override getAuthHeaders(): Record<string, string> {
    const supporterToken = localStorage.getItem(SUPPORTER_TOKEN_KEY);

    let token: string | null;
    if (supporterToken) {
      token = supporterToken;
    } else {
      token = localStorage.getItem('auth_token');
    }

    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  loadPuzzle(challengeId: string, weekNumber: number) {
    return this.request<PuzzleLoadResponse>(
      `/puzzles/${challengeId}/${weekNumber}`
    );
  }

  saveProgress(instanceId: string, progressData: Record<string, unknown>) {
    return this.request<{ ok: boolean }>(
      `/puzzles/${instanceId}/save`,
      {
        method: 'POST',
        body:   JSON.stringify({ progressData }),
      }
    );
  }

  submitPuzzle(instanceId: string, payload: PuzzleSubmitPayload) {
    return this.request<PuzzleSubmitResponse>(
      `/puzzles/${instanceId}/submit`,
      {
        method: 'POST',
        body:   JSON.stringify(payload),
      }
    );
  }
}

export const puzzleService = new PuzzleService();