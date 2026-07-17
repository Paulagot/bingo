// src/components/mgtsystem/components/digitalEvents/tabs/LaunchTabSubscription.tsx
//
// The "club UI for the challenge" — Launch tab equivalent for subscriptions.
//
// Mark Complete was removed: every subscriber already has their own
// Stripe cancel_at set at checkout (starts_at + total_weeks from when
// THEY joined — see applyCancelAtForSubscription), so Stripe naturally
// stops billing each person on schedule with zero action needed. A
// "completed" status added nothing a status label didn't already cover.
//
// Cancel is real, not just a label change: it immediately cancels every
// active/past_due subscriber's Stripe subscription — no more charges,
// ever, for this challenge — while leaving access to already-paid weeks
// untouched and issuing no refunds. That's irreversible and affects
// other people's money, so it requires an explicit two-step confirm
// with the consequences spelled out, not a single click.

import { useState } from 'react';
import { Play, Ban, AlertCircle, ExternalLink, ShieldAlert, CheckCircle2, X } from 'lucide-react';
import { challengeService, type Challenge } from '../../../../puzzles/services/ChallengeService';

interface Props {
  challenge: Challenge | null;
  challengeLoading: boolean;
  onStatusChanged: () => void; // triggers onRefreshRoom in the parent drawer
}

export default function LaunchTabSubscription({ challenge, challengeLoading, onStatusChanged }: Props) {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelSummary, setCancelSummary] = useState<Challenge['stripeCancelSummary'] | null>(null);

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

  const activate = async () => {
    setError(null);
    setUpdating(true);
    try {
      await challengeService.updateStatus(challenge.id, 'active');
      onStatusChanged();
    } catch (e: any) {
      if (e?.message === 'stripe_not_connected') {
        setError('Connect Stripe (Settings → Payments) before activating a paid challenge.');
      } else if (e?.message === 'invalid_weekly_price') {
        setError('This challenge has no valid weekly price set.');
      } else {
        setError(e?.message || 'Failed to activate.');
      }
    } finally {
      setUpdating(false);
    }
  };

  const confirmCancel = async () => {
    setError(null);
    setUpdating(true);
    try {
      const updated = await challengeService.updateStatus(challenge.id, 'cancelled');
      setCancelSummary(updated.stripeCancelSummary ?? null);
      setConfirmingCancel(false);
      onStatusChanged();
    } catch (e: any) {
      setError(e?.message || 'Failed to cancel.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-4 p-5">
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-rose-600" />
          <p className="text-sm text-rose-700">{error}</p>
        </div>
      )}

      {cancelSummary && (
        <div className={`flex items-start gap-2 rounded-xl border p-3 ${
          cancelSummary.failedCount > 0 ? 'border-amber-200 bg-amber-50' : 'border-green-200 bg-green-50'
        }`}>
          {cancelSummary.failedCount > 0
            ? <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
            : <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />}
          <div className="text-sm">
            <p className={cancelSummary.failedCount > 0 ? 'text-amber-900' : 'text-green-900'}>
              {cancelSummary.cancelledCount} subscriber{cancelSummary.cancelledCount !== 1 ? 's' : ''} cancelled successfully.
              {cancelSummary.failedCount > 0 && ` ${cancelSummary.failedCount} failed to cancel and may need manual follow-up in Stripe.`}
            </p>
            {cancelSummary.errors.length > 0 && (
              <ul className="mt-1.5 space-y-0.5 text-xs text-amber-800">
                {cancelSummary.errors.map((err, i) => <li key={i}>• {err}</li>)}
              </ul>
            )}
          </div>
        </div>
      )}

      {challenge.status === 'draft' && (
        <div className="rounded-xl border p-5" style={{ borderColor: '#dce1df', background: '#ffffff' }}>
          <p className="text-sm font-bold text-[#102532]">Ready to launch?</p>
          <p className="mt-1 text-xs text-[#52636f]">
            Activating opens sign-ups and starts the weekly schedule. For paid challenges this also sets up
            the Stripe product/price used for billing.
          </p>
          <button type="button" disabled={updating} onClick={activate}
            className="mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
            style={{ background: '#7c3aed' }}>
            <Play className="h-4 w-4" />
            {updating ? 'Activating…' : 'Activate challenge'}
          </button>
        </div>
      )}

      {challenge.status === 'active' && !confirmingCancel && (
        <div className="rounded-xl border p-5" style={{ borderColor: '#dce1df', background: '#ffffff' }}>
          <p className="text-sm font-bold text-[#102532]">Challenge is live</p>
          <p className="mt-1 text-xs text-[#52636f]">
            No action needed to let this run its course — each subscriber's billing already stops
            automatically once they've paid for their full {challenge.total_weeks}-week run.
          </p>
          <button type="button" disabled={updating} onClick={() => setConfirmingCancel(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition hover:bg-gray-50 disabled:opacity-50"
            style={{ borderColor: '#dce1df', color: '#c8423b' }}>
            <Ban className="h-4 w-4" />
            Cancel challenge
          </button>
        </div>
      )}

      {challenge.status === 'active' && confirmingCancel && (
        <div className="rounded-xl border-2 p-5" style={{ borderColor: '#c8423b', background: '#fef2f2' }}>
          <div className="flex items-start gap-2">
            <ShieldAlert className="mt-0.5 h-5 w-5 flex-shrink-0 text-rose-600" />
            <div>
              <p className="text-sm font-bold text-rose-900">This will stop billing immediately — are you sure?</p>
              <ul className="mt-2 space-y-1.5 text-xs text-rose-800">
                <li>• Every active subscriber's Stripe subscription will be cancelled <strong>right now</strong> — no more weekly charges, for anyone.</li>
                <li>• Subscribers keep access to whatever weeks they've already paid for. Nothing already unlocked is taken away.</li>
                <li>• <strong>No refunds</strong> are issued for the current period.</li>
                <li>• This cannot be undone. New sign-ups also stop.</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" disabled={updating} onClick={confirmCancel}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
              style={{ background: '#c8423b' }}>
              <Ban className="h-4 w-4" />
              {updating ? 'Cancelling everyone…' : 'Yes, cancel and stop all billing'}
            </button>
            <button type="button" disabled={updating} onClick={() => setConfirmingCancel(false)}
              className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition hover:bg-gray-50 disabled:opacity-50"
              style={{ borderColor: '#dce1df', color: '#52636f' }}>
              <X className="h-4 w-4" />
              Never mind
            </button>
          </div>
        </div>
      )}

      {(challenge.status === 'completed' || challenge.status === 'cancelled') && (
        <div className="rounded-xl border p-5 text-sm text-[#52636f]" style={{ borderColor: '#dce1df', background: '#ffffff' }}>
          This challenge is <strong className="capitalize">{challenge.status}</strong>. No further sign-ups are being accepted.
        </div>
      )}

      <a href={`/challenges/${challenge.id}`} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7c3aed] hover:opacity-80">
        Open full challenge page (players, detailed management) ↗
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}