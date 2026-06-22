import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SqCard, SqInput } from '../../components/shared/SqFormPrimitives';
import { SqButton } from '../../components/shared/SqButton';
import { SqLoadingState, SqErrorBanner } from '../../components/shared/SqStateComponents';
import { getWeekSummary, submitSignoff, WeekSummary } from '../../api/sqParentApi';
import { useSummerQuestAuthGuard } from '../../api/useSqAuthGuard';

// Spec section 8.9. Once signed, the week locks (isLocked from the
// backend) — re-rendering the form as read-only rather than hiding the
// page entirely, so the parent can still see what they reviewed.

const DAY_LABELS: Record<string, string> = {
  training: 'Training day', free_play: 'Free play / match day', rest: 'Rest day',
};

export default function WeeklySignoffPage() {
  const navigate = useNavigate();
  const { playerId, weekNumber } = useParams<{ playerId: string; weekNumber: string }>();
  const { handleApiError } = useSummerQuestAuthGuard('/summer-quest/parent-login');

  const [summary, setSummary] = useState<WeekSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [signedName, setSignedName] = useState('');
  const [note, setNote] = useState('');
  const [justSigned, setJustSigned] = useState(false);

  async function load() {
    if (!playerId || !weekNumber) return;
    setLoading(true);
    setError(null);
    try {
      setSummary(await getWeekSummary(Number(playerId), Number(weekNumber)));
    } catch (err) {
      if (!handleApiError(err)) setError('Couldn\u2019t load this week\u2019s summary.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [playerId, weekNumber]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!playerId || !weekNumber) return;
    if (!signedName.trim()) {
      setError('Please type your name to confirm.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitSignoff(Number(playerId), Number(weekNumber), signedName.trim(), note);
      setJustSigned(true);
      load();
    } catch (err) {
      if (!handleApiError(err)) setError('Couldn\u2019t save your sign-off. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="sq-root sq-parent-page"><SqLoadingState label="Pulling together the week…" /></div>;
  if (error && !summary) return <div className="sq-root sq-parent-page"><SqErrorBanner message={error} onRetry={load} /></div>;
  if (!summary) return null;

  const isLocked = summary.isLocked;
  const signoff = summary.existingSignoff;

  return (
    <div className="sq-root sq-parent-page">
      <button className="sq-log-back" onClick={() => navigate(`/summer-quest/parent/player/${playerId}`)}>← Back</button>

      <header className="sq-parent-header">
        <h1>Week {summary.weekNumber} review</h1>
        <p>{summary.completedDays} of 5 training days completed</p>
      </header>

      {justSigned && <div className="sq-saved-banner">Sign-off saved. Thank you for reviewing this week!</div>}

      <SqCard className="sq-signoff-logs-card">
        <h3>Daily logs</h3>
        {summary.logs.length === 0 ? (
          <p className="sq-signoff-empty">No logs yet for this week.</p>
        ) : (
          <div className="sq-signoff-logs-list">
            {summary.logs.map((log: any) => (
              <div key={log.log_date} className="sq-signoff-log-row">
                <span className="sq-signoff-log-date">{new Date(log.log_date).toLocaleDateString('en-IE', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                <span className="sq-signoff-log-type">{DAY_LABELS[log.day_type] || log.day_type}</span>
                {log.note && <span className="sq-signoff-log-note">"{log.note}"</span>}
              </div>
            ))}
          </div>
        )}
      </SqCard>

      {summary.challenge && (
        <SqCard className="sq-signoff-logs-card">
          <h3>Weekly challenge</h3>
          <p className="sq-signoff-challenge-status">Submitted this week \u2705</p>
        </SqCard>
      )}

      <SqCard className="sq-signoff-form-card">
        <h3>Parent sign-off</h3>

        {isLocked && signoff ? (
          <div className="sq-signoff-locked">
            <p>✅ Signed by <strong>{signoff.parent_signature_name}</strong> on {new Date(signoff.signed_at).toLocaleDateString('en-IE')}</p>
            {signoff.parent_note && <p className="sq-signoff-locked-note">"{signoff.parent_note}"</p>}
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p className="sq-signoff-confirm-copy">I confirm I have reviewed this week's summer training log.</p>
            <SqInput
              label="Your name (typed signature)"
              value={signedName}
              onChange={(e) => setSignedName(e.target.value)}
              required
            />
            <div className="sq-field">
              <label className="sq-label" htmlFor="sq-signoff-note">Note (optional)</label>
              <textarea
                id="sq-signoff-note"
                className="sq-challenge-note-input"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Anything you'd like to add…"
              />
            </div>
            {error && <p className="sq-auth-error">{error}</p>}
            <SqButton type="submit" fullWidth disabled={submitting}>
              {submitting ? 'Saving…' : 'Confirm sign-off'}
            </SqButton>
          </form>
        )}
      </SqCard>
    </div>
  );
}

export const SQ_SIGNOFF_PAGE_CSS = `
.sq-signoff-logs-card { margin-bottom: 14px; }
.sq-signoff-logs-card h3 { margin: 0 0 10px; font-size: 15px; font-weight: 800; }
.sq-signoff-empty { font-size: 13px; color: var(--sq-grey); margin: 0; }
.sq-signoff-logs-list { display: flex; flex-direction: column; gap: 8px; }
.sq-signoff-log-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  background: var(--sq-cream);
  border-radius: 10px;
  padding: 8px 10px;
}
.sq-signoff-log-date { font-weight: 800; color: var(--sq-black); }
.sq-signoff-log-type { color: var(--sq-grey); }
.sq-signoff-log-note { color: var(--sq-orange-dark); font-style: italic; }
.sq-signoff-challenge-status { margin: 0; font-size: 14px; font-weight: 700; color: var(--sq-green); }

.sq-signoff-form-card h3 { margin: 0 0 10px; font-size: 15px; font-weight: 800; }
.sq-signoff-confirm-copy { font-size: 14px; color: var(--sq-charcoal); margin: 0 0 14px; }
.sq-signoff-locked { background: #E8F5E9; border-radius: 12px; padding: 14px; }
.sq-signoff-locked p { margin: 0; font-size: 14px; }
.sq-signoff-locked-note { margin-top: 6px; font-style: italic; color: var(--sq-charcoal); }
`;
