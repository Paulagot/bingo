// src/components/puzzles/pages/PuzzleAuthPage.tsx
// Handles the magic link callback — /puzzle-auth?token=...&challengeId=...

import  { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supporterAuthService } from '../services/SupporterAuthService';

type Status = 'verifying' | 'success' | 'error';

export default function PuzzleAuthPage() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();

  const [status, setStatus]   = useState<Status>('verifying');
  const [error, setError]     = useState<string | null>(null);
  const [name, setName]       = useState<string>('');

  const token       = searchParams.get('token');
  const challengeId = searchParams.get('challengeId');

  useEffect(() => {
    if (!token) {
      setError('No token found in this link. Please request a new one.');
      setStatus('error');
      return;
    }

    supporterAuthService.verifyToken(token)
      .then(result => {
        setName(result.supporter.name);
        setStatus('success');

        // Redirect after short delay so user sees the success state
        setTimeout(() => {
          if (challengeId) {
            navigate(`/challenges/${challengeId}/play`);
          } else {
            navigate('/my-challenges');
          }
        }, 1500);
      })
      .catch(err => {
        setError((err as Error).message);
        setStatus('error');
      });
  }, [token, challengeId, navigate]);

  if (status === 'verifying') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 rounded-full border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Verifying your link…</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Link problem</h1>
          <p className="text-gray-500 text-sm mb-6">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Request a new link
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          You're in{name ? `, ${name.split(' ')[0]}` : ''}!
        </h1>
        <p className="text-gray-500 text-sm">Taking you to your puzzles…</p>
        <div className="mt-4">
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-600 rounded-full animate-[grow_1.5s_ease-in-out_forwards]" />
          </div>
        </div>
      </div>
    </div>
  );
}