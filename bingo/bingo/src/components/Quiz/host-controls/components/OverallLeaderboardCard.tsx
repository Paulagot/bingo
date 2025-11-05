import { Crown, SkipForward, Trophy } from 'lucide-react';
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
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const continueLabel = (() => {
    if (!isFinalRound) return 'Continue to Next Round';
    return hasPrizeTie ? 'Start Tiebreaker' : 'Finalize Game';
  })();

  const handlePrimaryClick = () => {
    if (isFinalRound && hasPrizeTie) {
      setConfirmOpen(true);
      return;
    }
    onContinue();
  };

  return (
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

      {/* List */}
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

      {/* Two-step confirmation for tiebreaker */}
      {confirmOpen && (
        <div className="mt-4 rounded-lg border-2 border-amber-300 bg-amber-50 p-4">
          <div className="mb-2 text-amber-900 font-bold">Tie detected at a prize boundary</div>
          <div className="text-amber-800 text-sm">Participants:</div>
          <div className="mt-1 text-amber-800">{tieParticipants.join(', ') || '—'}</div>

          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => setConfirmOpen(false)}
              className="rounded-lg bg-gray-200 px-3 py-1 text-sm text-gray-800 hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={onConfirmTiebreaker}
              className="rounded-lg bg-amber-600 px-3 py-1 text-sm font-semibold text-white hover:bg-amber-700"
            >
              Start Tiebreaker
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
