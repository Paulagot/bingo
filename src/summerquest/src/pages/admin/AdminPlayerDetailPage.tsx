import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SqCard } from '../../components/shared/SqFormPrimitives';
import { SqLoadingState, SqErrorBanner } from '../../components/shared/SqStateComponents';
import { getAdminPlayerDetail, AdminPlayerDetail } from '../../api/sqAdminApi';
import { useSummerQuestAuthGuard } from '../../api/useSqAuthGuard';

export default function AdminPlayerDetailPage() {
  const navigate = useNavigate();
  const { playerId } = useParams<{ playerId: string }>();
  const { handleApiError } = useSummerQuestAuthGuard('/summer-quest/admin-login');
  const [data, setData] = useState<AdminPlayerDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!playerId) return;
    setLoading(true);
    setError(null);
    try {
      setData(await getAdminPlayerDetail(Number(playerId)));
    } catch (err) {
      if (!handleApiError(err)) setError('Couldn\u2019t load this player.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [playerId]);

  if (loading) return <div className="sq-root sq-admin-page"><SqLoadingState label="Loading player detail…" /></div>;
  if (error || !data) return <div className="sq-root sq-admin-page"><SqErrorBanner message={error || 'Player not found.'} onRetry={load} /></div>;

  const { player, dailyLogs, weeklyChallenges, weeklySignoffs, badges } = data;

  return (
    <div className="sq-root sq-admin-page">
      <button className="sq-log-back" onClick={() => navigate('/summer-quest/admin/players')}>← Back to players</button>

      <header className="sq-admin-header">
        <h1>{player.displayName}</h1>
        <p>Parent: {player.parent.name} ({player.parent.email})</p>
      </header>

      <div className="sq-admin-detail-grid">
        <SqCard className="sq-admin-detail-section">
          <h3>Badges ({badges.length})</h3>
          {badges.length === 0 ? <p className="sq-admin-empty-note">No badges unlocked yet.</p> : (
            <ul className="sq-admin-simple-list">
              {badges.map((b) => <li key={b.badge_key}>{b.name} \u2014 {new Date(b.unlocked_at).toLocaleDateString('en-IE')}</li>)}
            </ul>
          )}
        </SqCard>

        <SqCard className="sq-admin-detail-section">
          <h3>Weekly sign-offs ({weeklySignoffs.length})</h3>
          {weeklySignoffs.length === 0 ? <p className="sq-admin-empty-note">No sign-offs yet.</p> : (
            <ul className="sq-admin-simple-list">
              {weeklySignoffs.map((s: any) => <li key={s.week_number}>Week {s.week_number}: signed by {s.parent_signature_name}</li>)}
            </ul>
          )}
        </SqCard>

        <SqCard className="sq-admin-detail-section">
          <h3>Weekly challenges ({weeklyChallenges.length})</h3>
          {weeklyChallenges.length === 0 ? <p className="sq-admin-empty-note">No challenges submitted yet.</p> : (
            <ul className="sq-admin-simple-list">
              {weeklyChallenges.map((c: any) => <li key={c.week_number}>Week {c.week_number}: {c.challenge_key}</li>)}
            </ul>
          )}
        </SqCard>

        <SqCard className="sq-admin-detail-section">
          <h3>Daily logs ({dailyLogs.length})</h3>
          {dailyLogs.length === 0 ? <p className="sq-admin-empty-note">No logs yet.</p> : (
            <p className="sq-admin-empty-note">{dailyLogs.length} days logged. Full export available on the Exports tab.</p>
          )}
        </SqCard>
      </div>
    </div>
  );
}

export const SQ_ADMIN_PLAYER_DETAIL_CSS = `
.sq-admin-detail-grid { display: flex; flex-direction: column; gap: 14px; }
.sq-admin-detail-section h3 { margin: 0 0 8px; font-size: 15px; font-weight: 800; }
.sq-admin-empty-note { font-size: 13px; color: var(--sq-grey); margin: 0; }
.sq-admin-simple-list { margin: 0; padding-left: 18px; font-size: 13px; color: var(--sq-charcoal); display: flex; flex-direction: column; gap: 4px; }
`;
