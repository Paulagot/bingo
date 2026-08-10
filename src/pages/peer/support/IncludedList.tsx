// IncludedList.tsx
// "What's included" for one activity, rebuilt from the room config that's
// already in the payload: a quiz shows entry + each enabled fundraising extra;
// a puzzle drop shows "choose N of these" with the puzzle names; everything else
// falls back to a single descriptive line. Pure `describeIncluded` is exported
// so it can be unit-tested without rendering.

import { Check } from 'lucide-react';
import { parseJsonMaybe, itemTypeLabel } from './peerSupporthelpers';

const EXTRA_LABELS: Record<string, string> = {
  buyHint: 'Hint',
  restorePoints: 'Restore Points',
  robPoints: 'Rob Points',
  freezeOutTeam: 'Freeze Out Team',
};

function prettify(value: string): string {
  return String(value || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase());
}

export type Included = { header?: string; items: string[] };

export function describeIncluded(item: any): Included {
  const config = parseJsonMaybe<any>(item?.config_json) ?? {};
  const meta = parseJsonMaybe<any>(item?.metadata_json) ?? {};
  const game = String(item?.game_type ?? item?.room?.gameType ?? '').toLowerCase();

  if (game === 'quiz') {
    const items = ['Quiz entry'];
    const opts = (config.fundraisingOptions ?? {}) as Record<string, unknown>;
    for (const [key, on] of Object.entries(opts)) {
      if (on === true) items.push(EXTRA_LABELS[key] ?? prettify(key));
    }
    return { items };
  }

  if (game.includes('puzzle')) {
    const puzzles = (config.puzzleItems ?? meta.puzzleItems ?? []) as Array<{ puzzleType?: string }>;
    const names = puzzles.map(p => prettify(p?.puzzleType ?? '')).filter(Boolean);
    const qty = Number(meta.puzzleQuantity ?? config.puzzleQuantity ?? 0);
    if (names.length) {
      const header = qty > 0
        ? `Choose ${qty} of these ${names.length} puzzles`
        : 'Includes these puzzles';
      return { header, items: names };
    }
    return { items: [itemTypeLabel(item?.item_type, game)] };
  }

  if (game === 'ticketed_event') {
    return { items: [String(meta.ticketTypeName ?? item?.room?.name ?? 'Event ticket')] };
  }

  return { items: [itemTypeLabel(item?.item_type, game)] };
}

export default function IncludedList({ item }: { item: any }) {
  const { header, items } = describeIncluded(item);
  if (!items.length) return null;

  return (
    <div>
      <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">What's included</p>
      {header && <p className="mb-1.5 text-xs font-semibold text-slate-500">{header}</p>}
      <ul className="space-y-1">
        {items.map((line, i) => (
          <li key={i} className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <Check className="h-4 w-4 shrink-0 rounded-full bg-[var(--fr-primary)] p-0.5 text-white" />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}