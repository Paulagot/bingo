import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SqCard } from '../../components/shared/SqFormPrimitives';
import { SqButton } from '../../components/shared/SqButton';
import { SqLoadingState, SqErrorBanner } from '../../components/shared/SqStateComponents';
import { getParentPlayer, resetPlayerCode, ParentPlayer } from '../../api/sqParentApi';
import { useSummerQuestAuthGuard } from '../../api/useSqAuthGuard';

// Spec route /parent/player/:playerId. Current programme week is
// computed client-side the same simple way LogTodayPage decides day
// type — good enough since the programme start date is fixed and
// known; the backend remains the source of truth for week numbers
// used in actual data queries.

const PROGRAMME_START_DATE = new Date('2026-06-15');

function getCurrentWeekNumber(): number {
  const diffDays = Math.floor((Date.now() - PROGRAMME_START_DATE.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 1;
  return Math.min(12, Math.floor(diffDays / 7) + 1);
}

export default function ParentPlayerPage() {
  const navigate = useNavigate();
  const { playerId } = useParams<{ playerId: string }>();
  const { handleApiError } = useSummerQuestAuthGuard('/summer-quest/parent-login');

  const [player, setPlayer] = useState<ParentPlayer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [newCode, setNewCode] = useState<string | null>(null);

  const currentWeek = getCurrentWeekNumber();

  async function load() {
    if (!playerId) return;
    setLoading(true);
    setError(null);
    try {
      setPlayer(await getParentPlayer(Number(playerId)));
    } catch (err) {
      if (!handleApiError(err)) setError('Couldn\u2019t load this player.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [playerId]);

  async function handleResetCode() {
    if (!playerId) return;
    setResetting(true);
    try {
      const result = await resetPlayerCode(Number(playerId));
      setNewCode(result.newPlayerCode);
    } catch (err) {
      handleApiError(err);
    } finally {
      setResetting(false);
    }
  }

  if (loading) return <div className="sq-root sq-parent-page"><SqLoadingState label="Loading player…" /></div>;
  if (error || !player) return <div className="sq-root sq-parent-page"><SqErrorBanner message={error || 'Player not found.'} onRetry={load} /></div>;

  return (
    <div className="sq-root sq-parent-page">
      <button className="sq-log-back" onClick={() => navigate('/summer-quest/parent/dashboard')}>← Back to dashboard</button>

      <header className="sq-parent-header">
        <h1>{player.display_name}</h1>
        <p>{player.squad}</p>
      </header>

      <SqCard className="sq-parent-detail-card">
        <SqButton
          fullWidth
          onClick={() => navigate(`/summer-quest/parent/weekly-signoff/${player.id}/${currentWeek}`)}
        >
          Review &amp; sign off Week {currentWeek}
        </SqButton>
      </SqCard>

      <SqCard className="sq-parent-detail-card">
        <h3>Player code</h3>
        <p className="sq-parent-code-blurb">
          Your child uses this code to log in on their own device. For privacy, it's never shown
          again after the first time \u2014 reset it any time if it's been lost.
        </p>
        {newCode ? (
          <div className="sq-invite-code-box">
            <span className="sq-invite-code-label">New player code</span>
            <span className="sq-invite-code-value">{newCode}</span>
          </div>
        ) : (
          <SqButton fullWidth variant="ghost" disabled={resetting} onClick={handleResetCode}>
            {resetting ? 'Resetting…' : 'Reset player code'}
          </SqButton>
        )}
      </SqCard>
    </div>
  );
}

export const SQ_PARENT_PLAYER_PAGE_CSS = `
.sq-parent-detail-card { margin-bottom: 14px; }
.sq-parent-detail-card h3 { margin: 0 0 6px; font-size: 15px; font-weight: 800; }
.sq-parent-code-blurb { font-size: 13px; color: var(--sq-grey); margin: 0 0 14px; line-height: 1.4; }
`;
