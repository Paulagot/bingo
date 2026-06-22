import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SqCard } from '../components/shared/SqFormPrimitives';
import { SqLoadingState, SqErrorBanner, SqEmptyState } from '../components/shared/SqStateComponents';
import { SqBottomNav } from '../components/shared/SqBottomNav';
import { SqProgressRing } from '../components/shared/SqProgressRing';
import { getTeamBoard, TeamBoard } from '../api/sqProgressApi';
import { useSummerQuestAuthGuard } from '../api/useSqAuthGuard';

// Spec section 8.7. No individual names, no rankings, no "who is last" —
// the backend already enforces this (SummerQuestTeamBoardService.js
// only returns counts and milestone phrases), this page just renders
// what comes back.

export default function TeamBoardPage() {
  const navigate = useNavigate();
  const { handleApiError } = useSummerQuestAuthGuard('/summer-quest/player-login');
  const [data, setData] = useState<TeamBoard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setData(await getTeamBoard());
    } catch (err) {
      if (!handleApiError(err)) setError('Couldn\u2019t load the team board.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="sq-root sq-page-with-nav sq-team-board-page">
      <header className="sq-team-board-header">
        <button className="sq-log-back" onClick={() => navigate('/summer-quest/player/dashboard')}>← Back</button>
        <h1>Team Board</h1>
        <p>Everyone's work adds up.</p>
      </header>

      {loading && <SqLoadingState label="Counting up the team\u2019s work…" />}
      {error && <SqErrorBanner message={error} onRetry={load} />}

      {data && (
        <>
          <SqCard className="sq-team-goal-card">
            <SqProgressRing
              size={100}
              strokeWidth={10}
              progress={data.goalProgressThisWeek}
              colour="var(--sq-orange)"
              label={`${Math.round(data.goalProgressThisWeek * 100)}%`}
              sublabel="to this week's goal"
            />
            <p className="sq-team-goal-caption">
              {data.activePlayersThisWeek} player{data.activePlayersThisWeek === 1 ? '' : 's'} working toward {data.teamGoal} training days this week.
            </p>
          </SqCard>

          <div className="sq-team-stats-grid">
            <StatTile value={data.totalSessionsCompleted} label="Team sessions completed" />
            <StatTile value={data.totalMinutesPractised} label="Minutes practised" />
            <StatTile value={data.weeklyChallengesSubmitted} label="Weekly challenges submitted" />
            <StatTile value={data.parentSignoffsCompleted} label="Parent sign-offs this week" />
          </div>

          <h2 className="sq-team-milestones-title">This week's milestones</h2>
          {data.anonymousMilestones.length === 0 ? (
            <SqEmptyState icon="🌱" title="Just getting started" body="Milestones will show up here as the squad logs missions this week." />
          ) : (
            <div className="sq-team-milestones-feed">
              {data.anonymousMilestones.map((milestone: string, i: number) => (
                <div key={i} className="sq-milestone-row">{milestone}</div>
              ))}
            </div>
          )}
        </>
      )}

      <SqBottomNav />
    </div>
  );
}

function StatTile({ value, label }: { value: number; label: string }) {
  return (
    <div className="sq-stat-tile">
      <span className="sq-stat-tile-value">{value.toLocaleString()}</span>
      <span className="sq-stat-tile-label">{label}</span>
    </div>
  );
}

export const SQ_TEAM_BOARD_CSS = `
.sq-team-board-page { padding: 16px 16px 0; max-width: 480px; margin: 0 auto; }
.sq-team-board-header { margin-bottom: 16px; }
.sq-team-board-header h1 { font-size: 22px; font-weight: 800; margin: 0; }
.sq-team-board-header p { font-size: 13px; color: var(--sq-grey); margin: 4px 0 0; }

.sq-team-goal-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10px;
  margin-bottom: 16px;
  background: var(--sq-black);
}
.sq-team-goal-card .sq-ring-label, .sq-team-goal-card .sq-ring-sublabel { color: var(--sq-white); }
.sq-team-goal-caption { color: var(--sq-soft-orange); font-size: 13px; margin: 0; }

.sq-team-stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
.sq-stat-tile {
  background: var(--sq-white);
  border-radius: 16px;
  padding: 16px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(17,17,17,0.05);
}
.sq-stat-tile-value { display: block; font-size: 24px; font-weight: 800; color: var(--sq-orange-dark); }
.sq-stat-tile-label { display: block; font-size: 11px; color: var(--sq-grey); margin-top: 4px; }

.sq-team-milestones-title { font-size: 15px; font-weight: 800; margin: 0 0 10px; }
.sq-team-milestones-feed { display: flex; flex-direction: column; gap: 8px; }
.sq-milestone-row {
  background: var(--sq-soft-orange);
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 14px;
  font-weight: 700;
  color: var(--sq-charcoal);
}
`;
