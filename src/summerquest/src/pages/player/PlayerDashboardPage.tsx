import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SqCard } from '../../components/shared/SqFormPrimitives';
import { SqButton } from '../../components/shared/SqButton';
import { SqProgressRing } from '../../components/shared/SqProgressRing';
import { SqLoadingState, SqErrorBanner } from '../../components/shared/SqStateComponents';
import { SqBottomNav } from '../../components/shared/SqBottomNav';
import { getPlayerDashboard, PlayerDashboard } from '../../api/sqPlayerApi';
import { useSummerQuestAuthGuard } from '../../api/useSqAuthGuard';
import { PoweredByFundraisely } from '../../components/shared/PoweredByFundraisely';

export default function PlayerDashboardPage() {
  const navigate = useNavigate();
  const { handleApiError } = useSummerQuestAuthGuard('/summer-quest/player-login');
  const [data, setData] = useState<PlayerDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const dashboard = await getPlayerDashboard();
      setData(dashboard);
    } catch (err) {
      if (!handleApiError(err)) setError('Couldn\u2019t load your dashboard. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="sq-root sq-page-with-nav">
        <SqLoadingState label="Getting today ready…" />
        <SqBottomNav />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="sq-root sq-page-with-nav sq-dashboard-page">
        <SqErrorBanner message={error || 'Something went wrong.'} onRetry={load} />
        <SqBottomNav />
      </div>
    );
  }

  const todayLogged = Boolean(data.today.log);
  const weekProgress = data.weeklyCompletion.targetDays > 0
    ? data.weeklyCompletion.completedDays / data.weeklyCompletion.targetDays
    : 0;

  return (
    <div className="sq-root sq-page-with-nav sq-dashboard-page">
      <header className="sq-dashboard-header">
        <span className="sq-dashboard-week">Week {data.weekNumber}</span>
        <h1>Hi {data.player.displayName} 👋</h1>
      </header>

      <SqCard className="sq-mission-card">
        <h2>Today's Mission</h2>
        <p className="sq-mission-subtitle">
          {todayLogged ? 'You showed up today. Nice work!' : 'Complete what you can. Consistency beats perfection.'}
        </p>
        <SqButton
          fullWidth
          variant={todayLogged ? 'secondary' : 'primary'}
          onClick={() => navigate('/summer-quest/player/log-today')}
        >
          {todayLogged ? 'Update today\u2019s mission' : 'Log today\u2019s mission'}
        </SqButton>
      </SqCard>

      <div className="sq-dashboard-grid">
        <SqCard className="sq-dashboard-stat-card">
          <SqProgressRing
            progress={Math.min(1, data.streak / 7)}
            label={`${data.streak}`}
            sublabel="day streak"
            colour="var(--sq-orange)"
          />
          <p className="sq-dashboard-stat-caption">
            {data.streak > 0 ? '🔥 Keep it going!' : 'Log today to start a streak.'}
          </p>
        </SqCard>

        <SqCard className="sq-dashboard-stat-card">
          <SqProgressRing
            progress={weekProgress}
            label={`${data.weeklyCompletion.completedDays}/${data.weeklyCompletion.targetDays}`}
            sublabel="this week"
            colour="var(--sq-blue)"
          />
          <p className="sq-dashboard-stat-caption">Missions complete this week</p>
        </SqCard>
      </div>

      {data.weeklyChallenge && (
        <SqCard
          className="sq-weekly-challenge-preview"
          style={{ borderLeft: `6px solid var(--sq-${data.weeklyChallenge.colour})` }}
        >
          <span className="sq-challenge-preview-icon">{data.weeklyChallenge.icon === 'Trophy' ? '🏆' : '⭐'}</span>
          <div>
            <h3>{data.weeklyChallenge.title}</h3>
            <p>{data.weeklyChallenge.submitted ? 'Submitted \u2014 nice one!' : data.weeklyChallenge.description}</p>
          </div>
          <SqButton variant="ghost" onClick={() => navigate('/summer-quest/player/challenges')}>
            {data.weeklyChallenge.submitted ? 'View' : 'Go'}
          </SqButton>
        </SqCard>
      )}

      <SqCard className="sq-badge-preview-card" onClick={() => navigate('/summer-quest/player/badges')}>
        <span>🏅 {data.badgeCount} badge{data.badgeCount === 1 ? '' : 's'} earned</span>
        <span className="sq-badge-preview-arrow">→</span>
      </SqCard>

      {data.nutritionTip && (
        <SqCard className="sq-nutrition-tip-card">
          <span className="sq-tip-icon">💧</span>
          <div>
            <strong>{data.nutritionTip.title}</strong>
            <p>{data.nutritionTip.body}</p>
          </div>
        </SqCard>
      )}

      <PoweredByFundraisely />

      <SqBottomNav />
    </div>
  );
}

export const SQ_DASHBOARD_CSS = `
.sq-dashboard-page { padding: 24px 16px 0; max-width: 480px; margin: 0 auto; }
.sq-dashboard-header { margin-bottom: 16px; }
.sq-dashboard-week {
  display: inline-block;
  background: var(--sq-black);
  color: var(--sq-white);
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 4px 10px;
  border-radius: 999px;
  margin-bottom: 8px;
}
.sq-dashboard-header h1 { font-size: 24px; font-weight: 800; margin: 0; color: var(--sq-black); }

.sq-mission-card { margin-bottom: 16px; }
.sq-mission-card h2 { margin: 0 0 4px; font-size: 18px; font-weight: 800; }
.sq-mission-subtitle { color: var(--sq-grey); font-size: 14px; margin: 0 0 14px; }

.sq-dashboard-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
.sq-dashboard-stat-card { display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; }
.sq-dashboard-stat-caption { font-size: 12px; color: var(--sq-grey); margin: 0; }

.sq-weekly-challenge-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.sq-challenge-preview-icon { font-size: 28px; }
.sq-weekly-challenge-preview h3 { margin: 0; font-size: 15px; font-weight: 800; }
.sq-weekly-challenge-preview p { margin: 2px 0 0; font-size: 13px; color: var(--sq-grey); }
.sq-weekly-challenge-preview > div { flex: 1; }

.sq-badge-preview-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  font-weight: 700;
  margin-bottom: 16px;
}
.sq-badge-preview-arrow { color: var(--sq-orange); font-weight: 800; }

.sq-nutrition-tip-card { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 24px; }
.sq-tip-icon { font-size: 22px; }
.sq-nutrition-tip-card strong { font-size: 14px; }
.sq-nutrition-tip-card p { margin: 2px 0 0; font-size: 13px; color: var(--sq-grey); }
`;
