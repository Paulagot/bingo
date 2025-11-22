// src/quiz/components/reports/deriveCore.ts
// Shared centralised reconciliation + prize + leaderboard derivation

export type CorePayload = {
  config: any;
  players: any[];
  allRoundsStats?: any[];
};

export function deriveCore(payload: CorePayload) {
  const { config, players } = payload;

  const currency = config?.currencySymbol || '€';
  const entryFee = parseFloat(config?.entryFee || '0') || 0;

  const active = (players || []).filter((p) => !p.disqualified);
  const paid = active.filter((p) => p.paid);
  const unpaid = active.filter((p) => !p.paid);

  // ---------------------------
  // Payment method aggregation
  // ---------------------------
  type MethodTotals = { entry: number; extrasAmount: number; extrasCount: number; total: number };
  const methodMap: Record<string, MethodTotals> = {};

  const methodBump = (method: string) => {
    if (!methodMap[method]) {
      methodMap[method] = { entry: 0, extrasAmount: 0, extrasCount: 0, total: 0 };
    }
    return methodMap[method];
  };

  for (const p of active) {
    const primary = p.paymentMethod || 'unknown';
    if (p.paid) {
      methodBump(primary).entry += entryFee;
    }

    const extras = p.extraPayments || {};
    for (const key of Object.keys(extras)) {
      const ex = extras[key];
      const m = (ex?.method || 'unknown') as string;
      const amt = Number(ex?.amount || 0);
      methodBump(m).extrasAmount += amt;
      methodBump(m).extrasCount += 1;
    }
  }

  for (const k of Object.keys(methodMap)) {
    const m = methodMap[k];
    if (m) m.total = m.entry + m.extrasAmount;
  }

  const totalEntryReceived = paid.length * entryFee;
  const totalExtrasAmount = Object.values(methodMap).reduce((s, t) => s + t.extrasAmount, 0);
  const totalExtrasCount = Object.values(methodMap).reduce((s, t) => s + t.extrasCount, 0);
  const totalReceived = totalEntryReceived + totalExtrasAmount;

  // ---------------------------
  // Ledger totals
  // ---------------------------
  const ledger = (config?.reconciliation?.ledger || []) as any[];
  let fees = 0,
    refunds = 0,
    otherAdj = 0;

  for (const l of ledger) {
    const amt = Number(l.amount || 0);
    if (l.type === 'fee') fees += amt;
    else if (l.type === 'refund') refunds += amt;
    else if (l.type && l.type !== 'received') otherAdj += amt;
  }

  const netAdjustments = fees - refunds + otherAdj;

  // ---------------------------
  // Leaderboard
  // ---------------------------
  const leaderboard = [...active]
    .map((p) => ({
      id: p.id,
      name: p.name || '',
      score: Number(p.score || 0),
      cumulativeNegativePoints: Number(p.cumulativeNegativePoints || 0),
      pointsRestored: Number(p.pointsRestored || 0),
      tiebreakerBonus: Number(p.tiebreakerBonus || 0),
    }))
    .sort((a, b) => b.score - a.score)
    .map((p, idx) => ({ rank: idx + 1, ...p }));

  // ---------------------------
  // Prizes & Awards
  // ---------------------------
  type Award = {
    prizeAwardId: string;
    prizeId?: string | number;
    prizeName?: string;
    prizeValue?: number | null;
    declaredValue?: number | null;
    sponsor?: { name?: string } | string | null;
    place?: number;
    winnerPlayerId?: string;
    winnerName?: string;
    status?: string;
    declaredAt?: string;
    deliveredAt?: string;
    collectedAt?: string;
    statusHistory?: Array<{
      status: string;
      at: string;
      byUserId?: string;
      byUserName?: string;
      note?: string;
    }>;
    awardMethod?: string;
    awardReference?: string;
    note?: string;
  };

  const awards: Award[] = ((config?.reconciliation as any)?.prizeAwards || []) as Award[];

  const prizesByStatus = awards.reduce((acc, a) => {
    const status = a.status || 'declared';
    const value = Number(a.declaredValue || a.prizeValue || 0);
    if (!acc[status]) acc[status] = { count: 0, value: 0 };
    acc[status].count++;
    acc[status].value += value;
    return acc;
  }, {} as Record<string, { count: number; value: number }>);

  const totalPrizeValue = awards.reduce(
    (sum, a) => sum + Number(a.declaredValue || a.prizeValue || 0),
    0
  );

  const deliveredCount =
    (prizesByStatus['delivered']?.count || 0) + (prizesByStatus['collected']?.count || 0);
  const deliveredValue =
    (prizesByStatus['delivered']?.value || 0) + (prizesByStatus['collected']?.value || 0);

  const unclaimedCount =
    (prizesByStatus['unclaimed']?.count || 0) + (prizesByStatus['refused']?.count || 0);
  const unclaimedValue =
    (prizesByStatus['unclaimed']?.value || 0) + (prizesByStatus['refused']?.value || 0);

  return {
    currency,
    entryFee,
    active,
    paid,
    unpaid,
    methodMap,
    totalEntryReceived,
    totalExtrasAmount,
    totalExtrasCount,
    totalReceived,
    ledger,
    fees,
    refunds,
    otherAdj,
    netAdjustments,
    leaderboard,
    awards,
    prizesByStatus,
    totalPrizeValue,
    deliveredCount,
    deliveredValue,
    unclaimedCount,
    unclaimedValue,
  };
}
