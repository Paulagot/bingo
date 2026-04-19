// src/components/puzzles/pages/PlayerChallengePage.tsx

import{ useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  supporterAuthService,
  type PublicChallenge,
  type ScheduleRow,
} from '../services/SupporterAuthService';

interface WeekState {
  weekNumber: number;
  puzzleType: string;
  difficulty: string;
  unlocksAt:  Date | null;
  status:     'locked' | 'available' | 'completed';
}

const PUZZLE_TYPE_LABELS: Record<string, string> = {
  anagram:           'Anagram',
  sequenceOrdering:  'Sequence Ordering',
  matchPairs:        'Match Pairs',
  wordSearch:        'Word Search',
  slidingTile:       'Sliding Tile',
  sudoku:            'Sudoku',
  patternCompletion: 'Pattern Completion',
  wordLadder:        'Word Ladder',
  cryptogram:        'Cryptogram',
  numberPath:        'Number Path',
  towersOfHanoi:     'Towers of Hanoi',
  nonogram:          'Nonogram',
  memoryPairs:       'Memory Pairs',
};

export default function PlayerChallengePage() {
  const { challengeId } = useParams<{ challengeId: string }>();
  const navigate = useNavigate();

  const [challenge, setChallenge] = useState<PublicChallenge | null>(null);
  const [weeks, setWeeks]         = useState<WeekState[]>([]);
  const [enrolled, setEnrolled]   = useState<boolean | null>(null);
  const [loading, setLoading]     = useState(true);
  const [joining, setJoining]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const isAuth = supporterAuthService.isAuthenticated();

  useEffect(() => {
    if (!challengeId) return;

    async function load() {
      try {
        // Always load public challenge data first — no auth needed
        const data = await supporterAuthService.getPublicChallenge(challengeId!);
        setChallenge(data);

        if (isAuth) {
          // Use supporter-facing endpoints only — no club token needed
          const [scheduleData, enrollmentData] = await Promise.all([
            supporterAuthService.getSchedule(challengeId!).catch(() => [] as ScheduleRow[]),
            supporterAuthService.getEnrollmentStatus(challengeId!).catch(() => null),
          ]);

          setEnrolled(enrollmentData?.enrolled ?? false);

          if (scheduleData.length) {
            const now = new Date();
            setWeeks(scheduleData.map(row => ({
              weekNumber: row.week_number,
              puzzleType: row.puzzle_type,
              difficulty: row.difficulty,
              unlocksAt:  row.unlocks_at ? new Date(row.unlocks_at) : null,
              status:     !row.unlocks_at || new Date(row.unlocks_at) <= now
                            ? 'available'
                            : 'locked',
            })));
          }
        }
      } catch (err) {
        setError('Could not load this challenge.');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [challengeId, isAuth]);

  async function handleJoinFree() {
    if (!challengeId) return;

    // Not logged in — go to join page to collect email
    if (!isAuth) {
      navigate(`/join/puzzle/challenge/${challengeId}`);
      return;
    }

    setJoining(true);
    try {
      await supporterAuthService.joinFree(challengeId);
      setEnrolled(true);

      // Load schedule now that they're enrolled
      const scheduleData = await supporterAuthService.getSchedule(challengeId);
      const now = new Date();
      setWeeks(scheduleData.map(row => ({
        weekNumber: row.week_number,
        puzzleType: row.puzzle_type,
        difficulty: row.difficulty,
        unlocksAt:  row.unlocks_at ? new Date(row.unlocks_at) : null,
        status:     !row.unlocks_at || new Date(row.unlocks_at) <= now
                      ? 'available'
                      : 'locked',
      })));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setJoining(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin h-8 w-8 rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  if (error || !challenge) {
    return (
      <div className="p-8 text-rose-600 text-center">
        {error ?? 'Challenge not found'}
      </div>
    );
  }

  const CURRENCY_SYMBOLS: Record<string, string> = {
    eur: '€', gbp: '£', usd: '$',
  };
  const symbol       = CURRENCY_SYMBOLS[challenge.currency] ?? '€';
  const weeklyAmount = challenge.weekly_price
    ? `${symbol}${(challenge.weekly_price / 100).toFixed(2)}/week`
    : null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">

      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white mb-6">
        <div className="text-3xl mb-2">🧩</div>
        <h1 className="text-2xl font-bold mb-1">{challenge.title}</h1>
        {challenge.description && (
          <p className="text-indigo-200 text-sm mb-3">{challenge.description}</p>
        )}
        <div className="flex gap-4 text-sm text-indigo-200">
          <span>{challenge.total_weeks} weeks</span>
          <span>Starts {new Date(challenge.starts_at).toLocaleDateString()}</span>
          <span>{challenge.is_free === 1 ? '🆓 Free' : weeklyAmount}</span>
        </div>
      </div>

      {/* Not enrolled */}
      {!enrolled && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center mb-6">
          <p className="text-gray-600 mb-4">
            {isAuth
              ? 'You are not enrolled in this challenge yet.'
              : 'Join this challenge to start playing.'}
          </p>

          {challenge.is_free === 1 ? (
            <button
              onClick={handleJoinFree}
              disabled={joining}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {joining ? 'Joining…' : 'Join Free →'}
            </button>
          ) : (
            <button
              onClick={() => navigate(`/join/puzzle/challenge/${challengeId}`)}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 transition-colors"
            >
              Join Challenge →
            </button>
          )}
        </div>
      )}

      {/* Week list — only shown when enrolled */}
      {enrolled && (
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-800 mb-2">Your Weeks</h2>
          {weeks.length === 0 ? (
            <p className="text-sm text-gray-400">Schedule not available yet.</p>
          ) : (
            weeks.map(week => (
              <WeekCard
                key={week.weekNumber}
                week={week}
                onPlay={() => navigate(`/challenges/${challengeId}/puzzle/${week.weekNumber}`)}
              />
            ))
          )}
        </div>
      )}

      {/* Not authenticated nudge */}
      {!isAuth && (
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-400">
            Already joined?{' '}
            <button
              onClick={() => navigate('/puzzle-login', {
                state: { challengeId, clubId: challenge.club_id }
              })}
              className="text-indigo-600 underline"
            >
              Sign in with magic link
            </button>
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Week card ────────────────────────────────────────────────────────────────

function WeekCard({
  week,
  onPlay,
}: {
  week: WeekState;
  onPlay: () => void;
}) {
  const isLocked    = week.status === 'locked';
  const isCompleted = week.status === 'completed';
  const isAvailable = week.status === 'available';

  return (
    <div className={`bg-white rounded-xl border p-4 flex items-center gap-4 ${
      isLocked    ? 'border-gray-200 opacity-60' :
      isCompleted ? 'border-green-200'           :
                    'border-indigo-200'
    }`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-lg ${
        isLocked    ? 'bg-gray-100'  :
        isCompleted ? 'bg-green-100' :
                      'bg-indigo-100'
      }`}>
        {isLocked ? '🔒' : isCompleted ? '✅' : '🧩'}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 text-sm">Week {week.weekNumber}</p>
        <p className="text-xs text-gray-400">
          {PUZZLE_TYPE_LABELS[week.puzzleType] ?? week.puzzleType}
          {' · '}
          <span className="capitalize">{week.difficulty}</span>
        </p>
        {isLocked && week.unlocksAt && (
          <p className="text-xs text-gray-400 mt-0.5">
            Unlocks {week.unlocksAt.toLocaleDateString()}
          </p>
        )}
      </div>

      {isAvailable && (
        <button
          onClick={onPlay}
          className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors flex-shrink-0"
        >
          Play →
        </button>
      )}
      {isCompleted && (
        <span className="text-xs text-green-600 font-medium flex-shrink-0">Done</span>
      )}
      {isLocked && (
        <span className="text-xs text-gray-400 flex-shrink-0">Locked</span>
      )}
    </div>
  );
}