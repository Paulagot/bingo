import React, { useEffect, useState } from 'react';
import { SqCard, SqInput } from '../../components/shared/SqFormPrimitives';
import { SqButton } from '../../components/shared/SqButton';
import { SqLoadingState, SqErrorBanner, SqEmptyState } from '../../components/shared/SqStateComponents';
import { AdminTabStrip } from './AdminDashboardPage';
import { getInvites, createInvite, revokeInvite, AdminInvite, createCoach, getCoaches, AdminCoach } from '../../api/sqAdminApi';
import { SummerQuestApiError, getStoredRole } from '../../api/sqApiClient';
import { useSummerQuestAuthGuard } from '../../api/useSqAuthGuard';

// Spec section 5.1 — only Super Admin can create invites or coach
// accounts. The backend enforces this (summerQuestAdminInviteRoutes.js
// gates every route here on super_admin only). The FRONTEND also
// checks the stored role and skips calling these endpoints entirely
// for a coach_admin, showing a plain "restricted" message instead —
// a coach previously saw a confusing failed network call (403) because
// the page tried to load invite/coach data it was never going to be
// allowed to see. Checking role client-side first avoids that, while
// the backend role-gate remains the real security boundary either way.

export default function AdminInvitesPage() {
  const { handleApiError } = useSummerQuestAuthGuard('/summer-quest/admin-login');
  const isSuperAdmin = getStoredRole() === 'super_admin';

  const [invites, setInvites] = useState<AdminInvite[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newInviteLink, setNewInviteLink] = useState<string | null>(null);

  const [coaches, setCoaches] = useState<AdminCoach[] | null>(null);
  const [coachName, setCoachName] = useState('');
  const [coachEmail, setCoachEmail] = useState('');
  const [coachPassword, setCoachPassword] = useState('');
  const [creatingCoach, setCreatingCoach] = useState(false);
  const [coachError, setCoachError] = useState<string | null>(null);
  const [coachSuccess, setCoachSuccess] = useState<string | null>(null);

  async function load() {
    if (!isSuperAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setInvites(await getInvites());
      setCoaches(await getCoaches());
    } catch (err) {
      if (!handleApiError(err)) setError('Couldn\u2019t load invites.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreateCoach(e: React.FormEvent) {
    e.preventDefault();
    setCreatingCoach(true);
    setCoachError(null);
    setCoachSuccess(null);
    try {
      const result = await createCoach(coachName.trim(), coachEmail.trim(), coachPassword);
      setCoachSuccess(`Coach account created for ${result.email}. Share the email + password with them directly.`);
      setCoachName('');
      setCoachEmail('');
      setCoachPassword('');
      load();
    } catch (err) {
      if (err instanceof SummerQuestApiError) {
        setCoachError(err.message);
      } else if (!handleApiError(err)) {
        setCoachError('Couldn\u2019t create the coach account. Try again.');
      }
    } finally {
      setCreatingCoach(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    setNewInviteLink(null);
    try {
      const result = await createInvite(email.trim(), name.trim() || undefined);
      setNewInviteLink(`${window.location.origin}/summer-quest/invite/${result.token}`);
      setEmail('');
      setName('');
      load();
    } catch (err) {
      if (err instanceof SummerQuestApiError && err.status === 403) {
        setCreateError('Only the super admin account can create invites.');
      } else if (!handleApiError(err)) {
        setCreateError('Couldn\u2019t create the invite. Try again.');
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id: number) {
    try {
      await revokeInvite(id);
      load();
    } catch (err) {
      handleApiError(err);
    }
  }

  return (
    <div className="sq-root sq-admin-page">
      <header className="sq-admin-header">
        <h1>Invites</h1>
        <p>Private invite-only access \u2014 there's no public sign-up.</p>
      </header>

      <AdminTabStrip active="/summer-quest/admin/invites" />

      {!isSuperAdmin ? (
        <SqCard className="sq-invite-create-card">
          <h3>Super admin only</h3>
          <p className="sq-coach-blurb">
            Inviting new families and creating other coach accounts is restricted to the super
            admin account. If you need a new family invited, ask the super admin directly.
          </p>
        </SqCard>
      ) : (
        <>
          <SqCard className="sq-invite-create-card">
            <h3>Create a coach account</h3>
            <p className="sq-coach-blurb">
              Coaches can see squad progress and exports, but only you (super admin) can create
              invites or other coach accounts.
            </p>
            <form onSubmit={handleCreateCoach}>
              <SqInput label="Coach name" value={coachName} onChange={(e) => setCoachName(e.target.value)} required />
              <SqInput label="Coach email" type="email" value={coachEmail} onChange={(e) => setCoachEmail(e.target.value)} required />
              <SqInput label="Temporary password" type="password" value={coachPassword} onChange={(e) => setCoachPassword(e.target.value)} minLength={8} required />
              {coachError && <p className="sq-auth-error">{coachError}</p>}
              {coachSuccess && <div className="sq-saved-banner">{coachSuccess}</div>}
              <SqButton type="submit" fullWidth variant="secondary" disabled={creatingCoach}>
                {creatingCoach ? 'Creating…' : 'Create coach account'}
              </SqButton>
            </form>

            {coaches && coaches.length > 0 && (
              <div className="sq-coach-list">
                {coaches.map((c) => (
                  <div key={c.id} className="sq-coach-row">
                    <strong>{c.name}</strong>
                    <span>{c.email}</span>
                  </div>
                ))}
              </div>
            )}
          </SqCard>

          <SqCard className="sq-invite-create-card">
            <h3>Create a new parent invite</h3>
            <form onSubmit={handleCreate}>
              <SqInput label="Parent email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <SqInput label="Parent name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
              {createError && <p className="sq-auth-error">{createError}</p>}
              <SqButton type="submit" fullWidth disabled={creating}>{creating ? 'Creating…' : 'Create invite'}</SqButton>
            </form>
            {newInviteLink && (
              <div className="sq-invite-link-box">
                <span>Share this link with the parent:</span>
                <code>{newInviteLink}</code>
              </div>
            )}
          </SqCard>

          {loading && <SqLoadingState label="Loading invites…" />}
          {error && <SqErrorBanner message={error} onRetry={load} />}

          {invites && invites.length === 0 && (
            <SqEmptyState icon="✉️" title="No invites yet" body="Create your first invite above to bring a family into the squad." />
          )}

          {invites && invites.length > 0 && (
            <div className="sq-invites-list">
              {invites.map((inv) => (
                <SqCard key={inv.id} className="sq-invite-row">
                  <div>
                    <strong>{inv.invited_email}</strong>
                    {inv.invited_name && <span className="sq-invite-row-name"> ({inv.invited_name})</span>}
                    <span className={`sq-invite-status sq-invite-status-${inv.status}`}>{inv.status}</span>
                  </div>
                  {inv.status === 'pending' && (
                    <button className="sq-admin-table-link" onClick={() => handleRevoke(inv.id)}>Revoke</button>
                  )}
                </SqCard>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export const SQ_ADMIN_INVITES_CSS = `
.sq-coach-blurb { font-size: 13px; color: var(--sq-grey); margin: 0 0 14px; line-height: 1.4; }
.sq-coach-list { margin-top: 14px; display: flex; flex-direction: column; gap: 6px; }
.sq-coach-row { display: flex; justify-content: space-between; gap: 10px; font-size: 13px; background: var(--sq-cream); border-radius: 10px; padding: 8px 12px; }
.sq-coach-row span { color: var(--sq-grey); }

.sq-invite-create-card { margin-bottom: 20px; }
.sq-invite-create-card h3 { margin: 0 0 12px; font-size: 15px; font-weight: 800; }
.sq-invite-link-box {
  margin-top: 14px;
  background: var(--sq-cream);
  border-radius: 10px;
  padding: 12px;
  font-size: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  word-break: break-all;
}
.sq-invite-link-box code { font-size: 11px; color: var(--sq-orange-dark); }

.sq-invites-list { display: flex; flex-direction: column; gap: 8px; }
.sq-invite-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 13px; flex-wrap: wrap; }
.sq-invite-row-name { color: var(--sq-grey); }
.sq-invite-status {
  margin-left: 10px;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--sq-soft-orange);
  color: var(--sq-orange-dark);
}
.sq-invite-status-accepted { background: #E8F5E9; color: var(--sq-green); }
.sq-invite-status-revoked, .sq-invite-status-expired { background: #FEECEC; color: var(--sq-red); }
`;
