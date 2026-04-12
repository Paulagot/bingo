// src/components/puzzles/pages/ChallengeDashboardPage.tsx

import{ useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { challengeService, type Challenge } from '../services/ChallengeService';

const STATUS_BADGE: Record<string, string> = {
  draft:     'bg-gray-100 text-gray-600',
  active:    'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-600',
};

export default function ChallengeDashboardPage() {
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => {
    challengeService.listChallenges()
      .then(setChallenges)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleActivate(id: string) {
    try {
      const updated = await challengeService.updateStatus(id, 'active');
      setChallenges(prev => prev.map(c => (c.id === id ? updated : c)));
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

  if (error) {
    return <div className="p-8 text-rose-600">{error}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Puzzle Challenges</h1>
        <button
          onClick={() => navigate('/challenges/create')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          + New Challenge
        </button>
      </div>

      {challenges.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg mb-2">No challenges yet.</p>
          <p className="text-sm">Create your first weekly puzzle challenge to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {challenges.map(c => (
            <div
              key={c.id}
              className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between hover:border-indigo-300 transition-colors cursor-pointer"
              onClick={() => navigate(`/challenges/${c.id}`)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="font-semibold text-gray-900 truncate">{c.title}</h2>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[c.status] ?? ''}`}>
                    {c.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  {c.total_weeks} weeks · Starts {new Date(c.starts_at).toLocaleDateString()} · {c.player_count ?? 0} players
                </p>
              </div>

              <div
                className="flex items-center gap-2 ml-4"
                onClick={e => e.stopPropagation()}
              >
                {c.status === 'draft' && (
                  <button
                    onClick={() => handleActivate(c.id)}
                    className="px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    Activate
                  </button>
                )}
                <button
                  onClick={() => navigate(`/challenges/${c.id}`)}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  View →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}