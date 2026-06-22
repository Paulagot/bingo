import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { SqButton } from '../components/shared/SqButton';
import { SqCard, SqInput } from '../components/shared/SqFormPrimitives';
import { loginAdmin } from '../api/sqAuthApi';
import { SummerQuestApiError } from '../api/sqApiClient';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await loginAdmin(email.trim(), password);
      navigate('/summer-quest/admin/dashboard');
    } catch (err) {
      if (err instanceof SummerQuestApiError) {
        setError('Email or password didn\u2019t match. Try again.');
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
        <span className="sq-auth-icon">📋</span>
        <h1 className="sq-auth-title">Coach &amp; admin login</h1>
        <p className="sq-auth-subtitle">Squad progress, invites, and exports.</p>

        <form onSubmit={handleSubmit}>
          <SqInput
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          <SqInput
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          {error && <p className="sq-auth-error">{error}</p>}
          <SqButton type="submit" fullWidth variant="ghost" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </SqButton>
        </form>

        <p className="sq-auth-footnote"><Link to="/summer-quest">Go back</Link></p>
      </SqCard>
    </div>
  );
}
