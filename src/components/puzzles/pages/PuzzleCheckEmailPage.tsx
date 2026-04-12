// src/components/puzzles/pages/PuzzleCheckEmailPage.tsx

import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supporterAuthService } from '../services/SupporterAuthService';

export default function PuzzleCheckEmailPage() {
  const location = useLocation();
  const navigate  = useNavigate();
  const { email, challengeId, clubId } = (location.state ?? {}) as {
    email?: string;
    challengeId?: string;
    clubId?: string;
  };

  const [resending, setResending]   = useState(false);
  const [resent, setResent]         = useState(false);
  const [cooldown, setCooldown]     = useState(false);

  async function handleResend() {
    if (!email || !clubId || cooldown) return;
    setResending(true);
    try {
      await supporterAuthService.requestMagicLink({ email, challengeId, clubId });
      setResent(true);
      setCooldown(true);
      // 60 second cooldown before they can resend again
      setTimeout(() => setCooldown(false), 60_000);
    } catch {
      // Fail silently — don't expose whether email exists
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 text-center">

        <div className="text-5xl mb-4">📧</div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h1>

        <p className="text-gray-500 text-sm mb-2">
          We sent a magic link to
        </p>
        {email && (
          <p className="font-semibold text-indigo-600 mb-6">{email}</p>
        )}

        <p className="text-gray-400 text-sm mb-8 leading-relaxed">
          Click the link in the email to access your puzzles.
          The link expires in <strong>15 minutes</strong>.
        </p>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-left">
          <p className="text-xs text-amber-800">
            <strong>Can't find it?</strong> Check your spam or junk folder.
            The email comes from FundRaisely with subject line
            "Your puzzle access link".
          </p>
        </div>

        {resent ? (
          <p className="text-sm text-green-600 font-medium mb-4">
            ✓ New link sent — check your inbox.
          </p>
        ) : (
          <button
            onClick={handleResend}
            disabled={resending || cooldown}
            className="text-sm text-indigo-600 underline disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed"
          >
            {resending ? 'Sending…' : cooldown ? 'Resend available in 60s' : 'Resend the link'}
          </button>
        )}

        <div className="mt-6 pt-6 border-t border-gray-100">
          <button
            onClick={() => navigate(-1)}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            ← Go back
          </button>
        </div>
      </div>
    </div>
  );
}