import React, { useState, useMemo } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Users, X, Copy, Check, Search, ChevronDown, ChevronUp } from 'lucide-react';

interface Player {
  id: string;
  name: string;
}

interface Props {
  roomId: string;
  players: Player[];
}

const HostPlayerLinksPanel: React.FC<Props> = ({ roomId, players }) => {
  const [open, setOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const copyLink = (link: string, playerId: string) => {
    navigator.clipboard.writeText(link);
    setCopiedId(playerId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const norm = (s: string) =>
    (s || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

  const filtered = useMemo(() => {
    if (!search.trim()) return players;
    const q = norm(search.trim());
    return players.filter(p => norm(p.name).includes(q));
  }, [players, search]);

  const handleClose = () => {
    setOpen(false);
    setSearch('');
    setExpandedId(null);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-indigo-700 transition-all"
      >
        <Users className="h-4 w-4" />
        Players ({players.length})
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-10">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">

            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Player Rejoin Links</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Tap a player to show their QR code
                </p>
              </div>
              <button
                onClick={handleClose}
                className="rounded-full p-1.5 hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search players..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  autoFocus
                  className="w-full rounded-lg border-2 border-gray-200 pl-9 pr-4 py-2 text-sm focus:border-indigo-400 focus:outline-none transition-colors"
                />
              </div>
              {search && (
                <p className="text-xs text-gray-500 mt-2">
                  {filtered.length} of {players.length} players
                </p>
              )}
            </div>

            {/* Player list */}
            <div className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-500">
                  No players match "{search}"
                </div>
              ) : (
                filtered.map(player => {
                  const joinLink = `${window.location.origin}/quiz/game/${roomId}/${player.id}`;
                  const isExpanded = expandedId === player.id;
                  const isCopied = copiedId === player.id;

                  return (
                    <div key={player.id}>
                      {/* Row - always visible */}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : player.id)}
                        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors text-left"
                      >
                        <span className="font-medium text-gray-900">{player.name}</span>
                        {isExpanded
                          ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" />
                          : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                        }
                      </button>

                      {/* Expanded QR + link */}
                      {isExpanded && (
                        <div className="px-5 pb-5 bg-gray-50 border-t border-gray-100">
                          <div className="flex gap-4 items-start pt-4">
                            <div className="bg-white p-2 rounded-xl border-2 border-gray-200 shrink-0 shadow-sm">
                              <QRCodeCanvas value={joinLink} size={110} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                Rejoin Link
                              </p>
                              <input
                                readOnly
                                value={joinLink}
                                className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs font-mono text-gray-600 mb-3"
                              />
                              <button
                                onClick={() => copyLink(joinLink, player.id)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
                              >
                                {isCopied
                                  ? <><Check className="h-3.5 w-3.5" /> Copied!</>
                                  : <><Copy className="h-3.5 w-3.5" /> Copy Link</>
                                }
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-400">
                Players can scan the QR or use the link to rejoin mid-game
              </p>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

export default HostPlayerLinksPanel;