// src/components/mgtsystem/components/digitalEvents/tabs/OverviewTab.tsx
import { Calendar, User, Layers, DollarSign, Users, Trophy, Hash, Link2 } from 'lucide-react';
import type { Web2RoomListItem as Room } from '../../../../../shared/api/quiz.api';
import type { RoomStats } from '../../../services/quizRoomServices';

interface Props {
  room: Room;
  config: any;
  stats?: RoomStats;
  linkedEventTitle?: string | null;
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="mt-0.5 flex-shrink-0 text-gray-400">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</div>
        <div className="mt-0.5 text-sm font-medium text-gray-900">{children}</div>
      </div>
    </div>
  );
}

export default function OverviewTab({ room, config, stats, linkedEventTitle }: Props) {
  const prizes      = config?.prizes || [];
  const rounds      = config?.roundDefinitions || [];
  const entryFee    = config?.entryFee || '0';
  const currency    = config?.currencySymbol || '€';
  const maxPlayers  = config?.roomCaps?.maxPlayers || 0;
  const prizeTotal  = prizes.reduce((s: number, p: any) => s + (p.value || 0), 0);

  const dateStr = room.scheduled_at
    ? new Date(room.scheduled_at).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : 'Not scheduled';
  const timeStr = room.scheduled_at
    ? new Date(room.scheduled_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div className="p-5 space-y-5">
      {/* Core details */}
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <Row icon={<Calendar className="h-4 w-4" />} label="Scheduled">
          {room.scheduled_at ? `${dateStr} at ${timeStr}` : 'Not scheduled'}
        </Row>
        <Row icon={<User className="h-4 w-4" />} label="Host">
          {config?.hostName || 'Unknown'}
        </Row>
        <Row icon={<Layers className="h-4 w-4" />} label="Rounds">
          {rounds.length} round{rounds.length !== 1 ? 's' : ''}
        </Row>
        <Row icon={<DollarSign className="h-4 w-4" />} label="Entry Fee">
          {parseFloat(entryFee) > 0 ? `${currency}${entryFee}` : 'Free'}
        </Row>
        <Row icon={<Users className="h-4 w-4" />} label="Max Players">
          {maxPlayers > 0 ? maxPlayers : '—'}
        </Row>
        {prizeTotal > 0 && (
          <Row icon={<Trophy className="h-4 w-4" />} label="Prize Pool">
            {currency}{prizeTotal} ({prizes.length} prize{prizes.length !== 1 ? 's' : ''})
          </Row>
        )}
        {linkedEventTitle && (
          <Row icon={<Link2 className="h-4 w-4" />} label="Linked Event">
            <span className="text-indigo-700">{linkedEventTitle}</span>
          </Row>
        )}
        <Row icon={<Hash className="h-4 w-4" />} label="Room ID">
          <span className="font-mono text-xs text-gray-600">{room.room_id}</span>
        </Row>
      </div>

      {/* Stats */}
      {stats && (
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Stats</h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Tickets',  value: stats.ticketsSold  ?? 0,    color: 'text-orange-700' },
              { label: 'Players',  value: stats.uniquePlayers ?? 0,   color: 'text-indigo-700' },
              { label: 'Income',   value: stats.totalIncome  ? `${currency}${stats.totalIncome.toFixed(2)}` : '—', color: 'text-green-700' },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-center">
                <div className="text-xs text-gray-500">{label}</div>
                <div className={`mt-1 text-lg font-bold ${color}`}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rounds breakdown */}
      {rounds.length > 0 && (
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Rounds</h3>
          <div className="space-y-2">
            {rounds.map((r: any, i: number) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-indigo-600">#{r.roundNumber}</span>
                  <span className="text-xs font-medium text-gray-900">{r.roundType?.replace(/_/g, ' ')}</span>
                  <span className="text-xs text-gray-500">{r.category}</span>
                </div>
                <div className="flex gap-2 text-xs text-gray-500">
                  <span>{r.config?.questionsPerRound}Q</span>
                  <span>{r.config?.timePerQuestion}s</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}