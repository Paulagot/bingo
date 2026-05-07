import { Crown, Medal, SkipForward, Trophy, X } from 'lucide-react';
import React from 'react';

type Entry = { id: string; name: string; score: number };
type Props = {
  leaderboard: Entry[];
  isFinalRound: boolean;
  prizeCount: number;
  hasPrizeTie: boolean;
  tieParticipants: string[];         // player names for preview
  onContinue: () => void;            // default flow (no tie or not final)
  onConfirmTiebreaker: () => void;   // emits next_round_or_end
};

export default function OverallLeaderboardCard({
  leaderboard,
  isFinalRound,
  prizeCount,
  hasPrizeTie,
  tieParticipants,
  onContinue,
  onConfirmTiebreaker
}: Props) {
  const [modalOpen, setModalOpen] = React.useState(false);

  const continueLabel = (() => {
    if (!isFinalRound) return 'Continue to Next Round';
    return hasPrizeTie ? 'Start Tiebreaker' : 'Finalize Game';
  })();

  const handlePrimaryClick = () => {
    if (isFinalRound && hasPrizeTie) {
      setModalOpen(true);
      return;
    }
    onContinue();
  };

  const handleConfirm = () => {
    setModalOpen(false);
    onConfirmTiebreaker();
  };

  return (
    <>
      <div className="bg-muted mb-6 rounded-xl border-2 border-green-200 p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-fg flex items-center space-x-2 text-lg font-bold">
            <Trophy className="h-5 w-5 text-yellow-600" />
            <span>Overall Leaderboard</span>
            <span className="ml-3 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
              Prizes: {prizeCount}{hasPrizeTie ? ' • tie detected' : ''}
            </span>
          </h3>

          <button
            onClick={handlePrimaryClick}
            className={`flex items-center space-x-2 rounded-lg px-4 py-2 font-medium text-white transition
              ${hasPrizeTie
                ? 'bg-amber-600 hover:bg-amber-700'
                : isFinalRound
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-green-600 hover:bg-green-700'}`}
            title={
              hasPrizeTie
                ? 'A prize-boundary tie exists. Click to review & start the tiebreaker.'
                : isFinalRound
                  ? 'No tie detected. Click to finalize the game.'
                  : 'Continue to the next round.'
            }
          >
            <SkipForward className="h-4 w-4" />
            <span>{continueLabel}</span>
          </button>
        </div>

        {/* Leaderboard list */}
        <div className="rounded-lg bg-green-50 p-4">
          <div className="space-y-2">
            {leaderboard.map((entry, idx) => (
              <div key={entry.id} className="bg-muted flex items-center justify-between rounded border p-3">
                <div className="flex items-center space-x-3">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                    idx === 0 ? 'bg-yellow-100 text-yellow-800' :
                    idx === 1 ? 'text-fg bg-gray-100' :
                    idx === 2 ? 'bg-orange-100 text-orange-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {idx + 1}
                  </span>
                  <span className="font-medium">{entry.name}</span>
                  {idx === 0 && <Crown className="h-4 w-4 text-yellow-600" />}
                </div>
                <span className="text-fg font-bold">{entry.score} pts</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tiebreaker confirmation modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between rounded-t-2xl bg-gradient-to-r from-amber-500 to-yellow-500 px-6 py-4">
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                  <Trophy className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-lg font-bold text-white">Tie Detected!</h2>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/30"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-6">
              <p className="mb-4 text-gray-700">
                There is a tie at a prize boundary. A tie-breaker round will determine the final standings.
              </p>

              {/* Tied players */}
              <div className="mb-6 rounded-xl border-2 border-amber-200 bg-amber-50 p-4">
                <div className="mb-2 text-sm font-semibold text-amber-800">Tied players:</div>
                <div className="flex flex-wrap gap-2">
                  {tieParticipants.length > 0
                    ? tieParticipants.map((name, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center space-x-1 rounded-full bg-amber-200 px-3 py-1 text-sm font-medium text-amber-900"
                        >
                          <Medal className="h-3 w-3" />
                          <span>{name}</span>
                        </span>
                      ))
                    : <span className="text-sm text-amber-700">—</span>
                  }
                </div>
              </div>

              <p className="mb-6 text-sm text-gray-500">
                Players will be asked to guess a number. The closest answer wins. This happens automatically — you just need to confirm to start.
              </p>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setModalOpen(false)}
                  className="flex-1 rounded-lg border-2 border-gray-200 px-4 py-2.5 font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex flex-1 items-center justify-center space-x-2 rounded-lg bg-amber-600 px-4 py-2.5 font-semibold text-white transition hover:bg-amber-700"
                >
                  <Trophy className="h-4 w-4" />
                  <span>Start Tiebreaker</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
