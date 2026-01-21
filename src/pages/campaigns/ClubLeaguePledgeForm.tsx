import React, { useMemo, useState } from 'react';
import { CheckCircle, Loader2, Mail, Users, User, Building2 } from 'lucide-react';

type ClubRole =
  | 'Manager'
  | 'Coach'
  | 'Committee member'
  | 'Parent'
  | 'Volunteer'
  | 'Other';

export type ClubLeaguePledgePayload = {
  clubName: string;
  email: string;
  role: ClubRole;
  roleOther?: string;
  campaign: 'clubs_league_march_2026';
};

type Props = {
  compactTitle?: string;
  endpoint?: string; // backend endpoint you control
};

const inputBase =
  'w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 text-indigo-900 placeholder:text-indigo-900/40 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

export const ClubLeaguePledgeForm: React.FC<Props> = ({
  compactTitle = 'Pledge Now — Reserve Your Club Spot',
  endpoint = '/api/pledges/clubs-league',
}) => {
  const [clubName, setClubName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ClubRole>('Coach');
  const [roleOther, setRoleOther] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const canSubmit = useMemo(() => {
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    const clubOk = clubName.trim().length >= 2;
    const roleOk = role !== 'Other' || roleOther.trim().length >= 2;
    return emailOk && clubOk && roleOk && !submitting;
  }, [email, clubName, role, roleOther, submitting]);

  const resetStatus = () => {
    if (status !== 'idle') setStatus('idle');
    if (errorMsg) setErrorMsg('');
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetStatus();
    if (!canSubmit) return;

    const payload: ClubLeaguePledgePayload = {
      clubName: clubName.trim(),
      email: email.trim(),
      role,
      roleOther: role === 'Other' ? roleOther.trim() : undefined,
      campaign: 'clubs_league_march_2026',
    };

    try {
      setSubmitting(true);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        // Try to pull a message from JSON if your API returns one
        let msg = 'Something went wrong. Please try again.';
        try {
          const data = await res.json();
          if (data?.message) msg = String(data.message);
        } catch {
          // ignore
        }
        throw new Error(msg);
      }

      setStatus('success');
      setClubName('');
      setEmail('');
      setRole('Coach');
      setRoleOther('');
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h3 className="text-indigo-900 text-xl font-bold">{compactTitle}</h3>
      <p className="mt-2 text-sm text-indigo-900/70 leading-relaxed">
        Limited to <strong>25 clubs</strong>. Pledge now to get the full support pack and reserve a spot for March 2026.
      </p>

      <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4">
        <ul className="space-y-2 text-sm text-indigo-900/80">
          <li className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 mt-0.5 text-green-600" />
            <span>
              Registration &amp; payment deadline: <strong>28 Feb 2026</strong>
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 mt-0.5 text-green-600" />
            <span>
              Your club quiz night must run during: <strong>March 2026</strong>
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 mt-0.5 text-green-600" />
            <span>
              League format: <strong>Club qualifier → One Final</strong> (no semi-finals)
            </span>
          </li>
        </ul>
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-indigo-900">
            <Building2 className="h-4 w-4 text-indigo-600" />
            Club name
          </label>
          <input
            className={inputBase}
            value={clubName}
            onChange={(e) => setClubName(e.target.value)}
            placeholder="e.g. St Mary’s GAA, Tallaght"
            onFocus={resetStatus}
            autoComplete="organization"
          />
        </div>

        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-indigo-900">
            <Mail className="h-4 w-4 text-indigo-600" />
            Email
          </label>
          <input
            className={inputBase}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@yourclub.ie"
            onFocus={resetStatus}
            autoComplete="email"
            inputMode="email"
          />
        </div>

        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-indigo-900">
            <Users className="h-4 w-4 text-indigo-600" />
            Your role
          </label>
          <select
            className={inputBase}
            value={role}
            onChange={(e) => setRole(e.target.value as ClubRole)}
            onFocus={resetStatus}
          >
            <option>Manager</option>
            <option>Coach</option>
            <option>Committee member</option>
            <option>Parent</option>
            <option>Volunteer</option>
            <option>Other</option>
          </select>
        </div>

        {role === 'Other' && (
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-indigo-900">
              <User className="h-4 w-4 text-indigo-600" />
              Tell us your role
            </label>
            <input
              className={inputBase}
              value={roleOther}
              onChange={(e) => setRoleOther(e.target.value)}
              placeholder="e.g. Fundraising lead"
              onFocus={resetStatus}
            />
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className={`w-full rounded-xl px-5 py-3 font-semibold shadow-md transition-colors ${
            canSubmit
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'bg-indigo-200 text-white cursor-not-allowed'
          }`}
        >
          {submitting ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Submitting…
            </span>
          ) : (
            'Pledge & Reserve Spot'
          )}
        </button>

        {status === 'success' && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            ✅ Thanks — pledge received. We’ll email your club the league pack and next steps.
          </div>
        )}

        {status === 'error' && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            ❌ {errorMsg || 'Something went wrong. Please try again.'}
          </div>
        )}

        <p className="text-xs text-indigo-900/60">
          By pledging, you’re reserving a league spot. We’ll follow up with the registration link and payment details.
        </p>
      </form>
    </div>
  );
};
