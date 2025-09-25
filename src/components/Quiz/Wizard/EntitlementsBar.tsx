import React from 'react';
import type { Entitlements } from '../hooks/useEntitlements';

interface Props {
  ents: Entitlements | null;
  className?: string;
}

const EntitlementsBar: React.FC<Props> = ({ ents, className }) => {
  if (!ents) return null;

  return (
    <div className={`text-fg/60 mt-2 text-sm ${className ?? ''}`}>
      Credits remaining: <strong>{ents.game_credits_remaining ?? 0}</strong> ·{' '}
      Max players: <strong>{ents.max_players_per_game ?? '—'}</strong> ·{' '}
      Max rounds: <strong>{ents.max_rounds ?? '—'}</strong>
    </div>
  );
};

export default EntitlementsBar;
