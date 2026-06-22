import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SqButton } from '../components/shared/SqButton';
import { SqCard } from '../components/shared/SqFormPrimitives';
import { PoweredByFundraisely } from '../components/shared/PoweredByFundraisely';

// Landing page — spec section 17. No registration button anywhere.
// Framed as "pick your role for the mission" rather than a generic
// marketing page with feature tiles, since there's nothing to market —
// every visitor already knows the team and just needs to get in.

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="sq-root sq-landing">
      <div className="sq-landing-hero">
        <span className="sq-landing-eyebrow">Private squad tracker</span>
        <h1 className="sq-landing-title">Laura's Team<br />Summer Quest</h1>
        <p className="sq-landing-subtitle">
          A private summer homework tracker for invited Laura's Team families.
          Twelve weeks. One squad. Every session counts.
        </p>
      </div>

      <div className="sq-landing-roles">
        <SqCard className="sq-landing-role-card">
          <span className="sq-landing-role-icon">⚽</span>
          <h2>I'm a player</h2>
          <p>Log today's mission, check your streak, see your badges.</p>
          <SqButton fullWidth onClick={() => navigate('/summer-quest/player-login')}>
            Player Login
          </SqButton>
        </SqCard>

        <SqCard className="sq-landing-role-card">
          <span className="sq-landing-role-icon">👋</span>
          <h2>I'm a parent</h2>
          <p>Review the week and sign off on your child's progress.</p>
          <SqButton fullWidth variant="secondary" onClick={() => navigate('/summer-quest/parent-login')}>
            Parent Login
          </SqButton>
        </SqCard>

        <SqCard className="sq-landing-role-card">
          <span className="sq-landing-role-icon">📋</span>
          <h2>I'm the coach</h2>
          <p>See squad progress, manage invites, export reports.</p>
          <SqButton fullWidth variant="ghost" onClick={() => navigate('/summer-quest/admin-login')}>
            Admin Login
          </SqButton>
        </SqCard>
      </div>

      <p className="sq-landing-note">Access is by private invite only. There's no public sign-up.</p>

      <PoweredByFundraisely />
    </div>
  );
}

export const SQ_LANDING_CSS = `
.sq-landing {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 20px 32px;
  gap: 32px;
}
.sq-landing-hero { text-align: center; max-width: 480px; }
.sq-landing-eyebrow {
  display: inline-block;
  background: var(--sq-soft-orange);
  color: var(--sq-orange-dark);
  font-weight: 800;
  font-size: 12px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 6px 14px;
  border-radius: 999px;
  margin-bottom: 16px;
}
.sq-landing-title {
  font-family: 'Poppins', 'Nunito', sans-serif;
  font-weight: 800;
  font-size: clamp(32px, 8vw, 48px);
  line-height: 1.1;
  color: var(--sq-black);
  margin: 0 0 12px;
}
.sq-landing-subtitle { color: var(--sq-grey); font-size: 16px; line-height: 1.5; margin: 0; }

.sq-landing-roles {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 420px;
}
.sq-landing-role-card { display: flex; flex-direction: column; gap: 10px; text-align: left; }
.sq-landing-role-icon { font-size: 28px; }
.sq-landing-role-card h2 { margin: 0; font-size: 19px; font-weight: 800; color: var(--sq-black); }
.sq-landing-role-card p { margin: 0 0 4px; color: var(--sq-grey); font-size: 14px; }

.sq-landing-note { color: var(--sq-grey); font-size: 13px; text-align: center; }
`;
