import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SqCard } from '../../components/shared/SqFormPrimitives';
import { SqLoadingState, SqErrorBanner } from '../../components/shared/SqStateComponents';
import { SqBottomNav } from '../../components/shared/SqBottomNav';
import { SqProgressRing } from '../../components/shared/SqProgressRing';
import { getPlayerProgress, PlayerProgress } from '../../api/sqProgressApi';
import { useSummerQuestAuthGuard } from '../../api/useSqAuthGuard';

// Spec section 8.3. Never compares one child to another — every number
// on this page is scoped to the logged-in player by the backend.

export default function ProgressPage() {
  const navigate = useNavigate();
  const { handleApiError } = useSummerQuestAuthGuard('/summer-quest/player-login');
  const [data, setData] = useState<PlayerProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setData(await getPlayerProgress());
    } catch (err) {
      if (!handleApiError(err)) setError('Couldn\u2019t load your progress.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="sq-root sq-page-with-nav sq-progress-page">
      <header className="sq-progress-header">
        <button className="sq-log-back" onClick={() => navigate('/summer-quest/player/dashboard')}>← Back</button>
        <h1>My Progress</h1>
        <p>Your own journey \u2014 not a race against anyone.</p>
      </header>

      {loading && <SqLoadingState label="Adding it all up…" />}
      {error && <SqErrorBanner message={error} onRetry={load} />}

      {data && (
        <>
          <ActivityCard
            icon="⚽" colour="orange" title="Ball Mastery"
            sessions={data.ballMastery.sessionsCompleted}
            minutes={data.ballMastery.minutesTotal}
            thisWeek={data.ballMastery.sessionsThisWeek}
            badgeProgress={data.ballMastery.badgeProgress}
            badgeName="Ball Mastery Builder"
          />

          <ActivityCard
            icon="🎯" colour="blue" title="Passing"
            sessions={data.passing.sessionsCompleted}
            minutes={data.passing.minutesTotal}
            thisWeek={data.passing.sessionsThisWeek}
            badgeProgress={data.passing.badgeProgress}
            badgeName="Passing Pro"
          />

          <ActivityCard
            icon="⚡" colour="green" title="Speed Work"
            sessions={data.speedWork.sessionsCompleted}
            minutes={data.speedWork.minutesTotal}
            thisWeek={data.speedWork.sessionsThisWeek}
            badgeProgress={data.speedWork.badgeProgress}
            badgeName="Speed Star"
          >
            {data.speedWork.sprint10m.history.length > 0 && (
              <div className="sq-progress-extra">
                <span className="sq-progress-extra-label">10m sprint</span>
                <span className="sq-progress-extra-value">
                  {Number(data.speedWork.sprint10m.history[data.speedWork.sprint10m.history.length - 1].value).toFixed(2)}s
                </span>
                {data.speedWork.sprint10m.improvement && data.speedWork.sprint10m.improvement.improvedBy > 0 && (
                  <span className="sq-progress-improved">
                    ↓ {data.speedWork.sprint10m.improvement.improvedBy.toFixed(2)}s faster since Week 1!
                  </span>
                )}
              </div>
            )}
          </ActivityCard>

          <ActivityCard
            icon="✨" colour="purple" title="Juggling"
            sessions={data.juggling.sessionsCompleted}
            minutes={data.juggling.minutesTotal}
            thisWeek={data.juggling.sessionsThisWeek}
            badgeProgress={data.juggling.badgeProgress}
            badgeName="Keepy-Uppy Queen"
          >
            {data.juggling.keepyUppy.bestScore !== null && (
              <div className="sq-progress-extra">
                <span className="sq-progress-extra-label">Best keepy-uppy</span>
                <span className="sq-progress-extra-value">{data.juggling.keepyUppy.bestScore}</span>
                <span className="sq-progress-pb">Personal best 🌟</span>
              </div>
            )}
          </ActivityCard>
        </>
      )}

      <SqBottomNav />
    </div>
  );
}

interface ActivityCardProps {
  icon: string;
  colour: string;
  title: string;
  sessions: number;
  minutes: number;
  thisWeek: number;
  badgeProgress: { current: number; target: number };
  badgeName: string;
  children?: React.ReactNode;
}

function ActivityCard({ icon, colour, title, sessions, minutes, thisWeek, badgeProgress, badgeName, children }: ActivityCardProps) {
  const badgeRatio = badgeProgress.target > 0 ? badgeProgress.current / badgeProgress.target : 0;
  const badgeUnlocked = badgeProgress.current >= badgeProgress.target;

  return (
    <SqCard className="sq-progress-card" style={{ borderLeft: `6px solid var(--sq-${colour})` }}>
      <div className="sq-progress-card-top">
        <span className="sq-progress-icon">{icon}</span>
        <div className="sq-progress-card-stats">
          <h3>{title}</h3>
          <p>{sessions} session{sessions === 1 ? '' : 's'} completed{minutes > 0 ? ` \u00b7 ${minutes} min` : ''}</p>
        </div>
        <SqProgressRing
          size={56}
          strokeWidth={6}
          progress={Math.min(1, badgeRatio)}
          colour={`var(--sq-${colour})`}
          label={badgeUnlocked ? '🏅' : `${badgeProgress.current}/${badgeProgress.target}`}
        />
      </div>
      <p className="sq-progress-week-note">{thisWeek} this week</p>
      {children}
      <p className="sq-progress-badge-caption">
        {badgeUnlocked ? `${badgeName} unlocked!` : `${badgeProgress.target - badgeProgress.current} more for ${badgeName}`}
      </p>
    </SqCard>
  );
}

export const SQ_PROGRESS_PAGE_CSS = `
.sq-progress-page { padding: 16px 16px 0; max-width: 480px; margin: 0 auto; }
.sq-progress-header { margin-bottom: 16px; }
.sq-progress-header h1 { font-size: 22px; font-weight: 800; margin: 0; }
.sq-progress-header p { font-size: 13px; color: var(--sq-grey); margin: 4px 0 0; }

.sq-progress-card { margin-bottom: 14px; }
.sq-progress-card-top { display: flex; align-items: center; gap: 12px; }
.sq-progress-icon { font-size: 24px; }
.sq-progress-card-stats { flex: 1; }
.sq-progress-card-stats h3 { margin: 0; font-size: 16px; font-weight: 800; }
.sq-progress-card-stats p { margin: 2px 0 0; font-size: 13px; color: var(--sq-grey); }
.sq-progress-week-note { font-size: 12px; color: var(--sq-grey); margin: 8px 0 0; }

.sq-progress-extra {
  margin-top: 12px;
  background: var(--sq-cream);
  border-radius: 12px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.sq-progress-extra-label { font-size: 11px; font-weight: 700; color: var(--sq-grey); text-transform: uppercase; }
.sq-progress-extra-value { font-size: 20px; font-weight: 800; color: var(--sq-black); }
.sq-progress-improved { font-size: 12px; font-weight: 700; color: var(--sq-green); }
.sq-progress-pb { font-size: 12px; font-weight: 700; color: var(--sq-gold); }

.sq-progress-badge-caption { font-size: 12px; color: var(--sq-orange-dark); font-weight: 700; margin: 10px 0 0; }
`;
