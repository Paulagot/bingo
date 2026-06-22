import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { SqButton } from '../components/shared/SqButton';
import { SqCard, SqInput, SqCheckbox } from '../components/shared/SqFormPrimitives';
import { registerParentFromInvite } from '../api/sqAuthApi';
import { SummerQuestApiError } from '../api/sqApiClient';

// Spec sections 6.1 and 7. One page, four short steps, because this is
// a one-time setup a parent does once on their own device — no need to
// split it across multiple route changes and lose their place.

type ConsentState = {
  isParentGuardian: boolean;
  consentChildUse: boolean;
  consentPlayerCode: boolean;
  consentCoachView: boolean;
  consentDataDeletion: boolean;
};

const CONSENT_COPY =
  "This is a private team tracker built only for Laura's teams. This is a fully private app built only for this team. It stores your child\u2019s display name, daily training completion, optional minutes, weekly challenge results, badges, streaks, and parent sign-off. The app does not collect photos, videos, location, food diaries, weight, or public social content. Coach/admin users can view squad progress and parent sign-off status. Other players only see team totals and anonymous milestones. All data will be deleted at the end of the programme.";

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [step, setStep] = useState<'intro' | 'form' | 'done'>('intro');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [internalName, setInternalName] = useState('');
  const [consent, setConsent] = useState<ConsentState>({
    isParentGuardian: false,
    consentChildUse: false,
    consentPlayerCode: false,
    consentCoachView: false,
    consentDataDeletion: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [revealedCode, setRevealedCode] = useState<string | null>(null);

  const allConsentsChecked = Object.values(consent).every(Boolean);

  function updateConsent(key: keyof ConsentState) {
    setConsent((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!allConsentsChecked) {
      setError('Please check all four boxes to continue.');
      return;
    }

    setLoading(true);
    try {
      const result = await registerParentFromInvite({
        token: token || '',
        name: name.trim(),
        email: email.trim(),
        password,
        consent: { signedName: name.trim(), ...consent },
        player: { displayName: displayName.trim(), internalName: internalName.trim() || undefined },
      });
      setRevealedCode(result.player?.playerCode || null);
      setStep('done');
    } catch (err) {
      if (err instanceof SummerQuestApiError) {
        setError(err.message);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  if (step === 'done') {
    return (
      <div className="sq-root sq-auth-page">
        <SqCard className="sq-auth-card sq-invite-done">
          <span className="sq-auth-icon">🎉</span>
          <h1 className="sq-auth-title">You're all set!</h1>
          <p className="sq-auth-subtitle">
            Write this player code down or share it with {displayName || 'your child'} so they
            can log in on their own device.
          </p>
          <div className="sq-invite-code-box">
            <span className="sq-invite-code-label">Player code</span>
            <span className="sq-invite-code-value">{revealedCode}</span>
          </div>
          <p className="sq-auth-footnote">
            This code is shown once and can't be retrieved later \u2014 but you can reset it
            any time from your parent dashboard.
          </p>
          <SqButton fullWidth onClick={() => navigate('/summer-quest/parent/dashboard')}>
            Go to my dashboard
          </SqButton>
        </SqCard>
      </div>
    );
  }

  if (step === 'intro') {
    return (
      <div className="sq-root sq-auth-page">
        <SqCard className="sq-auth-card">
          <span className="sq-auth-icon">⚽</span>
          <h1 className="sq-auth-title">Welcome to Summer Quest</h1>
          <p className="sq-auth-subtitle">
            You've been invited to join Laura's Team's private summer tracker.
            It takes about two minutes to set up.
          </p>
          <SqButton fullWidth onClick={() => setStep('form')}>Get started</SqButton>
          <p className="sq-auth-footnote"><Link to="/summer-quest">Go back</Link></p>
        </SqCard>
      </div>
    );
  }

  return (
    <div className="sq-root sq-auth-page">
      <SqCard className="sq-auth-card sq-invite-form-card">
        <h1 className="sq-auth-title">Set up your account</h1>

        <form onSubmit={handleSubmit}>
          <h2 className="sq-invite-section-title">Your details</h2>
          <SqInput label="Your name" value={name} onChange={(e) => setName(e.target.value)} required />
          <SqInput label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <SqInput
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />

          <h2 className="sq-invite-section-title">Your child's profile</h2>
          <SqInput
            label="Display name (shown in the app)"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Mia"
            required
          />
          <SqInput
            label="Full name (optional, for your reference only)"
            value={internalName}
            onChange={(e) => setInternalName(e.target.value)}
            placeholder="Mia Smith"
          />

          <h2 className="sq-invite-section-title">Parent/guardian consent</h2>
          <p className="sq-invite-consent-copy">{CONSENT_COPY}</p>

          <SqCheckbox
            label="I confirm I am the parent or guardian."
            checked={consent.isParentGuardian}
            onChange={() => updateConsent('isParentGuardian')}
          />
          <SqCheckbox
            label="I consent to my child using this private team tracker."
            checked={consent.consentChildUse}
            onChange={() => updateConsent('consentChildUse')}
          />
          <SqCheckbox
            label="I understand my child can log training on their own device using a private player code."
            checked={consent.consentPlayerCode}
            onChange={() => updateConsent('consentPlayerCode')}
          />
          <SqCheckbox
            label="I understand coach/admin users can view training completion and weekly challenge submissions."
            checked={consent.consentCoachView}
            onChange={() => updateConsent('consentCoachView')}
          />
          <SqCheckbox
            label="I understand this app is for the summer programme and data will be deleted after the programme."
            checked={consent.consentDataDeletion}
            onChange={() => updateConsent('consentDataDeletion')}
          />

          {error && <p className="sq-auth-error">{error}</p>}

          <SqButton type="submit" fullWidth disabled={loading} style={{ marginTop: 12 }}>
            {loading ? 'Setting up…' : 'Create account'}
          </SqButton>
        </form>
      </SqCard>
    </div>
  );
}

export const SQ_INVITE_CSS = `
.sq-invite-form-card { max-width: 460px; text-align: left; }
.sq-invite-section-title {
  font-size: 15px;
  font-weight: 800;
  color: var(--sq-orange-dark);
  margin: 24px 0 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.sq-invite-section-title:first-of-type { margin-top: 4px; }
.sq-invite-consent-copy {
  font-size: 13px;
  line-height: 1.5;
  color: var(--sq-grey);
  background: var(--sq-cream);
  border: 1px solid var(--sq-border);
  border-radius: 12px;
  padding: 14px;
  margin: 0 0 8px;
}
.sq-invite-done { text-align: center; }
.sq-invite-code-box {
  background: var(--sq-soft-orange);
  border-radius: 16px;
  padding: 20px;
  margin: 16px 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.sq-invite-code-label { font-size: 12px; font-weight: 700; color: var(--sq-orange-dark); text-transform: uppercase; }
.sq-invite-code-value { font-size: 32px; font-weight: 800; letter-spacing: 0.08em; color: var(--sq-black); }
`;
