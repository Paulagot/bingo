// src/components/Quiz/dashboard/PoolTab.tsx
import React, { useMemo } from 'react';
import { usePlayerStore } from '../hooks/usePlayerStore';
import { useQuizConfig } from '../hooks/useQuizConfig';
import { Coins, Users, Trophy, Heart, User } from 'lucide-react';

// ─── Pool split constants ──────────────────────────────────────────────────────
const POOL_SPLITS = [
  { key: 'host',    pct: 25, label: 'Host',    color: 'indigo' as const, Icon: User },
  { key: 'charity', pct: 30, label: 'Charity', color: 'pink'   as const, Icon: Heart },
  { key: 'prizes',  pct: 30, label: 'Prizes',  color: 'yellow' as const, Icon: Trophy },
] as const;

const PRIZE_SPLITS = [
  { place: 1, label: '1st place', pct: 18 },
  { place: 2, label: '2nd place', pct: 12 },
] as const;

// Remaining 15% — platform fee / unallocated (25 + 30 + 30 = 85, so 15 left)
const PLATFORM_PCT = 15;

// ─── Color map ─────────────────────────────────────────────────────────────────
type ColorKey = 'indigo' | 'pink' | 'yellow' | 'gray';

const COLOR: Record<ColorKey, { bg: string; border: string; text: string; bar: string }> = {
  indigo: { bg: 'bg-indigo-50',  border: 'border-indigo-200', text: 'text-indigo-800',  bar: 'bg-indigo-500'  },
  pink:   { bg: 'bg-pink-50',    border: 'border-pink-200',   text: 'text-pink-800',    bar: 'bg-pink-500'    },
  yellow: { bg: 'bg-yellow-50',  border: 'border-yellow-200', text: 'text-yellow-800',  bar: 'bg-yellow-500'  },
  gray:   { bg: 'bg-gray-50',    border: 'border-gray-200',   text: 'text-gray-700',    bar: 'bg-gray-400'    },
};

// ─── Helper: sum what a single player has paid (entry + confirmed extras) ──────
function playerTotal(player: any, entryFee: number): number {
  // Entry fee — only count if the player is marked paid (on-chain confirmation)
  const entry = player.paid ? entryFee : 0;

  // Extras — each key in extraPayments is { amount, method }
  const extras = player.extraPayments
    ? Object.values(player.extraPayments as Record<string, { amount?: number }>).reduce(
        (sum, val) => sum + (Number(val?.amount) || 0),
        0,
      )
    : 0;

  return entry + extras;
}

