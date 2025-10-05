import { useParams } from 'react-router-dom';
import { useQuizSocket } from '../../sockets/QuizSocketProvider';
import { useQuizConfig } from '../../hooks/useQuizConfig';
import type { PrizeAward } from '../../types/quiz';
import { Trophy, Award, CheckCircle2 } from 'lucide-react';

type LeaderboardEntry = { id: string; name: string; score: number };
type Props = {
  leaderboard: LeaderboardEntry[];
};

export default function WinnersAssignPanel({ leaderboard }: Props) {
  const { roomId } = useParams();
  const { socket } = useQuizSocket();
  const { config } = useQuizConfig();

  const prizes = config?.prizes || [];
  const awards: PrizeAward[] = (config?.reconciliation?.prizeAwards || []) as any;

  if (!prizes.length) return null;

  const declaredByPlace = new Map<number, PrizeAward>();
  for (const a of awards) {
    if (typeof a.place === 'number') declaredByPlace.set(a.place, a as any);
  }

  const onDeclare = (place: number, prizeName: string, winner: LeaderboardEntry) => {
    if (!socket || !roomId) return;
    const award: Partial<PrizeAward> = {
      prizeId: `${place}`,
      place,
      prizeName,
      prizeType: 'goods',
      declaredValue: prizes.find(p => p.place === place)?.value ?? undefined,
      currency: config?.currencySymbol || '€',
      sponsor: prizes.find(p => p.place === place)?.sponsor ? { name: prizes.find(p => p.place === place)!.sponsor } : undefined,
      winnerPlayerId: winner.id,
      winnerName: winner.name,
      status: 'declared',
    };
    socket.emit('record_prize_award', { roomId, award });
  };

  const allDeclared = prizes.every(p => declaredByPlace.has(p.place));

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
            <p className="text-sm text-gray-600">Declare prize recipients from final standings</p>
          </div>
        </div>
        {allDeclared && (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-1.5">
            <CheckCircle2 className="h-4 w-4 text-green-700" />
            <span className="text-xs font-medium text-green-800">All Assigned</span>
          </div>
        )}
      </div>

      {/* Prize Cards */}
      <div className="space-y-4">
        {prizes
          .slice()
          .sort((a, b) => a.place - b.place)
          .map((prize) => {
            const already = declaredByPlace.get(prize.place);
            const topCandidates = leaderboard.slice(0, Math.min(5, leaderboard.length));
            const isAssigned = !!already;

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
                            Value: <span className="font-medium">{(config?.currencySymbol || '€')}{prize.value.toFixed(2)}</span>
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

                  {/* Assignment Area */}
                  <div className="flex items-center gap-3">
                    {isAssigned ? (
                      <div className="flex items-center gap-2 rounded-lg bg-white border border-green-300 px-4 py-2 shadow-sm">
                        <Award className="h-4 w-4 text-green-700" />
                        <div>
                          <div className="text-xs text-gray-600">Winner</div>
                          <div className="text-sm font-semibold text-green-900">{already.winnerName}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                          Assign to:
                        </label>
                        <select
                          className="rounded-lg border-2 border-gray-300 bg-white px-3 py-2 text-sm font-medium focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all min-w-[200px]"
                          onChange={(e) => {
                            const idx = Number(e.target.value);
                            if (!Number.isFinite(idx)) return;
                            const pick = topCandidates[idx];
                            onDeclare(prize.place, prize.description, pick);
                          }}
                          defaultValue=""
                        >
                          <option value="" disabled>Choose winner...</option>
                          {topCandidates.map((p, i) => (
                            <option key={p.id} value={i}>
                              #{i + 1} {p.name} — {p.score} pts
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
