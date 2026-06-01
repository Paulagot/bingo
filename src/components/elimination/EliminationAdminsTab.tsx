// src/components/elimination/host/EliminationAdminsTab.tsx
//
// Drop this inside EliminationHostDashboard as the "Admins" tab content.
// Hosts add admins by name → get a QR code + shareable link.
// Admins scan → land on EliminationAdminJoinPage → see the dashboard.

import React, { useEffect, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { v4 as uuidv4 } from 'uuid';
import {
  Shield,
  UserPlus,
  QrCode,
  Link as LinkIcon,
  X,
  Users,
} from 'lucide-react';

interface Admin {
  id: string;
  name: string;
  joinedAt?: string;
}

interface EliminationAdminsTabProps {
  roomId: string;
  socket: any;
}

export const EliminationAdminsTab: React.FC<EliminationAdminsTabProps> = ({
  roomId,
  socket,
}) => {
  const [admins, setAdmins]         = useState<Admin[]>([]);
  const [newName, setNewName]       = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId]     = useState<string | null>(null);

  // ── Socket listeners ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !roomId) return;

    const handleAdminList = ({ admins: list }: { admins: Admin[] }) => {
      setAdmins(list);
    };

    socket.on('elimination_admin_list_updated', handleAdminList);

    // Request current list on mount
    socket.emit('request_elimination_admin_list', { roomId });

    return () => {
      socket.off('elimination_admin_list_updated', handleAdminList);
    };
  }, [socket, roomId]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed || !socket || !roomId) return;

    const admin: Admin = {
      id: uuidv4(),
      name: trimmed,
      joinedAt: new Date().toISOString(),
    };

    socket.emit('add_elimination_admin', { roomId, admin });
    // Optimistic update — server will broadcast back and confirm
    setAdmins(prev => [...prev, admin]);
    setNewName('');
  };

  const handleRemove = (adminId: string) => {
    if (!socket || !roomId) return;
    socket.emit('remove_elimination_admin', { roomId, adminId });
    setAdmins(prev => prev.filter(a => a.id !== adminId));
  };

  const buildInviteLink = (admin: Admin) => {
    const base = `${window.location.origin}/elimination/admin-join/${roomId}`;
    return `${base}?adminId=${admin.id}&name=${encodeURIComponent(admin.name)}`;
  };

  const copyLink = (admin: Admin) => {
    navigator.clipboard.writeText(buildInviteLink(admin));
    setCopiedId(admin.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Add admin input */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Admin name…"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && newName.trim()) handleAdd(); }}
          className="flex-1 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 focus:border-indigo-400 focus:outline-none"
        />
        <button
          onClick={handleAdd}
          disabled={!newName.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-40 transition-colors"
        >
          <UserPlus className="h-4 w-4" />
        </button>
      </div>

      {/* Helper text */}
      <p className="text-xs text-white/30">
        Admins can confirm payments but cannot start or control the game.
      </p>

      {/* Empty state */}
      {admins.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
          <Users className="mx-auto mb-2 h-10 w-10 text-white/20" />
          <p className="text-sm text-white/40">No admins added yet.</p>
        </div>
      )}

      {/* Admin list */}
      {admins.length > 0 && (
        <ul className="space-y-2">
          {admins.map(admin => {
            const isExpanded = expandedId === admin.id;
            const isCopied   = copiedId === admin.id;
            const link       = buildInviteLink(admin);

            return (
              <li
                key={admin.id}
                className="rounded-xl border border-white/10 bg-white/5 overflow-hidden"
              >
                {/* Row */}
                <div className="flex items-center justify-between gap-2 p-3">
                  <div className="flex items-center gap-2">
                    <div className="rounded-full bg-indigo-900/60 border border-indigo-500/40 p-1.5">
                      <Shield className="h-3.5 w-3.5 text-indigo-400" />
                    </div>
                    <span className="font-semibold text-white text-sm">{admin.name}</span>
                    <span className="rounded-full border border-indigo-500/30 bg-indigo-900/30 px-2 py-0.5 text-xs text-indigo-300">
                      Admin
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : admin.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-white/70 hover:bg-white/10 transition-colors"
                    >
                      <QrCode className="h-3.5 w-3.5" />
                      {isExpanded ? 'Hide' : 'Invite'}
                    </button>
                    <button
                      onClick={() => handleRemove(admin.id)}
                      className="rounded-lg border border-red-600/30 bg-red-900/20 p-1.5 text-red-400 hover:bg-red-900/40 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* QR + link panel */}
                {isExpanded && (
                  <div className="border-t border-white/10 bg-black/20 p-4">
                    <div className="flex flex-col sm:flex-row gap-4 items-center">
                      {/* QR code */}
                      <div className="rounded-xl bg-white p-3 shadow-lg flex-shrink-0">
                        <QRCodeCanvas value={link} size={120} />
                      </div>

                      {/* Link + instructions */}
                      <div className="flex-1 w-full space-y-2">
                        <p className="text-xs text-white/50">
                          Share this link or QR code with <strong className="text-white">{admin.name}</strong>.
                          They'll see the payment dashboard and can confirm payments.
                        </p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={link}
                            readOnly
                            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-mono text-white/60 min-w-0"
                          />
                          <button
                            onClick={() => copyLink(admin)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors flex-shrink-0"
                          >
                            <LinkIcon className="h-3.5 w-3.5" />
                            {isCopied ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default EliminationAdminsTab;