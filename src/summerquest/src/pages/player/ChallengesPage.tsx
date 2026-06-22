import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SqCard } from '../../components/shared/SqFormPrimitives';
import { SqButton } from '../../components/shared/SqButton';
import { SqLoadingState, SqErrorBanner } from '../../components/shared/SqStateComponents';
import { SqBottomNav } from '../../components/shared/SqBottomNav';
import { ChallengeInputRenderer, ChallengeFormValue } from '../../components/player/ChallengeInputRenderer';
import { getCurrentChallenge, submitChallenge, getAllChallenges, ChallengeSubmission } from '../../api/sqChallengeApi';
import { getChallengeForWeek, WEEKLY_CHALLENGES } from '../../config/weeklyChallenges';
import { useSummerQuestAuthGuard } from '../../api/useSqAuthGuard';
import { BadgeUnlockModal } from '../../components/shared/BadgeUnlockModal';

const ICON_MAP: Record<string, string> = {
  CircleDot: '⚽', Route: '🚧', Target: '🎯', Zap: '⚡', Footprints: '👣',
  Swords: '⚔️', Goal: '🥅', ClipboardCheck: '📋', Eye: '👀', Timer: '⏱️',
  Sparkles: '✨', Trophy: '🏆',
};

function submissionToFormValue(sub: ChallengeSubmission | null): ChallengeFormValue {
  if (!sub) return {};
  const fromJson = (sub.json_value as ChallengeFormValue) || {};
  return { value: sub.numeric_value ?? sub.text_value ?? '', ...fromJson };
}

