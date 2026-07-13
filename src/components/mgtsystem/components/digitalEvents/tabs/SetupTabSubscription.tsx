// src/components/mgtsystem/components/digitalEvents/tabs/SetupTabSubscription.tsx
//
// Read-only for now — editing a challenge's schedule/price after Stripe's
// Product/Price have been created (ensureStripeProductAndPrice, fired on
// first Activate) has real billing implications, so ScheduleSubscriptionModal
// intentionally doesn't support edit mode yet either. This tab is the
// "see what was configured" view; a future pass can add editing once
// we've decided how to handle changes for already-subscribed players.

import { Pencil, Lock } from 'lucide-react';
import type { Challenge } from '../../../../puzzles/services/ChallengeService';

interface Props {
  challenge: Challenge | null;
  challengeLoading: boolean;
  onEdit: () => void;
}

const DIFFICULTY_COLOURS: Record<string, string> = {
  easy: '#15803d',
  medium: '#8a6d2f',
  hard: '#c8423b',
};

export default function SetupTabSubscription({ challenge, challengeLoading, onEdit }: Props) {
  if (challengeLoading) {
    return (
      <div className="flex items-center justify-center p-10">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#e8ddfb] border-t-[#7c3aed]" />
      </div>
    );
  }

  if (!challenge) {
    return <div className="p-5 text-sm text-[#52636f]">No linked challenge found.</div>;
  }

  return (
    <div className="space-y-4 p-5">
      {challenge.status === 'draft' ? (
        <div className="flex items-center justify-between rounded-lg border border-[rgba(124,58,237,0.3)] bg-[rgba(124,58,237,0.06)] p-3">
          <p className="text-xs text-[#4c1d95]">
            Still a draft — the schedule and price can be edited before this challenge is activated.
          </p>
          <button type="button" onClick={onEdit}
            className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:opacity-90"
            style={{ background: '#7c3aed' }}>
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <Lock className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          <span>
            The weekly schedule and price were locked in when this challenge was activated and can't be edited here —
            changing them after subscribers have joined has billing implications. Contact support if this needs to change.
          </span>
        </div>
      )}

      <div className="rounded-xl border p-4" style={{ borderColor: '#dce1df', background: '#ffffff' }}>
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[#52636f]">Weekly puzzles</p>
        <div className="space-y-1.5">
          {(challenge.schedule ?? []).map(row => (
            <div key={row.id} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: '#fbf8f2' }}>
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold" style={{ background: 'rgba(124,58,237,0.12)', color: '#7c3aed' }}>
                  {row.week_number}
                </span>
                <span className="text-sm font-medium text-[#102532] capitalize">{row.puzzle_type}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold capitalize" style={{ color: DIFFICULTY_COLOURS[row.difficulty] ?? '#52636f' }}>
                  {row.difficulty}
                </span>
                {row.unlocks_at && (
                  <span className="text-xs text-[#8a9bab]">
                    Unlocks {new Date(row.unlocks_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </span>
                )}
              </div>
            </div>
          ))}
          {(!challenge.schedule || challenge.schedule.length === 0) && (
            <p className="text-sm text-[#8a9bab]">No schedule rows found.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border p-4" style={{ borderColor: '#dce1df', background: '#ffffff' }}>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#52636f]">Access</p>
          <p className="mt-1 text-lg font-bold text-[#102532]">{Number(challenge.is_free) === 1 ? 'Free' : 'Paid'}</p>
        </div>
        <div className="rounded-xl border p-4" style={{ borderColor: '#dce1df', background: '#ffffff' }}>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#52636f]">Total weeks</p>
          <p className="mt-1 text-lg font-bold text-[#102532]">{challenge.total_weeks}</p>
        </div>
      </div>
    </div>
  );
}