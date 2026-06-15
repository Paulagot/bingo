import React from 'react';
import type { Entitlements } from '../hooks/useEntitlements';
import type { GameScope } from '@/shared/api/quiz.api';

interface Props {
  ents: Entitlements | null;
  scope?: GameScope;
  className?: string;
}

const EntitlementsBar: React.FC<Props> = ({ ents, scope = 'quiz', className }) => {
  if (!ents) return null;

  const credits = ents.game_credits_remaining ?? 0;
  const maxPlayers = ents.max_players_per_game ?? '—';
  const planCode = ents.plan_code ?? '';

  const creditLabel = planCode === 'FREE'
    ? `${credits} lifetime ${scope} credit${credits === 1 ? '' : 's'} remaining`
    : `${credits} credit${credits === 1 ? '' : 's'} remaining this month`;

  return (
    <div className={`text-fg/60 mt-2 text-lg ${className ?? ''}`}>
      {creditLabel} · Max players: <strong>{maxPlayers}</strong> ·{' '}
      Launching this {scope} will cost 1 credit.
    </div>
  );
};

export default EntitlementsBar;
