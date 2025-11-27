// src/game/completion/WinnersAssignPanel.tsx
import { useParams } from 'react-router-dom';
import { useQuizSocket } from '../../sockets/QuizSocketProvider';
import { useQuizConfig } from '../../hooks/useQuizConfig';
import type { PrizeAward, LeaderboardEntry, PrizeAwardStatus } from '../../types/quiz';

import { Trophy, Award, CheckCircle2, Lock } from 'lucide-react';

type Props = {
  leaderboard: LeaderboardEntry[];
};

export default function WinnersAssignPanel({ leaderboard }: Props) {
  const { roomId } = useParams();
  const { socket } = useQuizSocket();
  const { config } = useQuizConfig();

  const prizes = config?.prizes || [];
  const awards: PrizeAward[] = (config?.reconciliation?.prizeAwards || []) as PrizeAward[];

  console.log('🎁 [WinnersAssignPanel] Component render:', {
    leaderboardLength: leaderboard.length,
    leaderboard: leaderboard.map((l, idx) => `${idx + 1}. ${l.name} (${l.score} pts)`),
    prizesCount: prizes.length,
    awardsCount: awards.length,
    awards: awards.map(a => `Place ${a.place}: ${a.winnerName}`),
  });

  if (!prizes.length) return null;

  // Map already declared winners by prize place
  const declaredByPlace = new Map<number, PrizeAward>();
  for (const a of awards) {
    if (typeof a.place === 'number') {
      console.log(`  Declared prize ${a.place} -> ${a.winnerName} (${a.winnerPlayerId})`);
      declaredByPlace.set(a.place, a);
    }
  }

  // ===== DECLARE WINNER =====
  const onDeclare = (place: number, prizeName: string, winner: LeaderboardEntry) => {
    if (!socket || !roomId) return;

    console.log('🎯 [WinnersAssignPanel] Declaring winner:', {
      place,
      prizeName,
      winner: { id: winner.id, name: winner.name, score: winner.score },
    });

    const prizeAwardId = crypto.randomUUID();
    const prizeConfig = prizes.find((p) => p.place === place);

    // --- Build status history entry (TS exactOptionalPropertyTypes safe) ---
    const statusHistoryEntry: {
      status: PrizeAwardStatus;
      at: string;
      byUserId: string;
      byUserName?: string;
      note?: string;
    } = {
      status: 'declared',
      at: new Date().toISOString(),
      byUserId: config?.hostId || 'system',
      note: 'Manually assigned from winner panel',
    };

    if (config?.hostName) {
      statusHistoryEntry.byUserName = config.hostName;
    }

    // --- NEW Award Object ---
    const award: PrizeAward = {
      prizeAwardId,
      prizeId: `${place}`,
      place,
      prizeName,
      prizeType: 'goods',
      currency: config?.currencySymbol || '€',
      winnerPlayerId: winner.id,
      winnerName: winner.name,
      status: 'declared',
      statusHistory: [statusHistoryEntry],
    };

    if (typeof prizeConfig?.value === 'number') {
      award.declaredValue = prizeConfig.value;
    }
    if (prizeConfig?.sponsor) {
      award.sponsor = { name: prizeConfig.sponsor };
    }

    console.log('📤 [WinnersAssignPanel] Emitting record_prize_award:', award);

    // NEW AWARD — backend handles dedupe + merge
    socket.emit('record_prize_award', { roomId, award });
  };

  const allDeclared = prizes.every((p) => declaredByPlace.has(p.place));
  const isLocked = false; // unchanged

  return (
    <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-6 shadow-sm">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-100 p-2">
            <Trophy className="h-5 w-5 text-blue-700" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Assign Winners</h3>
            <p className="text-sm text-gray-600">
              Winners auto-assigned from final standings — verify or adjust as needed.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {allDeclared && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-1.5">
              <CheckCircle2 className="h-4 w-4 text-green-700" />
              <span className="text-xs font-medium text-green-800">All Assigned</span>
            </div>
          )}

          {isLocked && (
            <div className="flex items-center gap-2 rounded-lg bg-gray-100 border border-gray-300 px-3 py-1.5">
              <Lock className="h-4 w-4 text-gray-700" />
              <span className="text-xs font-medium text-gray-800">Locked</span>
            </div>
          )}
        </div>
      </div>

      {/* Auto-assignment info */}
      {!allDeclared && !isLocked && (
        <div className="mb-5 rounded-lg bg-blue-50 border border-blue-200 p-3">
          <p className="text-sm text-blue-800">
            <strong>Auto-Assignment:</strong> Winners are automatically matched to prizes based on
            final leaderboard position. You can override these assignments manually.
          </p>
        </div>
      )}

      {/* Prize Cards */}
      <div className="space-y-4">
        {prizes
          .slice()
          .sort((a, b) => a.place - b.place)
          .map((prize) => {
            const already = declaredByPlace.get(prize.place);
            const topCandidates = leaderboard.slice(0, Math.min(5, leaderboard.length));
            const isAssigned = !!already;

            console.log(`🏆 Prize ${prize.place} (${prize.description}):`, {
              isAssigned,
              currentWinner: already ? `${already.winnerName} (${already.winnerPlayerId})` : 'none',
              suggestedWinner: topCandidates[prize.place - 1] 
                ? `${topCandidates[prize.place - 1].name} (${topCandidates[prize.place - 1].id})`
                : 'none',
              topCandidates: topCandidates.map((c, idx) => `${idx + 1}. ${c.name} (${c.score} pts)`),
            });

            return (
              <div
                key={prize.place}
                className={`rounded-lg border-2 bg-white p-4 transition-all ${
                  isAssigned
                    ? 'border-green-200 bg-green-50/50'
                    : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Prize Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 text-white text-sm font-bold shadow-sm">
                        {prize.place}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          {prize.description}
                        </div>

                        {typeof prize.value === 'number' && (
                          <div className="text-xs text-gray-600 mt-0.5">
                            Value:{' '}
                            <span className="font-medium">
                              {(config?.currencySymbol || '€')}
                              {prize.value.toFixed(2)}
                            </span>

                            {prize.sponsor && (
                              <span className="ml-2 text-purple-600">
                                • Sponsor: {prize.sponsor}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Winner Assignment */}
                  <div className="flex items-center gap-3">
                    {isAssigned ? (
                      <div className="flex items-center gap-2 rounded-lg bg-white border border-green-300 px-4 py-2 shadow-sm">
                        <Award className="h-4 w-4 text-green-700" />
                        <div>
                          <div className="text-xs text-gray-600">Winner</div>
                          <div className="text-sm font-semibold text-green-900">
                            {already.winnerName}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                          Assign to:
                        </label>

                        <select
                          className="rounded-lg border-2 border-gray-300 bg-white px-3 py-2 text-sm font-medium focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all min-w-[200px] disabled:bg-gray-100 disabled:cursor-not-allowed"
                          onChange={(e) => {
                            const idx = Number(e.target.value);
                            console.log('👤 [WinnersAssignPanel] Select changed:', {
                              selectedIndex: idx,
                              prizePlace: prize.place,
                              prizeName: prize.description,
                            });

                            if (!Number.isFinite(idx)) return;

                            const pick = topCandidates[idx];
                            if (pick) {
                              console.log('  Selected winner:', pick);
                              onDeclare(prize.place, prize.description, pick);
                            } else {
                              console.warn('  ⚠️ No candidate found at index:', idx);
                            }
                          }}
                          disabled={isLocked}
                          defaultValue=""
                        >
                          <option value="" disabled>
                            {isLocked ? 'Locked - no changes allowed' : 'Choose winner...'}
                          </option>

                          {!isLocked &&
                            topCandidates.map((p, i) => (
                              <option key={p.id} value={i}>
                                #{i + 1} {p.name} — {p.score} pts
                              </option>
                            ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Suggested */}
                {!isAssigned && !isLocked && topCandidates.length > 0 && (
                  <div className="mt-3 text-xs text-gray-600 bg-gray-50 rounded p-2 border border-gray-200">
                    💡 Suggested:{' '}
                    <strong>
                      {topCandidates[prize.place - 1]?.name || topCandidates[0]?.name}
                    </strong>{' '}
                    based on leaderboard position #{prize.place}
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* Completion Notice */}
      {allDeclared && (
        <div className="mt-5 rounded-lg bg-green-50 border border-green-200 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-700 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-green-900 mb-1">
                All Winners Declared
              </h4>
              <p className="text-sm text-green-800">
                Prize declarations are complete. Proceed to the "Prize Delivery & Status" section
                below to track distribution and finalize the workflow.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


