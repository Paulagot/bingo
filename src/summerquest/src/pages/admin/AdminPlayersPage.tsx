import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SqLoadingState, SqErrorBanner, SqEmptyState } from '../../components/shared/SqStateComponents';
import { AdminTabStrip } from './AdminDashboardPage';
import { getAdminPlayerTable, AdminPlayerRow } from '../../api/sqAdminApi';
import { useSummerQuestAuthGuard } from '../../api/useSqAuthGuard';

export default function AdminPlayersPage() {
  const navigate = useNavigate();
  const { handleApiError } = useSummerQuestAuthGuard('/summer-quest/admin-login');
  const [weekNumber, setWeekNumber] = useState<number | null>(null);
  const [players, setPlayers] = useState<AdminPlayerRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const result = await getAdminPlayerTable();
      setWeekNumber(result.weekNumber);
      setPlayers(result.players);
    } catch (err) {
      if (!handleApiError(err)) setError('Couldn\u2019t load players.');
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
        <h1>Players</h1>
        {weekNumber && <p>Week {weekNumber} completion shown below</p>}
      </header>

      <AdminTabStrip active="/summer-quest/admin/players" />

      {loading && <SqLoadingState label="Loading the squad…" />}
      {error && <SqErrorBanner message={error} onRetry={load} />}

      {players && players.length === 0 && (
        <SqEmptyState icon="👥" title="No players yet" body="Players will show up here once parents accept their invites." />
      )}

      {players && players.length > 0 && (
        <div className="sq-admin-table-wrap">
          {/* Desktop/tablet: real table. Hidden below the mobile breakpoint via CSS. */}
          <table className="sq-admin-table sq-admin-table-desktop">
            <thead>
              <tr>
                <th>Player</th>
                <th>Parent</th>
                <th>This week</th>
                <th>Streak</th>
                <th>Challenge</th>
                <th>Signed</th>
                <th>Badges</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.id} className={p.isActive ? '' : 'sq-admin-row-inactive'}>
                  <td className="sq-admin-table-name">{p.displayName}</td>
                  <td>{p.parentName}</td>
                  <td>{p.thisWeekCompletion.completedDays}/{p.thisWeekCompletion.targetDays}</td>
                  <td>{p.currentStreak > 0 ? `🔥 ${p.currentStreak}` : '\u2014'}</td>
                  <td>{p.challengeSubmitted ? '✅' : '\u2014'}</td>
                  <td>{p.parentSigned ? '✅' : '\u2014'}</td>
                  <td>{p.badgeCount}</td>
                  <td>
                    <button className="sq-admin-table-link" onClick={() => navigate(`/summer-quest/admin/player/${p.id}`)}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile: stacked cards, no horizontal scroll. */}
          <div className="sq-admin-player-cards">
            {players.map((p) => (
              <button
                key={p.id}
                className={`sq-admin-player-card ${p.isActive ? '' : 'sq-admin-row-inactive'}`}
                onClick={() => navigate(`/summer-quest/admin/player/${p.id}`)}
              >
                <div className="sq-admin-player-card-top">
                  <strong>{p.displayName}</strong>
                  <span className="sq-admin-player-card-arrow">→</span>
                </div>
                <span className="sq-admin-player-card-parent">{p.parentName}</span>
                <div className="sq-admin-player-card-stats">
                  <span>Week: {p.thisWeekCompletion.completedDays}/{p.thisWeekCompletion.targetDays}</span>
                  <span>{p.currentStreak > 0 ? `🔥 ${p.currentStreak}` : 'No streak'}</span>
                  <span>{p.challengeSubmitted ? '✅ Challenge' : '\u2014 Challenge'}</span>
                  <span>{p.parentSigned ? '✅ Signed' : '\u2014 Signed'}</span>
                  <span>🏅 {p.badgeCount}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export const SQ_ADMIN_PLAYERS_CSS = `
.sq-admin-table-wrap { background: var(--sq-white); border-radius: 16px; box-shadow: 0 2px 8px rgba(17,17,17,0.05); overflow: hidden; }

.sq-admin-table-desktop { display: none; width: 100%; border-collapse: collapse; font-size: 13px; }
.sq-admin-table th {
  text-align: left;
  padding: 12px 10px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--sq-grey);
  border-bottom: 2px solid var(--sq-border);
}
.sq-admin-table td { padding: 10px; border-bottom: 1px solid var(--sq-border); }
.sq-admin-table-name { font-weight: 800; color: var(--sq-black); }
.sq-admin-row-inactive { opacity: 0.5; }
.sq-admin-table-link { background: none; border: none; color: var(--sq-orange-dark); font-weight: 700; cursor: pointer; font-size: 13px; }

.sq-admin-player-cards { display: flex; flex-direction: column; }
.sq-admin-player-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: left;
  background: none;
  border: none;
  border-bottom: 1px solid var(--sq-border);
  padding: 14px 16px;
  cursor: pointer;
  width: 100%;
  font-family: inherit;
}
.sq-admin-player-card:last-child { border-bottom: none; }
.sq-admin-player-card:active { background: var(--sq-cream); }
.sq-admin-player-card-top { display: flex; align-items: center; justify-content: space-between; }
.sq-admin-player-card-top strong { font-size: 15px; color: var(--sq-black); }
.sq-admin-player-card-arrow { color: var(--sq-orange-dark); font-weight: 800; }
.sq-admin-player-card-parent { font-size: 12px; color: var(--sq-grey); }
.sq-admin-player-card-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 12px;
  color: var(--sq-charcoal);
  margin-top: 4px;
}

/* Switch to the real table once there's enough width for it to fit
   without forcing horizontal scroll. */
@media (min-width: 640px) {
  .sq-admin-table-desktop { display: table; }
  .sq-admin-player-cards { display: none; }
}
`;
