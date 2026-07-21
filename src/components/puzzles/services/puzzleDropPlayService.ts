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
};