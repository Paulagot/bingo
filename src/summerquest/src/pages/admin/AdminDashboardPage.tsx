import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SqCard } from '../../components/shared/SqFormPrimitives';
import { SqLoadingState, SqErrorBanner } from '../../components/shared/SqStateComponents';
import { getAdminDashboard, AdminDashboardSummary } from '../../api/sqAdminApi';
import { useSummerQuestAuthGuard } from '../../api/useSqAuthGuard';
import { getStoredRole } from '../../api/sqApiClient';
import { PoweredByFundraisely } from '../../components/shared/PoweredByFundraisely';

// Spec section 8.10. No bottom nav (mirrors the parent side) — instead
// a small tab strip for the 4 admin screens, since coach/admin
// navigates between dashboard/players/invites/exports a lot more than
// a parent moves between their few screens.

const ADMIN_TABS = [
  { path: '/summer-quest/admin/dashboard', label: 'Dashboard', superAdminOnly: false },
  { path: '/summer-quest/admin/players', label: 'Players', superAdminOnly: false },
  { path: '/summer-quest/admin/invites', label: 'Invites', superAdminOnly: true },
  { path: '/summer-quest/admin/exports', label: 'Exports', superAdminOnly: false },
];

export function AdminTabStrip({ active }: { active: string }) {
  const navigate = useNavigate();
  const isSuperAdmin = getStoredRole() === 'super_admin';
  const visibleTabs = ADMIN_TABS.filter((tab) => !tab.superAdminOnly || isSuperAdmin);

  return (
    <div className="sq-admin-tabs">
      {visibleTabs.map((tab) => (
        <button
          key={tab.path}
          className={`sq-admin-tab ${active === tab.path ? 'sq-admin-tab-active' : ''}`}
          onClick={() => navigate(tab.path)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export default function AdminDashboardPage() {
  const { handleApiError } = useSummerQuestAuthGuard('/summer-quest/admin-login');
  const [data, setData] = useState<AdminDashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setData(await getAdminDashboard());
    } catch (err) {
      if (!handleApiError(err)) setError('Couldn\u2019t load the dashboard.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="sq-root sq-admin-page">
      <header className="sq-admin-header">
        <h1>Squad Dashboard</h1>
        {data && <p>Week {data.currentWeek} of the programme</p>}
      </header>

      <AdminTabStrip active="/summer-quest/admin/dashboard" />

      {loading && <SqLoadingState label="Pulling squad stats…" />}
      {error && <SqErrorBanner message={error} onRetry={load} />}

      {data && (
        <div className="sq-admin-stat-grid">
          <AdminStatTile value={data.totalPlayers} label="Total players" />
          <AdminStatTile value={data.activeThisWeek} label="Active this week" />
          <AdminStatTile value={data.logsSubmittedThisWeek} label="Logs this week" />
          <AdminStatTile value={data.challengeSubmissionsThisWeek} label="Challenges this week" />
          <AdminStatTile value={data.parentSignoffsCompleted} label="Sign-offs done" />
          <AdminStatTile value={data.playersNeedingSignoff} label="Need sign-off" highlight={data.playersNeedingSignoff > 0} />
          <AdminStatTile value={data.totalSessions} label="Total sessions" />
          <AdminStatTile value={data.totalOptionalMinutes} label="Total minutes" />
        </div>
      )}

      <PoweredByFundraisely />
    </div>
  );
}

function AdminStatTile({ value, label, highlight }: { value: number; label: string; highlight?: boolean }) {
  return (
    <SqCard className={`sq-admin-stat-tile ${highlight ? 'sq-admin-stat-tile-highlight' : ''}`}>
      <span className="sq-admin-stat-value">{value.toLocaleString()}</span>
      <span className="sq-admin-stat-label">{label}</span>
    </SqCard>
  );
}

export const SQ_ADMIN_DASHBOARD_CSS = `
.sq-admin-page { padding: 28px 16px 40px; max-width: 600px; margin: 0 auto; }
.sq-admin-header { margin-bottom: 16px; }
.sq-admin-header h1 { font-size: 24px; font-weight: 800; margin: 0; color: var(--sq-black); }
.sq-admin-header p { font-size: 13px; color: var(--sq-grey); margin: 4px 0 0; }

.sq-admin-tabs { display: flex; gap: 6px; margin-bottom: 20px; flex-wrap: wrap; }
.sq-admin-tab {
  border: 2px solid var(--sq-border);
  background: var(--sq-white);
  border-radius: 999px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  color: var(--sq-charcoal);
}
.sq-admin-tab-active { background: var(--sq-black); border-color: var(--sq-black); color: var(--sq-white); }

.sq-admin-stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.sq-admin-stat-tile { display: flex; flex-direction: column; gap: 4px; text-align: center; }
.sq-admin-stat-value { font-size: 26px; font-weight: 800; color: var(--sq-orange-dark); }
.sq-admin-stat-label { font-size: 12px; color: var(--sq-grey); }
.sq-admin-stat-tile-highlight { background: var(--sq-soft-orange); }
.sq-admin-stat-tile-highlight .sq-admin-stat-value { color: var(--sq-red); }
`;
