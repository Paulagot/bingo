// ActivityDetailSheet.tsx
// Replaces the thin PackDetailsSheet. For each activity in the pack it finally
// renders the event_description story that was already in the payload, a
// "what's included" block, date/time (suppressed for puzzle drops, whose
// scheduled_at is meaningless - shown as "Play anytime"), and the prize table.

import { CalendarDays, Clock3, Gift, Puzzle, Sparkles, Trophy, Users, X } from 'lucide-react';
import {
  itemTypeLabel,
  formatEventDate,
  formatEventTime,
  parseJsonMaybe,
  getPackFeatured,
  fmt,
  type RoomPrize,
} from './peerSupporthelpers';
import IncludedList from './IncludedList';
import PrizeList from './PrizeList';

type Props = { pack: any; currency: string; onClose: () => void };

function ItemIcon({ game, itemType }: { game: string; itemType: string }) {
  const g = String(game || '').toLowerCase();
  const t = String(itemType || '').toLowerCase();
  const cls = 'h-8 w-8 text-[var(--fr-primary)]';
  if (t === 'puzzle_entry' || g.includes('puzzle')) return <Puzzle className={cls} />;
  if (t.includes('quiz') || g === 'quiz') return <Users className={cls} />;
  if (t === 'elimination_entry' || g === 'elimination') return <Trophy className={cls} />;
  return <Gift className={cls} />;
}

export default function ActivityDetailSheet({ pack, currency, onClose }: Props) {
  const items: any[] = Array.isArray(pack?.items) ? pack.items : [];
  const featured = getPackFeatured(pack);
  const packCurrency = pack?.currency ?? currency;

  return (
    <div
      className="fixed inset-0 z-[10002] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-[2rem] bg-white p-5 shadow-2xl sm:rounded-[2rem]"
        onClick={event => event.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200 sm:hidden" />

        <div className="flex items-start gap-4">
          <div
            className={`grid h-20 w-20 shrink-0 place-items-center rounded-3xl ${
              featured ? 'bg-gradient-to-br from-yellow-100 via-amber-100 to-orange-50' : 'bg-orange-50'
            }`}
          >
            {featured ? (
              <Trophy className="h-10 w-10 fill-amber-400 text-amber-500" />
            ) : (
              <ItemIcon game={items[0]?.game_type} itemType={items[0]?.item_type} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="break-words text-2xl font-black leading-tight tracking-tight text-slate-950">
              {pack?.name}
            </h2>
            <p className="mt-1 text-xl font-black text-[var(--fr-primary)]">
              {fmt(pack?.price, packCurrency)}
            </p>
            {pack?.description && (
              <p className="mt-2 text-sm font-semibold text-slate-500">{pack.description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {items.map((item, index) => {
            const config = parseJsonMaybe<any>(item?.config_json) ?? {};
            const game = String(item?.game_type ?? item?.room?.gameType ?? '').toLowerCase();
            const isPuzzle = game.includes('puzzle');
            const story: string | null =
              item?.event_description ?? item?.room?.description ?? item?.event_summary ?? null;
            const scheduledAt: string | null = item?.scheduled_at ?? item?.room?.scheduledAt ?? null;
            const roomName: string | null = item?.room?.name ?? item?.event_title ?? null;
            const prizes: RoomPrize[] = Array.isArray(config?.prizes) ? config.prizes : [];
            const quantity = Math.max(1, Number(item?.quantity ?? 1));
            const date = formatEventDate(scheduledAt);
            const time = formatEventTime(scheduledAt);

            return (
              <div key={item?.id ?? index} className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-base font-black text-slate-950">
                      {itemTypeLabel(item?.item_type, game)}
                      {roomName ? ` - ${roomName}` : ''}
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200">
                    ×{quantity}
                  </span>
                </div>

                {story && (
                  <p className="mt-3 whitespace-pre-line text-sm font-semibold leading-6 text-slate-600">
                    {story}
                  </p>
                )}

                <div className="mt-4">
                  <IncludedList item={item} />
                </div>

                <div className="mt-4 grid gap-2 text-sm font-semibold text-slate-600">
                  {isPuzzle ? (
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-[var(--fr-primary)]" /> Play anytime
                    </div>
                  ) : (
                    <>
                      {date && (
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-[var(--fr-primary)]" /> {date}
                        </div>
                      )}
                      {time && (
                        <div className="flex items-center gap-2">
                          <Clock3 className="h-4 w-4 text-[var(--fr-primary)]" /> {time}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {prizes.length > 0 && (
                  <div className="mt-4">
                    <PrizeList prizes={prizes} currency={packCurrency} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {!items.length && (
          <div className="mt-4 rounded-2xl bg-orange-50 p-3 text-sm font-semibold text-slate-600 ring-1 ring-orange-100">
            This pack has no linked activity details yet.
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-2xl bg-slate-950 px-5 py-4 text-base font-black text-white"
        >
          Close
        </button>
      </div>
    </div>
  );
}