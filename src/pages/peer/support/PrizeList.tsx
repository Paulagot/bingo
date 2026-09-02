// PrizeList.tsx
// Renders a room's prize table - the {place, value, sponsor, description} array
// already present on the payload. Markup matches the current PackDetailsSheet
// prize block so it's a straight drop-in, just reusable. Renders nothing when
// there are no prizes.

import { fmt, getPlaceLabel, type RoomPrize } from './peerSupporthelpers';

type Props = {
  prizes: RoomPrize[] | null | undefined;
  currency: string;
  max?: number;
};

export default function PrizeList({ prizes, currency, max = 6 }: Props) {
  const list = Array.isArray(prizes) ? prizes : [];
  if (!list.length) return null;

  return (
    <div>
      <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">Prize details</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {list.slice(0, max).map((prize, i) => (
          <div key={i} className="rounded-2xl bg-white p-3 ring-1 ring-orange-100">
            <p className="text-xs font-black text-slate-500">{getPlaceLabel(prize.place)}</p>
            <p className="mt-0.5 text-base font-black text-[var(--fr-primary)]">
              {prize.value ? fmt(prize.value, currency) : prize.description || 'Prize'}
            </p>
            {prize.description && prize.value && (
              <p className="mt-1 text-xs font-bold text-slate-600">{prize.description}</p>
            )}
            {prize.sponsor && (
              <p className="mt-1 text-[11px] font-bold text-slate-400">Sponsored by {prize.sponsor}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}