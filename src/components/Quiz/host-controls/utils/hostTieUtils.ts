// src/components/Quiz/host-controls/utils/hostTieUtils.ts
export function computePrizeCount(cfg: any): number {
  const s = cfg?.web3PrizeStructure;
  if (s && typeof s === 'object') {
    const keys = ['firstPlace', 'secondPlace', 'thirdPlace', 'fourthPlace', 'fifthPlace'];
    const cnt = keys.reduce((n, k) => {
      const v = Number(s[k]);
      return n + (Number.isFinite(v) && v > 0 ? 1 : 0);
    }, 0);
    if (cnt > 0) return cnt;
  }

  if (Array.isArray(cfg?.web3PrizeSplit)) {
    const cnt = cfg.web3PrizeSplit.filter((x: any) => {
      const v = typeof x === 'number' ? x : Number(x?.amount ?? x?.percent);
      return Number.isFinite(v) && v > 0;
    }).length;
    if (cnt > 0) return cnt;
  }

  if (Array.isArray(cfg?.prizes)) {
    const cnt = cfg.prizes.filter((p: any) => {
      if (p == null) return false;
      const v = Number(p?.amount);
      return Number.isFinite(v) ? v > 0 : true;
    }).length;
    if (cnt > 0) return cnt;
  }

  return 1; // conservative fallback
}

export function findPrizeBoundaryTies(
  leaderboard: { id: string; name: string; score: number }[],
  prizeCount: number
) {
  if (!leaderboard?.length) return [];

  const ties: { boundary: number; playerIds: string[] }[] = [];

  // tie for 1st
  const topScore = leaderboard[0]?.score ?? 0;
  const firstGroup = leaderboard
    .filter(e => (e.score ?? 0) === topScore)
    .map(e => e.id);
  if (firstGroup.length > 1) ties.push({ boundary: 1, playerIds: firstGroup });

  // ties for 2nd..prizeCount
  for (let k = 2; k <= prizeCount; k++) {
    const idx = k - 1;
    const kthScore = leaderboard[idx]?.score;
    if (kthScore == null) continue;
    const group = leaderboard.filter(e => e.score === kthScore).map(e => e.id);
    if (group.length > 1) ties.push({ boundary: k, playerIds: group });
  }

  return ties.filter((t, i, a) => a.findIndex(z => z.boundary === t.boundary) === i);
}
