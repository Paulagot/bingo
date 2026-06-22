import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { SqButton } from '../components/shared/SqButton';
import { SqCard, SqInput } from '../components/shared/SqFormPrimitives';
import { loginPlayer } from '../api/sqAuthApi';
import { SummerQuestApiError } from '../api/sqApiClient';

// Spec section 6.3 — simple, no email, kid-friendly. Big tap targets,
// short copy, friendly error tone ("check your code with a parent" not
// "authentication failed").

export default function PlayerLoginPage() {
  const navigate = useNavigate();
  const [teamCode, setTeamCode] = useState('TT2026');
  const [displayName, setDisplayName] = useState('');
  const [playerCode, setPlayerCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await loginPlayer(teamCode.trim().toUpperCase(), displayName.trim(), playerCode.trim().toUpperCase());
      navigate('/summer-quest/player/dashboard');
    } catch (err) {
      if (err instanceof SummerQuestApiError) {
        setError('That didn\u2019t match. Check your name and code with a parent, then try again.');
      } else {
        setError('Something went wrong. Try again in a moment.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sq-root sq-auth-page">
      <SqCard className="sq-auth-card">
        <span className="sq-auth-icon">⚽</span>
        <h1 className="sq-auth-title">Ready to play?</h1>
        <p className="sq-auth-subtitle">Enter your team code, your name, and your player code.</p>

        <form onSubmit={handleSubmit}>
          <SqInput
            label="Team code"
            value={teamCode}
            onChange={(e) => setTeamCode(e.target.value)}
            placeholder="TT2026"
            autoCapitalize="characters"
            required
          />
          <SqInput
            label="Your name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Mia"
            required
          />
          <SqInput
            label="Player code"
            value={playerCode}
            onChange={(e) => setPlayerCode(e.target.value)}
            placeholder="ABCD"
            autoCapitalize="characters"
            required
          />
          {error && <p className="sq-auth-error">{error}</p>}
          <SqButton type="submit" fullWidth disabled={loading}>
            {loading ? 'Checking…' : 'Let\u2019s go!'}
          </SqButton>
        </form>

        <p className="sq-auth-footnote">
          Don't have a code? Ask your parent to find it, or{' '}
          <Link to="/summer-quest">go back</Link>.
        </p>
      </SqCard>
    </div>
  );
}

export const SQ_AUTH_PAGE_CSS = `
.sq-auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.sq-auth-card { max-width: 380px; width: 100%; text-align: center; }
.sq-auth-icon { font-size: 36px; display: block; margin-bottom: 8px; }
.sq-auth-title { font-size: 24px; font-weight: 800; color: var(--sq-black); margin: 0 0 6px; }
.sq-auth-subtitle { color: var(--sq-grey); font-size: 14px; margin: 0 0 20px; }
.sq-auth-card form { text-align: left; }
.sq-auth-error { color: var(--sq-red); font-size: 14px; margin: 0 0 14px; text-align: left; }
.sq-auth-footnote { font-size: 13px; color: var(--sq-grey); margin: 18px 0 0; }
.sq-auth-footnote a { color: var(--sq-orange-dark); font-weight: 700; text-decoration: none; }
`;
