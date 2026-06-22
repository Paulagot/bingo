import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SqCard } from '../../components/shared/SqFormPrimitives';
import { SqButton } from '../../components/shared/SqButton';
import { SqLoadingState, SqErrorBanner, SqEmptyState } from '../../components/shared/SqStateComponents';
import { getParentDashboard, ParentDashboardPlayer } from '../../api/sqParentApi';
import { useSummerQuestAuthGuard } from '../../api/useSqAuthGuard';
import { PoweredByFundraisely } from '../../components/shared/PoweredByFundraisely';

// Spec section 9 (/parent/dashboard). No bottom nav here — the parent
// side of the app is much smaller (dashboard -> player detail ->
// sign-off), so a persistent 5-tab nav built for the player app
// doesn't fit. Just a simple back-to-landing link instead.

export default function ParentDashboardPage() {
  const navigate = useNavigate();
  const { handleApiError } = useSummerQuestAuthGuard('/summer-quest/parent-login');
  const [weekNumber, setWeekNumber] = useState<number | null>(null);
  const [players, setPlayers] = useState<ParentDashboardPlayer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const dashboard = await getParentDashboard();
      setWeekNumber(dashboard.weekNumber);
      setPlayers(dashboard.players);
    } catch (err) {
      if (!handleApiError(err)) setError('Couldn\u2019t load your dashboard.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="sq-root sq-parent-page">
      <header className="sq-parent-header">
        <h1>Your dashboard</h1>
        {weekNumber && <p>Week {weekNumber} of the programme</p>}
      </header>

      {loading && <SqLoadingState label="Loading your family\u2019s progress…" />}
      {error && <SqErrorBanner message={error} onRetry={load} />}

      {players && players.length === 0 && (
        <SqEmptyState icon="👋" title="No players yet" body="You don't have any players set up on this account." />
      )}

      {players && players.length > 0 && (
        <div className="sq-parent-players-list">
          {players.map((player) => (
            <SqCard key={player.id} className="sq-parent-player-card">
              <div className="sq-parent-player-top">
                <h2>{player.displayName}</h2>
                {player.streak > 0 && <span className="sq-parent-streak-pill">🔥 {player.streak} day streak</span>}
              </div>
              <p className="sq-parent-signoff-status">
                {player.currentWeekSignedOff ? '✅ This week is signed off' : '⏳ This week needs your sign-off'}
              </p>
              <SqButton
                fullWidth
                variant={player.currentWeekSignedOff ? 'ghost' : 'secondary'}
                onClick={() => navigate(`/summer-quest/parent/player/${player.id}`)}
              >
                View {player.displayName}'s week
              </SqButton>
            </SqCard>
          ))}
        </div>
      )}

      <p className="sq-parent-footer-link">
        <a href="/summer-quest">Back to Summer Quest home</a>
      </p>

      <PoweredByFundraisely />
    </div>
  );
}

export const SQ_PARENT_DASHBOARD_CSS = `
.sq-parent-page { padding: 32px 16px 40px; max-width: 480px; margin: 0 auto; }
.sq-parent-header { margin-bottom: 20px; }
.sq-parent-header h1 { font-size: 24px; font-weight: 800; margin: 0; color: var(--sq-black); }
.sq-parent-header p { font-size: 13px; color: var(--sq-grey); margin: 4px 0 0; }

.sq-parent-players-list { display: flex; flex-direction: column; gap: 14px; }
.sq-parent-player-card { display: flex; flex-direction: column; gap: 10px; }
.sq-parent-player-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.sq-parent-player-top h2 { margin: 0; font-size: 18px; font-weight: 800; }
.sq-parent-streak-pill {
  background: var(--sq-soft-orange);
  color: var(--sq-orange-dark);
  font-size: 12px;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 999px;
  white-space: nowrap;
}
.sq-parent-signoff-status { font-size: 14px; margin: 0; color: var(--sq-charcoal); }

.sq-parent-footer-link { text-align: center; margin-top: 28px; font-size: 13px; }
.sq-parent-footer-link a { color: var(--sq-orange-dark); font-weight: 700; text-decoration: none; }
`;
