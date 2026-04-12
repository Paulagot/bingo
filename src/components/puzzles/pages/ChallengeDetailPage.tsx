// src/components/puzzles/pages/ChallengeDetailPage.tsx

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { challengeService, type Challenge, type EnrolledPlayer } from '../services/ChallengeService';

const STATUS_BADGE: Record<string, string> = {
  draft:     'bg-gray-100 text-gray-600',
  active:    'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-600',
};
const CURRENCIES = [
  { value: 'eur', symbol: '€' },
  { value: 'gbp', symbol: '£' },
  { value: 'usd', symbol: '$' },
];

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

export default function ChallengeDetailPage() {
  const { challengeId } = useParams<{ challengeId: string }>();
  const navigate = useNavigate();

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [players, setPlayers]     = useState<EnrolledPlayer[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    if (!challengeId) return;
    Promise.all([
      challengeService.getChallenge(challengeId),
      challengeService.getPlayers(challengeId),
    ])
      .then(([c, p]) => {
        setChallenge(c);
        setPlayers(p);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [challengeId]);

  async function handleStatusChange(status: Challenge['status']) {
    if (!challengeId) return;
    try {
      const updated = await challengeService.updateStatus(challengeId, status);
      setChallenge(updated);
    } catch (err) {
      alert((err as Error).message);
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
    return <div className="p-8 text-rose-600">{error ?? 'Challenge not found'}</div>;
  }

  const now = new Date();

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/challenges')}
          className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1"
        >
          ← All challenges
        </button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{challenge.title}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[challenge.status]}`}>
                {challenge.status}
              </span>
            </div>
            {challenge.description && (
              <p className="text-gray-500 text-sm">{challenge.description}</p>
            )}
            <p className="text-sm text-gray-400 mt-1">
              {challenge.total_weeks} weeks · Starts {new Date(challenge.starts_at).toLocaleDateString()}
            </p>
          
<p className="text-sm text-gray-400 mt-0.5">
  {challenge.is_free
    ? '🆓 Free challenge'
    : `${CURRENCIES.find(c => c.value === challenge.currency)?.symbol ?? ''}${((challenge.weekly_price ?? 0) / 100).toFixed(2)}/week · ${challenge.currency.toUpperCase()}`
  }
</p>

          </div>

          

          <div className="flex gap-2 flex-shrink-0">
            {challenge.status === 'draft' && (
              <button
                onClick={() => handleStatusChange('active')}
                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Activate
              </button>
            )}
            {challenge.status === 'active' && (
              <button
                onClick={() => handleStatusChange('completed')}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Mark Complete
              </button>
            )}
            <button
              onClick={() => navigate(`/challenges/${challengeId}/leaderboard`)}
              className="px-3 py-1.5 text-sm border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Leaderboard
            </button>
          </div>
        </div>
      </div>

      {/* Week schedule */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Week Schedule</h2>
        <div className="space-y-0">
          {(challenge.schedule ?? []).map(row => {
            const unlocksAt  = row.unlocks_at ? new Date(row.unlocks_at) : null;
            const isUnlocked = !unlocksAt || unlocksAt <= now;
            return (
              <div
                key={row.week_number}
                className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0"
              >
                <span className="w-16 text-sm font-medium text-gray-500">
                  Week {row.week_number}
                </span>
                <span className="flex-1 text-sm text-gray-800">
                  {PUZZLE_TYPE_LABELS[row.puzzle_type] ?? row.puzzle_type}
                </span>
                <span className="text-xs text-gray-400 capitalize w-14">{row.difficulty}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  isUnlocked
                    ? 'bg-green-50 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {isUnlocked ? 'Unlocked' : `Unlocks ${unlocksAt?.toLocaleDateString()}`}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Players */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">
          Players ({players.length})
        </h2>
        {players.length === 0 ? (
          <p className="text-sm text-gray-400">No players enrolled yet.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {players.map(p => (
              <div key={p.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-800">{p.name}</span>
                  <span className="text-xs text-gray-400 ml-2">{p.email}</span>
                </div>
                <span className="text-xs text-gray-400">
                  Joined {new Date(p.enrolled_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}