// src/components/puzzles/pages/ChallengeLeaderboardPage.tsx

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  challengeService,
  type Challenge,
  type LeaderboardEntry,
} from '../services/ChallengeService';

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

const RANK_STYLES: Record<number, string> = {
  1: 'bg-yellow-100 text-yellow-700',
  2: 'bg-gray-200 text-gray-700',
  3: 'bg-orange-100 text-orange-700',
};

export default function ChallengeLeaderboardPage() {
  const { challengeId } = useParams<{ challengeId: string }>();
  const navigate = useNavigate();

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [entries, setEntries]     = useState<LeaderboardEntry[]>([]);
  const [expanded, setExpanded]   = useState<number | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    if (!challengeId) return;
    Promise.all([
      challengeService.getChallenge(challengeId),
      challengeService.getLeaderboard(challengeId),
    ])
      .then(([c, lb]) => {
        setChallenge(c);
        setEntries(lb);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [challengeId]);

  function toggleExpand(playerId: number) {
    setExpanded(prev => (prev === playerId ? null : playerId));
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin h-8 w-8 rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  if (error) {
    return <div className="p-8 text-rose-600">{error}</div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate(`/challenges/${challengeId}`)}
        className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1"
      >
        ← Back to challenge
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-1">Leaderboard</h1>
      {challenge && (
        <p className="text-sm text-gray-500 mb-6">{challenge.title}</p>
      )}

      {entries.length === 0 ? (
        <p className="text-gray-400 text-center py-12">No submissions yet.</p>
      ) : (
        <div className="space-y-2">
          {entries.map(entry => (
            <div
              key={entry.playerId}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              {/* Player summary row */}
              <button
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left"
                onClick={() => toggleExpand(entry.playerId)}
              >
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                  RANK_STYLES[entry.rank] ?? 'bg-gray-100 text-gray-500'
                }`}>
                  {entry.rank}
                </span>
                <span className="flex-1 font-medium text-gray-900">
                  {entry.playerName}
                </span>
                <span className="text-sm text-gray-400">
                  {entry.weeksCompleted} week{entry.weeksCompleted !== 1 ? 's' : ''}
                </span>
                <span className="text-lg font-bold text-indigo-600 w-16 text-right">
                  {entry.totalScore}
                </span>
                <span className="text-gray-400 text-xs ml-1">
                  {expanded === entry.playerId ? '▲' : '▼'}
                </span>
              </button>

              {/* Week breakdown — visible when expanded */}
              {expanded === entry.playerId && (
                <div className="border-t border-gray-100 divide-y divide-gray-50">
                  {entry.weeks.length === 0 ? (
                    <p className="px-5 py-3 text-sm text-gray-400">No week data yet.</p>
                  ) : (
                    entry.weeks.map(w => (
                      <div
                        key={w.weekNumber}
                        className="px-5 py-3 grid grid-cols-[64px_1fr_88px] gap-4 items-start text-sm"
                      >
                        <span className="text-gray-500 font-medium pt-0.5">
                          Week {w.weekNumber}
                        </span>

                        <div className="space-y-1.5">
                          <p className="text-xs text-gray-400">
                            {PUZZLE_TYPE_LABELS[w.puzzleType] ?? w.puzzleType}
                          </p>
                          <AnswerReveal
                            playerAnswer={w.playerAnswer}
                            correctAnswer={w.correctAnswer}
                            isCorrect={w.isCorrect}
                          />
                        </div>

                        <div className="text-right space-y-1">
                          <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                            w.isCorrect
                              ? 'bg-green-50 text-green-700'
                              : 'bg-red-50 text-red-600'
                          }`}>
                            {w.isCorrect ? '✓ Correct' : '✗ Wrong'}
                          </span>
                          <p className="text-sm font-semibold text-indigo-600">
                            {w.totalScore} pts
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Answer reveal sub-component ─────────────────────────────────────────────

function AnswerReveal({
  playerAnswer,
  correctAnswer,
  isCorrect,
}: {
  playerAnswer: Record<string, unknown> | null;
  correctAnswer: Record<string, unknown> | null;
  isCorrect: boolean;
}) {
  const player  = extractReadableAnswer(playerAnswer);
  const correct = extractReadableAnswer(correctAnswer);

  return (
    <div className="space-y-1">
      <p className="text-xs">
        <span className="text-gray-400">Player: </span>
        <span className="text-gray-700 font-medium">{player}</span>
      </p>
      {!isCorrect && correct && (
        <p className="text-xs">
          <span className="text-gray-400">Correct: </span>
          <span className="text-green-700 font-medium">{correct}</span>
        </p>
      )}
    </div>
  );
}

function extractReadableAnswer(obj: Record<string, unknown> | null): string {
  if (!obj) return '—';
  // Try common answer field names in priority order
  const priorityKeys = [
    'answer', 'decoded', 'selectedOption',
    'orderedIds', 'steps', 'matches', 'foundWords', 'grid',
  ];
  for (const key of priorityKeys) {
    if (key in obj) {
      const v = obj[key];
      if (typeof v === 'string') return v;
      if (Array.isArray(v)) {
        return `[${v.slice(0, 4).join(', ')}${v.length > 4 ? '…' : ''}]`;
      }
      return JSON.stringify(v).slice(0, 60);
    }
  }
  return JSON.stringify(obj).slice(0, 60);
}