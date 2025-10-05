// src/components/Quiz/dashboard/AdminListPanel.tsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { v4 as uuidv4 } from 'uuid';
import { useQuizSocket } from '../sockets/QuizSocketProvider';
import { useAdminStore, Admin as StoreAdmin } from '../hooks/useAdminStore';
import { 
  Shield, 
  UserCog, 
  QrCode, 
  Link as LinkIcon, 
  Crown,
  Plus
} from 'lucide-react';

type Role = 'admin' | 'host';

type Admin = StoreAdmin & { role?: Role };

const AdminListPanel: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { socket } = useQuizSocket();
  const { admins, setFullAdmins } = useAdminStore();

  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<Role>('admin');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const debug = false;

  const handleAdd = () => {
    if (!newName.trim() || !roomId || !socket) return;

    const newMember: Admin = {
      id: uuidv4(),
      name: newName.trim(),
      role: newRole,
    };

    socket.emit('add_admin', { roomId, admin: newMember });
    if (debug) console.log('[emit] add_admin', { roomId, admin: newMember });

    setNewName('');
    setNewRole('admin');
  };

  useEffect(() => {
    if (!socket || !roomId) return;

    const onList = ({ admins }: { admins: Admin[] }) => {
      if (debug) console.log('[on] admin_list_updated', admins);
      setFullAdmins(admins.map(a => ({ ...a, role: (a as Admin).role ?? 'admin' })));
    };

    socket.on('admin_list_updated', onList);
    socket.emit?.('request_admin_list', { roomId });

    return () => {
      socket.off('admin_list_updated', onList);
    };
  }, [socket, roomId, setFullAdmins]);

  const buildInviteLink = (member: Admin) => {
    const role: Role = member.role ?? 'admin';
    const base = `${window.location.origin}/quiz/admin-join/${roomId}`;
    return `${base}?role=${role}&memberId=${member.id}`;
  };

  const copyToClipboard = (text: string, memberId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(memberId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const hosts = admins.filter(a => (a as Admin).role === 'host');
  const adminMembers = admins.filter(a => (a as Admin).role !== 'host');

  return (
    <div className="bg-gray-50 rounded-xl p-6 shadow-md">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3 pb-4 border-b border-gray-200">
        <div className="rounded-lg bg-purple-100 p-2">
          <Shield className="h-6 w-6 text-purple-700" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Team Management</h2>
          <p className="text-sm text-gray-600 mt-0.5">
            {admins.length} member{admins.length !== 1 ? 's' : ''} • {hosts.length} host{hosts.length !== 1 ? 's' : ''} • {adminMembers.length} admin{adminMembers.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Add Member Section */}
      <div className="mb-6 rounded-lg border-2 border-purple-200 bg-white p-4">
        <div className="flex items-center gap-2 mb-3">
          <Plus className="h-5 w-5 text-purple-600" />
          <h3 className="font-semibold text-gray-900">Add Team Member</h3>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="Enter name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newName.trim()) {
                handleAdd();
              }
            }}
            className="flex-1 rounded-lg border-2 border-gray-300 px-4 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all"
          />
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as Role)}
            className="rounded-lg border-2 border-gray-300 bg-white px-4 py-2.5 text-sm font-medium focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all"
          >
            <option value="admin">Admin</option>
            <option value="host">Host</option>
          </select>
          <button
            onClick={handleAdd}
            disabled={!newName.trim()}
            className={`rounded-lg px-6 py-2.5 font-semibold text-white shadow-sm transition-all inline-flex items-center gap-2 ${
              !newName.trim()
                ? 'cursor-not-allowed opacity-50 bg-gray-400'
                : 'bg-purple-600 hover:bg-purple-700 active:bg-purple-800'
            }`}
          >
            <Plus className="h-4 w-4" />
            Add Member
          </button>
        </div>
      </div>

      {/* Empty State */}
      {admins.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-300 bg-white p-8 text-center">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Team Members Yet</h3>
          <p className="text-sm text-gray-600">Add admins and hosts to help manage this quiz.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Hosts Section */}
          {hosts.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                Hosts ({hosts.length})
              </h3>
              <ul className="space-y-2">
                {hosts.map((m: Admin) => {
                  const invite = buildInviteLink(m);
                  const isQR = selectedId === m.id;
                  const isCopied = copiedId === m.id;

                  return (
                    <li key={m.id} className="rounded-lg border-2 border-yellow-200 bg-gradient-to-r from-yellow-50 to-white p-4 hover:border-yellow-300 hover:shadow-md transition-all">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <div className="rounded-full bg-yellow-100 p-2">
                              <Crown className="h-4 w-4 text-yellow-700" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">{m.name}</h4>
                              <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 border border-yellow-300 px-2.5 py-0.5 text-xs font-semibold text-yellow-800">
                                Host
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => setSelectedId(isQR ? null : m.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg border-2 border-purple-300 bg-white px-3 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-50 transition-all"
                          >
                            <QrCode className="h-3.5 w-3.5" />
                            {isQR ? 'Hide' : 'Invite'}
                          </button>
                        </div>

                        {isQR && (
                          <div className="mt-2 rounded-lg bg-white border border-gray-200 p-4">
                            <div className="flex flex-col sm:flex-row gap-4 items-center">
                              <div className="bg-white p-3 rounded-lg border-2 border-gray-300 shadow-sm">
                                <QRCodeCanvas value={invite} size={120} />
                              </div>
                              <div className="flex-1 w-full">
                                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2 block">
                                  Invite Link
                                </label>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={invite}
                                    readOnly
                                    className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-xs font-mono text-gray-700"
                                  />
                                  <button
                                    onClick={() => copyToClipboard(invite, m.id)}
                                    className="rounded-lg bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-700 transition-all inline-flex items-center gap-1.5"
                                  >
                                    <LinkIcon className="h-3.5 w-3.5" />
                                    {isCopied ? 'Copied!' : 'Copy'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Admins Section */}
          {adminMembers.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                Admins ({adminMembers.length})
              </h3>
              <ul className="space-y-2">
                {adminMembers.map((m: Admin) => {
                  const invite = buildInviteLink(m);
                  const isQR = selectedId === m.id;
                  const isCopied = copiedId === m.id;

                  return (
                    <li key={m.id} className="rounded-lg border-2 border-blue-200 bg-white p-4 hover:border-blue-300 hover:shadow-md transition-all">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <div className="rounded-full bg-blue-100 p-2">
                              <UserCog className="h-4 w-4 text-blue-700" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">{m.name}</h4>
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 border border-blue-300 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                                Admin
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => setSelectedId(isQR ? null : m.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg border-2 border-purple-300 bg-white px-3 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-50 transition-all"
                          >
                            <QrCode className="h-3.5 w-3.5" />
                            {isQR ? 'Hide' : 'Invite'}
                          </button>
                        </div>

                        {isQR && (
                          <div className="mt-2 rounded-lg bg-gray-50 border border-gray-200 p-4">
                            <div className="flex flex-col sm:flex-row gap-4 items-center">
                              <div className="bg-white p-3 rounded-lg border-2 border-gray-300 shadow-sm">
                                <QRCodeCanvas value={invite} size={120} />
                              </div>
                              <div className="flex-1 w-full">
                                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2 block">
                                  Invite Link
                                </label>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={invite}
                                    readOnly
                                    className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-mono text-gray-700"
                                  />
                                  <button
                                    onClick={() => copyToClipboard(invite, m.id)}
                                    className="rounded-lg bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-700 transition-all inline-flex items-center gap-1.5"
                                  >
                                    <LinkIcon className="h-3.5 w-3.5" />
                                    {isCopied ? 'Copied!' : 'Copy'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminListPanel;








