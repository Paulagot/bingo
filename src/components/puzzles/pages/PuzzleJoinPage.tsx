// src/components/puzzles/pages/PuzzleJoinPage.tsx

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supporterAuthService, type PublicChallenge } from '../services/SupporterAuthService';

const CURRENCY_SYMBOLS: Record<string, string> = {
  eur: '€', gbp: '£', usd: '$',
};

export default function PuzzleJoinPage() {
  const { joinCode, challengeId } = useParams<{ joinCode?: string; challengeId?: string }>();
  const navigate = useNavigate();

  const [challenge, setChallenge]   = useState<PublicChallenge | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  // Form state
  const [name, setName]             = useState('');
  const [email, setEmail]           = useState('');
  const [gdprConsent, setGdprConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError]   = useState<string | null>(null);

  // Load challenge details
  useEffect(() => {
    const load = async () => {
      try {
        const data = joinCode
          ? await supporterAuthService.getPublicChallengeByCode(joinCode)
          : await supporterAuthService.getPublicChallenge(challengeId!);
        setChallenge(data);
      } catch (err) {
        setError('Challenge not found or no longer available.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [joinCode, challengeId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!gdprConsent) {
      setFormError('Please agree to the privacy policy to continue.');
      return;
    }

    setSubmitting(true);
    try {
      await supporterAuthService.requestMagicLink({
        email,
        name,
        challengeId: challenge!.id,
        clubId:      challenge!.club_id ?? '',
      });
      // Redirect to check email page
      navigate('/puzzle-check-email', {
        state: { email, challengeId: challenge!.id },
      });
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin h-8 w-8 rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  if (error || !challenge) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4 text-center">
        <p className="text-2xl">😕</p>
        <p className="font-semibold text-gray-800">{error ?? 'Challenge not found'}</p>
      </div>
    );
  }

  const symbol = CURRENCY_SYMBOLS[challenge.currency] ?? '€';
  const weeklyAmount = challenge.weekly_price
    ? `${symbol}${(challenge.weekly_price / 100).toFixed(2)}/week`
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* Challenge card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-8 text-center">
            <div className="text-4xl mb-3">🧩</div>
            <h1 className="text-2xl font-bold text-white mb-1">{challenge.title}</h1>
            <p className="text-indigo-200 text-sm">{challenge.club_name}</p>
          </div>

          <div className="px-6 py-4 border-b border-gray-100">
            {challenge.description && (
              <p className="text-gray-600 text-sm text-center mb-3">{challenge.description}</p>
            )}
            <div className="flex justify-center gap-6 text-sm">
              <div className="text-center">
                <p className="font-semibold text-gray-900">{challenge.total_weeks}</p>
                <p className="text-gray-400 text-xs">weeks</p>
              </div>
              <div className="text-center">
                <p className="font-semibold text-gray-900">
                  {new Date(challenge.starts_at).toLocaleDateString()}
                </p>
                <p className="text-gray-400 text-xs">starts</p>
              </div>
              <div className="text-center">
                <p className="font-semibold text-gray-900">
                  {challenge.is_free ? 'Free' : weeklyAmount}
                </p>
                <p className="text-gray-400 text-xs">
                  {challenge.is_free ? '' : 'per week'}
                </p>
              </div>
            </div>
          </div>

          {/* Join form */}
          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
            <h2 className="font-semibold text-gray-800 text-center">
              {challenge.is_free ? 'Join for free' : 'Join this challenge'}
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your name *
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                placeholder="First and last name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email address *
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                We'll send a magic link to this address — no password needed.
              </p>
            </div>

            {/* GDPR consent */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={gdprConsent}
                onChange={e => setGdprConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs text-gray-500 leading-relaxed">
                I agree to the{' '}
                <a href="/legal/privacy" target="_blank" className="text-indigo-600 underline">
                  Privacy Policy
                </a>{' '}
                and consent to receiving puzzle access emails from{' '}
                <strong>{challenge.club_name}</strong>.
              </span>
            </label>

            {formError && (
              <p className="text-sm text-rose-600">{formError}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Sending link…' : 'Send my access link →'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400">
          Already have an account?{' '}
          <button
            onClick={() => navigate('/puzzle-login', {
              state: { challengeId: challenge.id, clubId: challenge.club_id }
            })}
            className="text-indigo-600 underline"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}