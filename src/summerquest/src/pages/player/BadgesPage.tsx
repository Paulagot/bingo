import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SqLoadingState, SqErrorBanner, SqEmptyState } from '../../components/shared/SqStateComponents';
import { SqBottomNav } from '../../components/shared/SqBottomNav';
import { getBadges, BadgeRow } from '../../api/sqPlayerApi';
import { useSummerQuestAuthGuard } from '../../api/useSqAuthGuard';

const ICON_MAP: Record<string, string> = {
  Flag: '🚩', Flame: '🔥', Star: '⭐', RotateCcw: '↩️', CircleDot: '⚽',
  Target: '🎯', Zap: '⚡', Sparkles: '✨', Footprints: '👣',
  ClipboardCheck: '📋', Trophy: '🏆', Users: '👥', Droplet: '💧',
};

export default function BadgesPage() {
  const navigate = useNavigate();
  const { handleApiError } = useSummerQuestAuthGuard('/summer-quest/player-login');
  const [badges, setBadges] = useState<BadgeRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setBadges(await getBadges());
    } catch (err) {
      if (!handleApiError(err)) setError('Couldn\u2019t load badges.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const unlockedCount = badges?.filter((b) => b.unlocked).length || 0;

  return (
    <div className="sq-root sq-page-with-nav sq-badges-page">
      <header className="sq-badges-header">
        <button className="sq-log-back" onClick={() => navigate('/summer-quest/player/dashboard')}>← Back</button>
        <h1>My Badges</h1>
        {badges && <p>{unlockedCount} of {badges.length} unlocked</p>}
      </header>

      {loading && <SqLoadingState label="Loading badges…" />}
      {error && <SqErrorBanner message={error} onRetry={load} />}

      {badges && badges.length === 0 && (
        <SqEmptyState icon="🏅" title="No badges yet" body="Log your first mission to start earning badges." />
      )}

      {badges && badges.length > 0 && (
        <div className="sq-badges-grid">
          {badges.map((badge) => (
            <div key={badge.badge_key} className={`sq-badge-tile ${badge.unlocked ? 'sq-badge-tile-unlocked' : 'sq-badge-tile-locked'}`}>
              <span className="sq-badge-tile-icon">{ICON_MAP[badge.icon] || '🏅'}</span>
              <span className="sq-badge-tile-name">{badge.name}</span>
              <span className="sq-badge-tile-desc">{badge.description}</span>
            </div>
          ))}
        </div>
      )}

      <SqBottomNav />
    </div>
  );
}

export const SQ_BADGES_PAGE_CSS = `
.sq-badges-page { padding: 16px 16px 0; max-width: 480px; margin: 0 auto; }
.sq-badges-header { margin-bottom: 16px; }
.sq-badges-header h1 { font-size: 22px; font-weight: 800; margin: 0; }
.sq-badges-header p { font-size: 13px; color: var(--sq-grey); margin: 4px 0 0; }

.sq-badges-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.sq-badge-tile {
  background: var(--sq-white);
  border-radius: 16px;
  padding: 16px 12px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  box-shadow: 0 2px 8px rgba(17,17,17,0.05);
}
.sq-badge-tile-icon { font-size: 32px; }
.sq-badge-tile-name { font-size: 13px; font-weight: 800; color: var(--sq-black); }
.sq-badge-tile-desc { font-size: 11px; color: var(--sq-grey); line-height: 1.3; }
.sq-badge-tile-locked { opacity: 0.4; filter: grayscale(0.6); }
.sq-badge-tile-unlocked { background: var(--sq-soft-orange); }
`;
