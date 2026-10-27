// src/components/puzzles/pages/PlayerOverallLeaderboardPage.tsx
//
// Authenticated cumulative player standings for Puzzle Subscription.
// Wording updated so it is clearly the overall leaderboard.

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import {
  supporterAuthService,
  type PublicChallenge,
  type SupporterLeaderboardEntry,
} from '../services/SupporterAuthService';

import PuzzlePageShell from '../ui/PuzzlePageShell';
import { resolvePuzzleTheme } from '../ui/puzzleTheme';
import { formatDuration } from '../utils/formatDuration';
import { getPuzzleTypeLabel } from '../ui/PuzzleTypePreview';

export default function PlayerOverallLeaderboardPage() {
  const { challengeId } = useParams<{ challengeId: string }>();
  const navigate = useNavigate();

  const [challenge, setChallenge] = useState<PublicChallenge | null>(null);
  const [entries, setEntries] = useState<SupporterLeaderboardEntry[]>([]);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const theme = useMemo(() => resolvePuzzleTheme(challenge), [challenge]);

  useEffect(() => {
    if (!challengeId) {
      setPageError('Challenge not found.');
      setLoading(false);
      return;
    }

    if (!supporterAuthService.isAuthenticated()) {
      navigate('/puzzle-login', { state: { challengeId } });
      return;
    }

    const currentChallengeId = challengeId;

    async function load() {
      setLoading(true);
      setPageError(null);

      try {
        const [challengeData, leaderboardData, profile] = await Promise.all([
          supporterAuthService.getPublicChallenge(currentChallengeId),
          supporterAuthService.getOverallLeaderboard(currentChallengeId),
          supporterAuthService.getMe().catch(() => null),
        ]);

        setChallenge(challengeData);
        setEntries(leaderboardData);
        setMyPlayerId(profile?.id ?? null);
      } catch (err) {
        setPageError((err as Error).message ?? 'Could not load the leaderboard.');
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [challengeId, navigate]);

  function toggleExpand(playerId: number) {
    setExpanded(prev => (prev === playerId ? null : playerId));
  }

  const resolvedChallengeId = challengeId ?? challenge?.id ?? '';
  const myEntry = useMemo(
    () => entries.find(entry => myPlayerId != null && String(entry.playerId) === myPlayerId) ?? null,
    [entries, myPlayerId]
  );

  const topThree = entries.slice(0, 3);
  const remaining = entries.slice(3);

  if (loading) {
    return (
      <PuzzlePageShell theme={theme} clubName={challenge?.club_name}>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#D8D1C4] border-t-[var(--puzzle-primary)]" />
        </div>
      </PuzzlePageShell>
    );
  }

  if (pageError || !challenge) {
    return (
      <PuzzlePageShell theme={theme}>
        <div className="mx-auto max-w-xl rounded-[28px] border border-rose-200 bg-white p-8 text-center shadow-sm">
          <h1 className="font-serif text-3xl text-[#071A44]">Overall leaderboard unavailable</h1>
          <p className="mt-3 text-sm text-[#6E6A63]">{pageError ?? 'Could not load your standing for this challenge.'}</p>
          <Link
            to={`/challenges/${resolvedChallengeId}/play`}
            className="mt-6 inline-flex items-center justify-center rounded-full border border-[#D8D1C4] bg-white px-6 py-3 text-sm font-semibold text-[#071A44]"
          >
            Back to my puzzles
          </Link>
        </div>
      </PuzzlePageShell>
    );
  }

  return (
    <PuzzlePageShell
      theme={theme}
      clubName={challenge.club_name}
      rightHeaderContent={
        <div className="hidden items-center gap-2 sm:flex">
          <Link
            to={`/challenges/${resolvedChallengeId}/play`}
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#D8D1C4] bg-white px-4 py-2 text-xs font-bold text-[#071A44] shadow-sm"
          >
            My puzzles
          </Link>

          <Link
            to={`/leaderboards/${resolvedChallengeId}`}
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#D8D1C4] bg-white px-4 py-2 text-xs font-bold text-[#071A44] shadow-sm"
          >
            Weekly Wall of Fame
          </Link>
        </div>
      }
    >
      <div className="mx-auto w-full min-w-0 max-w-5xl overflow-x-hidden">
        <section className="rounded-[28px] border border-[#E8E0D3] bg-white p-5 shadow-sm sm:p-7">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#E36B2C] sm:text-xs">Overall leaderboard</p>
          <h1 className="mt-2 break-words font-serif text-[2.4rem] leading-[1] text-[#071A44] sm:text-5xl">{challenge.title}</h1>
          <p className="mt-3 max-w-2xl break-words text-sm leading-6 text-[#5F5A54] sm:text-base">
            Your cumulative score across every puzzle you’ve played.
          </p>

          {myEntry ? (
            <div className="mt-6 grid min-w-0 gap-3 sm:grid-cols-3">
              <StandingStat label="Overall rank" value={`#${myEntry.rank}`} />
              <StandingStat label="Total score" value={`${myEntry.totalScore}`} />
              <StandingStat label="Puzzles completed" value={`${myEntry.weeksCompleted}`} />
            </div>
          ) : null}
        </section>

        {entries.length === 0 ? (
          <section className="mt-5 rounded-[28px] border border-dashed border-[#D8D1C4] bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--puzzle-bg-accent)] text-[var(--puzzle-primary)]">
              <TrophyIcon className="h-7 w-7" />
            </div>
            <h2 className="mt-4 font-serif text-3xl text-[#071A44]">No scores yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-[#6E6A63]">Standings appear once players begin submitting puzzles.</p>
          </section>
        ) : (
          <>
            <section className="mt-5 rounded-[28px] border border-[#E8E0D3] bg-white p-5 shadow-sm sm:p-7">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8A847B] sm:text-xs">Overall leaderboard</p>
              <h2 className="mt-1 font-serif text-3xl text-[#071A44]">Top players</h2>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {topThree.map(entry => (
                  <OverallPodiumCard key={entry.playerId} entry={entry} isMe={myPlayerId != null && String(entry.playerId) === myPlayerId} />
                ))}
              </div>
            </section>

            {remaining.length > 0 ? (
              <section className="mt-5 rounded-[28px] border border-[#E8E0D3] bg-white p-4 shadow-sm sm:p-6">
                <div className="mb-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8A847B] sm:text-xs">Full standings</p>
                  <h2 className="mt-1 font-serif text-2xl text-[#071A44]">Everyone else</h2>
                </div>

                <div className="space-y-2">
                  {remaining.map(entry => {
                    const isMe = myPlayerId != null && String(entry.playerId) === myPlayerId;
                    return (
                      <PlayerLeaderboardRow
                        key={entry.playerId}
                        entry={entry}
                        isMe={isMe}
                        expanded={expanded === entry.playerId}
                        onToggle={() => toggleExpand(entry.playerId)}
                      />
                    );
                  })}
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </PuzzlePageShell>
  );
}

function StandingStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-[#E8E0D3] bg-[#FBF8F3] px-4 py-4">
      <p className="text-[9px] font-black uppercase tracking-wide text-[#8A847B]">{label}</p>
      <p className="mt-1 font-serif text-3xl text-[#071A44]">{value}</p>
    </div>
  );
}

function OverallPodiumCard({ entry, isMe }: { entry: SupporterLeaderboardEntry; isMe: boolean }) {
  const rankStyle = entry.rank === 1 ? 'bg-[#FFF2D9] border-[#F3D79B]' : entry.rank === 2 ? 'bg-[#EEF3FB] border-[#D6E2F2]' : 'bg-[#FBEFDF] border-[#EFCFAE]';

  return (
    <article className={`min-w-0 rounded-[24px] border p-4 ${rankStyle} ${isMe ? 'ring-2 ring-[var(--puzzle-primary)] ring-offset-2' : ''}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-base font-black text-[#071A44] shadow-sm">#{entry.rank}</div>
        {isMe ? <span className="rounded-full bg-[var(--puzzle-primary)] px-2.5 py-1 text-[10px] font-black text-[var(--puzzle-text-on-primary)]">You</span> : <TrophyIcon className="h-5 w-5 text-[#6E6A63]" />}
      </div>

      <h3 className="mt-4 truncate text-base font-black text-[#071A44]">{entry.playerName}</h3>
      <p className="mt-1 text-xs text-[#6E6A63]">{entry.weeksCompleted} puzzle{entry.weeksCompleted !== 1 ? 's' : ''} completed</p>
      <p className="mt-4 font-serif text-3xl text-[#071A44]">{entry.totalScore}</p>
      <p className="text-[9px] font-black uppercase tracking-wide text-[#8A847B]">points</p>
    </article>
  );
}

function PlayerLeaderboardRow({
  entry,
  isMe,
  expanded,
  onToggle,
}: {
  entry: SupporterLeaderboardEntry;
  isMe: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={`overflow-hidden rounded-2xl border ${isMe ? 'border-[var(--puzzle-primary)] bg-[var(--puzzle-bg-accent)]' : 'border-[#E8E0D3] bg-[#FBF8F3]'}`}>
      <button type="button" onClick={onToggle} className="flex w-full min-w-0 items-center justify-between gap-3 px-3 py-3 text-left sm:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-sm font-black text-[#071A44] shadow-sm">{entry.rank}</div>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate text-sm font-bold text-[#071A44]">{entry.playerName}</p>
              {isMe ? <span className="shrink-0 rounded-full bg-[var(--puzzle-primary)] px-2 py-0.5 text-[9px] font-black text-[var(--puzzle-text-on-primary)]">You</span> : null}
            </div>
            <p className="mt-0.5 text-[10px] text-[#6E6A63]">{entry.weeksCompleted} completed</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-[#071A44] shadow-sm">{entry.totalScore} pts</span>
          <span className="text-xs font-black text-[#8A847B]">{expanded ? '−' : '+'}</span>
        </div>
      </button>

      {expanded ? (
        <div className="border-t border-[#E8E0D3] bg-white p-3 sm:p-4">
          {entry.weeks.length === 0 ? (
            <p className="rounded-xl bg-[#FBF8F3] p-4 text-center text-sm text-[#6E6A63]">No week data yet.</p>
          ) : (
            <div className="space-y-2">
              {entry.weeks.map(week => (
                <div key={week.weekNumber} className="grid min-w-0 gap-3 rounded-xl border border-[#E8E0D3] bg-[#FBF8F3] p-3 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="min-w-0">
                    <p className="text-xs font-black text-[#071A44]">Week {week.weekNumber} · {getPuzzleTypeLabel(week.puzzleType)}</p>
                    <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-[#6E6A63]">
                      {week.timeTakenSeconds !== null ? <span>{formatDuration(week.timeTakenSeconds)}</span> : null}
                      {week.submittedAt ? <span>{new Date(week.submittedAt).toLocaleDateString()}</span> : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${week.isCorrect ? 'bg-[#EEF8EF] text-[#2E6A46]' : 'bg-rose-50 text-rose-700'}`}>
                      {week.isCorrect ? 'Solved' : 'Attempted'}
                    </span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-[#071A44] shadow-sm">{week.totalScore} pts</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function TrophyIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M8 4h8v4.4c0 3-1.7 5.1-4 5.1s-4-2.1-4-5.1V4Zm0 2H5v1.5c0 2.1 1.2 3.6 3.2 4M16 6h3v1.5c0 2.1-1.2 3.6-3.2 4M12 13.5V18m-3 2h6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}


