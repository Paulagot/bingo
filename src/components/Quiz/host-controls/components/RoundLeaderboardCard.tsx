import { Medal, Trophy, Crown, Award } from 'lucide-react';

type Entry = { id: string; name: string; score: number };
type Props = {
  roundNumber: number;
  leaderboard: Entry[];
  onContinue: () => void;
};

export default function RoundLeaderboardCard({ roundNumber, leaderboard, onContinue }: Props) {
  return (
    <div className="bg-muted mb-6 rounded-xl border-2 border-purple-200 p-6 shadow-lg">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-fg flex items-center space-x-2 text-lg font-bold">
          <Medal className="h-5 w-5 text-purple-600" />
          <span>Round {roundNumber} Results</span>
        </h3>
        <button
          onClick={onContinue}
          className="flex items-center space-x-2 rounded-lg bg-purple-600 px-4 py-2 font-medium text-white transition hover:bg-purple-700"
        >
          <Trophy className="h-4 w-4" />
          <span>Show Overall Leaderboard</span>
        </button>
      </div>

      <div className="rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 p-4">
        <div className="mb-4 text-center">
          <h4 className="mb-2 text-xl font-bold text-purple-800">🎉 Round {roundNumber} Complete!</h4>
          <p className="text-purple-600">Here's how everyone performed this round</p>
        </div>
        <div className="space-y-2">
          {leaderboard.map((entry, idx) => (
            <div key={entry.id} className="bg-muted flex items-center justify-between rounded border-2 border-purple-200 p-3">
              <div className="flex items-center space-x-3">
                <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                  idx === 0 ? 'bg-yellow-100 text-yellow-800 shadow-md' :
                  idx === 1 ? 'text-fg bg-gray-100 shadow-md' :
                  idx === 2 ? 'bg-orange-100 text-orange-800 shadow-md' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {idx + 1}
                </span>
                <span className="font-medium">{entry.name}</span>
                {idx === 0 && <Crown className="h-4 w-4 text-yellow-600" />}
                {idx === 1 && <Medal className="text-fg/70 h-4 w-4" />}
                {idx === 2 && <Award className="h-4 w-4 text-orange-600" />}
              </div>
              <span className="text-fg font-bold">{entry.score} pts</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
