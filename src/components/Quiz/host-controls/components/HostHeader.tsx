import { Users } from 'lucide-react';

type Props = {
  roomId: string;
  connected: boolean;
  currentRound: number;
  totalRounds: number;
  phase: string;
};

export default function HostHeader({ roomId, connected, currentRound, totalRounds, phase }: Props) {
  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="text-fg mb-2 flex items-center justify-center space-x-3 text-3xl font-bold md:text-4xl">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-2xl text-white">👑</div>
          <span>Host Dashboard</span>
        </h1>
        <p className="text-fg/70 text-lg">Control your quiz experience</p>
        <p className="text-fg/60 mt-2 text-sm">Room: {roomId}</p>
      </div>

      <div className="bg-muted border-border mb-6 rounded-xl border p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <span className="text-fg text-lg font-semibold">Round {currentRound} / {totalRounds}</span>
            <div className="flex items-center space-x-2">
              <div className={`h-3 w-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-fg/70 text-sm">{connected ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${
            phase === 'waiting' ? 'bg-yellow-100 text-yellow-800' :
            phase === 'launched' ? 'bg-green-100 text-green-800' :
            phase === 'asking' ? 'bg-blue-100 text-blue-800' :
            phase === 'reviewing' ? 'bg-orange-100 text-orange-800' :
            phase === 'leaderboard' ? 'bg-purple-100 text-purple-800' :
            'text-fg bg-gray-100'
          }`}>
            {phase.charAt(0).toUpperCase() + phase.slice(1)}
          </span>
        </div>
      </div>
    </>
  );
}
