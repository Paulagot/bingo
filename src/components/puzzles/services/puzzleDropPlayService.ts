// src/components/puzzles/services/puzzleDropPlayService.ts
//
// Mirrors puzzleService.ts's load/submit/save shape, but every call needs
// an entitlementId + access_token instead of relying on a logged-in
// supporter session — Drop entitlements are standalone links, not a
// persistent session (see puzzleDropRoutes.js's requireDropAccess).
//
// ⚠️ saveProgressOnUnload's keepalive approach is this file's own
// inference (fetch with `keepalive: true`), not copied from
// puzzleService.ts's actual implementation, which hasn't been reviewed —
// sendBeacon would be the more common browser API for this exact
// situation but can't easily carry a custom Authorization header, hence
// the choice below. Worth checking puzzleService.ts's real approach if
// this needs to match it exactly.

import type { PuzzleInstance, PuzzleScoreResult } from '../puzzleTypes';

const API_BASE = '/api/puzzle-drop';

export class PaymentPendingError extends Error {
  constructor(public paymentStatus: string) {
    super('payment_not_confirmed');
  }
}

interface LoadDropPuzzleResult {
  puzzle: PuzzleInstance;
  progress: Record<string, unknown> | null;
  progressMeta: { activeSeconds: number; savedAt: string } | null;
  previousSubmission: PuzzleScoreResult | null;
  itemNumber: number;
  dropRoomId: string;
}

// ── Leaderboard types ─────────────────────────────────────────────────────
// Field names (weekNumber/weeks/challenge) are kept exactly as the backend
// sends them, even though these represent items/a drop — see
// puzzleDropService.js's comments on this. Structurally identical to
// publicLeaderboardService.ts's WeekLeaderboard/LeaderboardSummary types.

export interface DropLeaderboardMeta {
  id: string;
  title: string;
  status: string;
  clubName: string | null;
  clubLogoUrl: string | null;
  clubPrimaryColor: string | null;
  clubBackgroundColor: string | null;
  clubTextOnPrimaryColor: string | null;
}

export interface DropItemLeaderboardEntry {
  rank: number;
  playerName: string;
  totalScore: number;
  isCorrect: boolean;
  timeTakenSeconds: number | null;
  submittedAt: string | null;
}

export interface DropItemLeaderboard {
  challenge: DropLeaderboardMeta;
  weekNumber: number; // the item number
  puzzleType: string;
  difficulty: string;
  isFinal: boolean;
  entries: DropItemLeaderboardEntry[];
}

export interface DropSummaryTopEntry {
  rank: number;
  playerName: string;
  totalScore: number;
  isCorrect: boolean;
  timeTakenSeconds: number | null;
}

export interface DropSummaryItem {
  weekNumber: number; // the item number
  puzzleType: string;
  difficulty: string;
  isUnlocked: boolean;
  playerCount: number;
  top: DropSummaryTopEntry[];
}

export interface DropLeaderboardSummary {
  challenge: DropLeaderboardMeta;
  isFinal: boolean;
  weeks: DropSummaryItem[]; // the items
}

function authHeaders(token: string): Record<string, string> {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

async function parseJsonSafe(res: Response) {
  try { return await res.json(); } catch { return null; }
}

export const puzzleDropPlayService = {
  async loadPuzzle(entitlementId: string, token: string): Promise<LoadDropPuzzleResult> {
    const res = await fetch(`${API_BASE}/entitlements/${entitlementId}/puzzle`, {
      headers: authHeaders(token),
    });
    const data = await parseJsonSafe(res);

    if (res.status === 402) {
      throw new PaymentPendingError(data?.paymentStatus ?? 'claimed');
    }
    if (!res.ok) {
      throw new Error(data?.error || 'Failed to load puzzle');
    }
    return data;
  },

  async submitPuzzle(
    entitlementId: string,
    token: string,
    instanceId: string,
    body: { puzzleType: string; answer: Record<string, unknown>; timeTakenSeconds: number },
  ): Promise<{ score: PuzzleScoreResult }> {
    const res = await fetch(`${API_BASE}/entitlements/${entitlementId}/submit`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ instanceId, ...body }),
    });
    const data = await parseJsonSafe(res);
    if (!res.ok) throw new Error(data?.error || 'Submission failed');
    return data;
  },

  async saveProgress(
    entitlementId: string,
    token: string,
    instanceId: string,
    progressData: Record<string, unknown>,
  ): Promise<void> {
    const res = await fetch(`${API_BASE}/entitlements/${entitlementId}/save`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ instanceId, progressData }),
    });
    if (!res.ok) {
      const data = await parseJsonSafe(res);
      throw new Error(data?.error || 'Failed to save progress');
    }
  },

  saveProgressOnUnload(
    entitlementId: string,
    token: string,
    instanceId: string,
    progressData: Record<string, unknown>,
  ): void {
    // keepalive lets this request survive the page actually unloading —
    // a normal fetch is frequently cancelled mid-flight at that moment.
    fetch(`${API_BASE}/entitlements/${entitlementId}/save`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ instanceId, progressData }),
      keepalive: true,
    }).catch(() => { /* best-effort — nothing to do if this fails */ });
  },

  // ── Leaderboards — public routes, no token needed ────────────────────────
  // Hit the routes puzzleDropRoutes.js already exposes (built alongside
  // the rest of Drop's backend, before the buyer-facing UI existed to
  // link to them). No auth headers here — same "never send a token to a
  // public endpoint" convention as publicLeaderboardService.ts.

  async getItemLeaderboard(dropRoomId: string, itemNumber: number): Promise<DropItemLeaderboard> {
    const res = await fetch(`${API_BASE}/public/${dropRoomId}/items/${itemNumber}/leaderboard`);
    const data = await parseJsonSafe(res);
    if (!res.ok) throw new Error(data?.error || 'Failed to load leaderboard');
    return data;
  },

  async getLeaderboardSummary(dropRoomId: string): Promise<DropLeaderboardSummary> {
    const res = await fetch(`${API_BASE}/public/${dropRoomId}/leaderboard-summary`);
    const data = await parseJsonSafe(res);
    if (!res.ok) throw new Error(data?.error || 'Failed to load leaderboard summary');
    return data;
  },
};