// ─── Component ─────────────────────────────────────────────────────────────────
const PoolTab: React.FC = () => {
  const { players } = usePlayerStore();
  const { config } = useQuizConfig();

  const entryFee    = parseFloat(String(config?.entryFee ?? '0'));
  const currency    = config?.currencySymbol ?? '€';

  // Token info — Web3 rooms may store these; fall back to currency symbol
  const tokenSymbol: string = (config as any)?.tokenSymbol ?? (config as any)?.currency ?? currency;
  const tokenName:   string = (config as any)?.tokenName   ?? tokenSymbol;

  const activePlayers = useMemo(
    () => (players ?? []).filter((p: any) => !p.disqualified),
    [players],
  );

  const paidCount = useMemo(
    () => activePlayers.filter((p: any) => p.paid).length,
    [activePlayers],
  );

  // ✅ Extras-aware pool: sum every active player's actual total paid
  const totalPool = useMemo(
    () => activePlayers.reduce((sum: number, p: any) => sum + playerTotal(p, entryFee), 0),
    [activePlayers, entryFee],
  );

  // Breakdown: pure entry fees vs extras
  const totalEntryFees = useMemo(
    () => activePlayers.filter((p: any) => p.paid).length * entryFee,
    [activePlayers, entryFee],
  );

  const totalExtras = useMemo(
    () =>
      activePlayers.reduce((sum: number, p: any) => {
        if (!p.extraPayments) return sum;
        return (
          sum +
          Object.values(p.extraPayments as Record<string, { amount?: number }>).reduce(
            (s, v) => s + (Number(v?.amount) || 0),
            0,
          )
        );
      }, 0),
    [activePlayers],
  );

const fmt = (n: number) => {
  if (n === 0) return `${tokenSymbol}0`;
  
  // If the number is very small (< 0.01), show up to 8 decimal places
  if (Math.abs(n) < 0.01) {
    // Strip trailing zeros but keep meaningful precision
    return `${tokenSymbol}${n.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    })}`;
  }

  // For normal amounts, show 2–6 decimals (strips trailing zeros)
  return `${tokenSymbol}${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  })}`;
};

  return (
    <div className="space-y-6">
      {/* ── Hero card ──────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600">
              <Coins className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-indigo-900">Total Pool</h2>
              <p className="text-sm text-indigo-700 mt-0.5">
                Updates live as players join &amp; pay · {tokenName}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-indigo-900">{fmt(totalPool)}</div>
            <div className="text-sm text-indigo-600 mt-0.5">
              {activePlayers.length} player{activePlayers.length !== 1 ? 's' : ''} ·{' '}
              {tokenSymbol}{entryFee} entry
              {totalExtras > 0 && ` + ${fmt(totalExtras)} extras`}
            </div>
          </div>
        </div>

        {/* Stacked progress bar */}
        <div className="mt-5">
          <div className="flex h-4 w-full overflow-hidden rounded-full bg-gray-200">
            {POOL_SPLITS.map(({ key, pct, color }) => (
              <div
                key={key}
                className={`${COLOR[color].bar} transition-all duration-500`}
                style={{ width: `${pct}%` }}
                title={`${key}: ${pct}%`}
              />
            ))}
            <div
              className="bg-gray-300 transition-all duration-500"
              style={{ width: `${PLATFORM_PCT}%` }}
              title={`Platform: ${PLATFORM_PCT}%`}
            />
          </div>
          {/* Legend */}
          <div className="mt-2 flex flex-wrap gap-3">
            {POOL_SPLITS.map(({ key, pct, label, color }) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className={`h-3 w-3 rounded-full ${COLOR[color].bar}`} />
                <span className="text-xs text-gray-600">{label} {pct}%</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full bg-gray-300" />
              <span className="text-xs text-gray-600">Platform {PLATFORM_PCT}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats row ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center">
          <Users className="mx-auto mb-1 h-5 w-5 text-gray-500" />
          <div className="text-2xl font-bold text-gray-900">{activePlayers.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">Players joined</div>
        </div>

        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center">
          <Users className="mx-auto mb-1 h-5 w-5 text-green-600" />
          <div className="text-2xl font-bold text-green-900">{paidCount}</div>
          <div className="text-xs text-green-600 mt-0.5">Confirmed paid</div>
        </div>

        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 text-center">
          <Coins className="mx-auto mb-1 h-5 w-5 text-indigo-600" />
          <div className="text-xl font-bold text-indigo-900">{fmt(totalEntryFees)}</div>
          <div className="text-xs text-indigo-600 mt-0.5">Entry fees</div>
        </div>

        <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 text-center">
          <Trophy className="mx-auto mb-1 h-5 w-5 text-purple-600" />
          <div className="text-xl font-bold text-purple-900">{fmt((totalPool * 30) / 100)}</div>
          <div className="text-xs text-purple-600 mt-0.5">Prize pool (30%)</div>
        </div>
      </div>

      {/* Extras callout — only shown when extras exist */}
      {totalExtras > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start gap-2">
            <Coins className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-900">
              <span className="font-semibold">Extras included in pool:</span>{' '}
              Players purchased {fmt(totalExtras)} in optional extras. This is included in the
              total pool and split by the same percentages below.
            </div>
          </div>
        </div>
      )}

      {/* ── Pool allocation ────────────────────────────────────────────────────── */}
      <div className="rounded-xl border-2 border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-200 bg-gray-50 px-5 py-3">
          <h3 className="font-bold text-gray-900">Pool Allocation</h3>
          <p className="text-xs text-gray-500 mt-0.5">How the full pool is distributed</p>
        </div>

        <div className="divide-y divide-gray-100">
          {POOL_SPLITS.map(({ key, pct, label, color, Icon }) => {
            const c = COLOR[color];
            const amount = (totalPool * pct) / 100;
            return (
              <div key={key} className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full ${c.bg} border ${c.border}`}>
                    <Icon className={`h-4 w-4 ${c.text}`} />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{label}</div>
                    <div className="text-xs text-gray-500">{pct}% of pool</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-900">{fmt(amount)}</div>
                  <div className={`text-xs font-medium ${c.text}`}>{pct}%</div>
                </div>
              </div>
            );
          })}

          {/* Platform row */}
          <div className="flex items-center justify-between px-5 py-4 bg-gray-50">
            <div className="flex items-center gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-full ${COLOR.gray.bg} border ${COLOR.gray.border}`}>
                <Coins className={`h-4 w-4 ${COLOR.gray.text}`} />
              </div>
              <div>
                <div className="font-semibold text-gray-700">Platform</div>
                <div className="text-xs text-gray-400">{PLATFORM_PCT}% of pool</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-gray-700">{fmt((totalPool * PLATFORM_PCT) / 100)}</div>
              <div className={`text-xs font-medium ${COLOR.gray.text}`}>{PLATFORM_PCT}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Prize breakdown ────────────────────────────────────────────────────── */}
      <div className="rounded-xl border-2 border-yellow-200 bg-white overflow-hidden">
        <div className="border-b border-yellow-200 bg-yellow-50 px-5 py-3">
          <h3 className="font-bold text-yellow-900">Prize Breakdown</h3>
          <p className="text-xs text-yellow-700 mt-0.5">
            30% of pool · currently {fmt((totalPool * 30) / 100)}
          </p>
        </div>

        <div className="divide-y divide-yellow-100">
          {PRIZE_SPLITS.map(({ place, label, pct }) => (
            <div key={place} className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 text-white text-sm font-bold">
                  {place}
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{label}</div>
                  <div className="text-xs text-gray-500">{pct}% of total pool</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-gray-900">{fmt((totalPool * pct) / 100)}</div>
                <div className="text-xs font-medium text-yellow-700">{pct}%</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Token info ─────────────────────────────────────────────────────────── */}
      {tokenName && (
        <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Coins className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-semibold text-purple-900">Token</span>
          </div>
          <div className="flex gap-6 flex-wrap">
            <div>
              <div className="text-xs text-purple-600">Symbol</div>
              <div className="font-mono font-bold text-purple-900">{tokenSymbol}</div>
            </div>
            {tokenName !== tokenSymbol && (
              <div>
                <div className="text-xs text-purple-600">Name</div>
                <div className="font-semibold text-purple-900">{tokenName}</div>
              </div>
            )}
            {(config as any)?.tokenAddress && (
              <div>
                <div className="text-xs text-purple-600">Contract</div>
                <div className="font-mono text-xs text-purple-800 break-all">
                  {(config as any).tokenAddress}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PoolTab;