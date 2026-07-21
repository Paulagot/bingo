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

  /**
   * Best-effort save used only when the tab is being hidden or the page is
   * unloading. A normal fetch (including ones already in flight) is very
   * commonly cancelled by the browser the moment 'beforeunload'/'pagehide'
   * fires — this is exactly the "child interrupts, laptop gets closed"
   * moment we most want the save to survive. `keepalive: true` is the
   * browser's purpose-built mechanism for letting a request finish even
   * though the page is going away.
   *
   * navigator.sendBeacon() is the more commonly-cited tool for this, but it
   * can't carry the Authorization header this API needs (it only supports
   * a same-origin, header-less POST) — so it's the wrong fit for a
   * Bearer-token-authenticated endpoint like this one, and `keepalive`
   * is used instead.
   *
   * Confirmed against BaseService.request(): it builds its fetch config as
   * `{ ...options, headers: {...} }`, so this extra `keepalive` key does
   * pass through to the underlying fetch() call as intended.
   */
  saveProgressOnUnload(instanceId: string, progressData: Record<string, unknown>) {
    void this.request<{ ok: boolean }>(
      `/puzzles/${instanceId}/save`,
      {
        method: 'POST',
        body:   JSON.stringify({ progressData }),
        keepalive: true,
      } as RequestInit & { body: string }
    ).catch(() => {
      // Best-effort only. The debounced save moments earlier (see
      // usePuzzleAutosave) is the primary safety net — this is a last
      // chance to catch the final few seconds of changes, not the only
      // save attempt.
    });
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