export default function ChallengesPage() {
  const navigate = useNavigate();
  const { handleApiError } = useSummerQuestAuthGuard('/summer-quest/player-login');

  const [currentWeekNumber, setCurrentWeekNumber] = useState<number | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [formValue, setFormValue] = useState<ChallengeFormValue>({});
  const [pastSubmissions, setPastSubmissions] = useState<ChallengeSubmission[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPast, setShowPast] = useState(false);
  const [newBadges, setNewBadges] = useState<string[]>([]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [current, all] = await Promise.all([getCurrentChallenge(), getAllChallenges()]);
      setCurrentWeekNumber(current.weekNumber);
      setSelectedWeek(current.weekNumber);
      setFormValue(submissionToFormValue(current.submission));
      setSubmitted(Boolean(current.submission));
      setPastSubmissions(all);
    } catch (err) {
      if (!handleApiError(err)) setError('Couldn\u2019t load this week\u2019s challenge.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const config = selectedWeek ? getChallengeForWeek(selectedWeek) : null;
  const isPastWeek = selectedWeek !== null && currentWeekNumber !== null && selectedWeek !== currentWeekNumber;

  // Switching which week is being viewed/edited — load that week's
  // existing submission (if any) into the form, or start blank.
  function selectWeek(week: number) {
    setSelectedWeek(week);
    setError(null);
    const existing = pastSubmissions.find((s) => s.week_number === week) || null;
    setFormValue(submissionToFormValue(existing));
    setSubmitted(Boolean(existing));
  }

  async function handleSubmit() {
    if (!selectedWeek) return;
    setSaving(true);
    setError(null);
    try {
      const result = await submitChallenge(selectedWeek, formValue);
      setSubmitted(true);
      // Refresh the past-submissions list so the "Done" status and
      // re-opening this week later both reflect the new save.
      setPastSubmissions((prev) => {
        const withoutThisWeek = prev.filter((s) => s.week_number !== selectedWeek);
        return [...withoutThisWeek, result.submission];
      });
      if (result.newlyUnlockedBadges.length > 0) {
        setNewBadges(result.newlyUnlockedBadges);
      }
    } catch (err) {
      if (!handleApiError(err)) setError('Couldn\u2019t save your result. Try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="sq-root sq-page-with-nav">
        <SqLoadingState label="Loading this week's challenge…" />
        <SqBottomNav />
      </div>
    );
  }

  return (
    <div className="sq-root sq-page-with-nav sq-challenges-page">
      <header className="sq-challenges-header">
        <button className="sq-log-back" onClick={() => navigate('/summer-quest/player/dashboard')}>← Back</button>
        <h1>Weekly Challenge</h1>
        {isPastWeek && (
          <button className="sq-past-week-banner" onClick={() => selectWeek(currentWeekNumber!)}>
            Viewing Week {selectedWeek} (a past week) \u2014 tap to return to this week
          </button>
        )}
      </header>

      {error && <SqErrorBanner message={error} />}

      {config && (
        <SqCard className="sq-challenge-card" style={{ borderTop: `6px solid var(--sq-${config.colour})` }}>
          <span className="sq-challenge-icon">{ICON_MAP[config.icon] || '🏆'}</span>
          <h2>Week {config.week}: {config.title}</h2>
          <p className="sq-challenge-description">{config.description}</p>

          {submitted && (
            <div className="sq-saved-banner">
              {isPastWeek ? 'Saved for this past week.' : 'Submitted! You can update it any time before your parent signs off.'}
            </div>
          )}

          <ChallengeInputRenderer config={config} value={formValue} onChange={setFormValue} />

          <SqButton fullWidth disabled={saving} onClick={handleSubmit} style={{ marginTop: 16 }}>
            {saving ? 'Saving…' : submitted ? 'Update result' : 'Submit result'}
          </SqButton>
        </SqCard>
      )}

      <button className="sq-past-toggle" onClick={() => setShowPast((s) => !s)}>
        {showPast ? 'Hide' : 'See'} past challenges ({pastSubmissions.length})
      </button>

      {showPast && (
        <div className="sq-past-list">
          {WEEKLY_CHALLENGES.filter((c) => c.week !== currentWeekNumber).map((c) => {
            const sub = pastSubmissions.find((s) => s.week_number === c.week);
            return (
              <button key={c.week} className="sq-past-row" onClick={() => selectWeek(c.week)}>
                <span className="sq-past-icon">{ICON_MAP[c.icon] || '🏆'}</span>
                <span className="sq-past-title">Week {c.week}: {c.title}</span>
                <span className={`sq-past-status ${sub ? 'sq-past-status-done' : ''}`}>{sub ? 'Done \u2014 edit' : 'Fill in'}</span>
              </button>
            );
          })}
        </div>
      )}

      <SqBottomNav />

      <BadgeUnlockModal badgeKeys={newBadges} onClose={() => setNewBadges([])} />
    </div>
  );
}

export const SQ_CHALLENGES_PAGE_CSS = `
.sq-challenges-page { padding: 16px 16px 0; max-width: 480px; margin: 0 auto; }
.sq-challenges-header { margin-bottom: 16px; }
.sq-challenges-header h1 { font-size: 22px; font-weight: 800; margin: 0; }

.sq-challenge-card { text-align: center; margin-bottom: 16px; }
.sq-challenge-icon { font-size: 36px; }
.sq-challenge-card h2 { font-size: 18px; font-weight: 800; margin: 8px 0 4px; }
.sq-challenge-description { color: var(--sq-grey); font-size: 14px; margin: 0 0 16px; }
.sq-challenge-card form, .sq-challenge-card > div { text-align: left; }

.sq-past-toggle {
  background: none;
  border: none;
  color: var(--sq-orange-dark);
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  padding: 8px 0;
  text-align: left;
}
.sq-past-week-banner {
  display: block;
  width: 100%;
  text-align: left;
  background: var(--sq-soft-orange);
  border: none;
  border-radius: 10px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 700;
  color: var(--sq-orange-dark);
  margin-top: 8px;
  cursor: pointer;
}

.sq-past-list { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; margin-bottom: 16px; }
.sq-past-row {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--sq-white);
  border: none;
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 13px;
  width: 100%;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
}
.sq-past-row:active { background: var(--sq-soft-orange); }
.sq-past-icon { font-size: 16px; }
.sq-past-title { flex: 1; font-weight: 700; }
.sq-past-status { color: var(--sq-grey); font-weight: 700; }
.sq-past-status-done { color: var(--sq-green); }
`;
