// src/components/Quiz/dashboard/AdminListPanel.tsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { v4 as uuidv4 } from 'uuid';
import { useQuizSocket } from '../sockets/QuizSocketProvider';
import { useAdminStore, Admin as StoreAdmin } from '../hooks/useAdminStore';

type Role = 'admin' | 'host';

// Allow for legacy items without `role`
type Admin = StoreAdmin & { role?: Role };

const AdminListPanel: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { socket } = useQuizSocket();
  const { admins, setFullAdmins } = useAdminStore();

  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<Role>('admin');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const debug = false;

  const handleAdd = () => {
    if (!newName.trim() || !roomId || !socket) return;

    const newMember: Admin = {
      id: uuidv4(),
      name: newName.trim(),
      role: newRole,
    };

    // Single event that the server can interpret by `admin.role`
    socket.emit('add_admin', { roomId, admin: newMember });
    if (debug) console.log('[emit] add_admin', { roomId, admin: newMember });

    setNewName('');
    setNewRole('admin');
  };



  useEffect(() => {
    if (!socket || !roomId) return;

    const onList = ({ admins }: { admins: Admin[] }) => {
      if (debug) console.log('[on] admin_list_updated', admins);
      // Default legacy entries to 'admin'
      setFullAdmins(admins.map(a => ({ ...a, role: (a as Admin).role ?? 'admin' })));
    };

    socket.on('admin_list_updated', onList);
    // Proactively request the latest list on mount
    socket.emit?.('request_admin_list', { roomId });

    return () => {
      socket.off('admin_list_updated', onList);
    };
  }, [socket, roomId, setFullAdmins]);

  const buildInviteLink = (member: Admin) => {
    const role: Role = member.role ?? 'admin';
    const base = `${window.location.origin}/quiz/admin-join/${roomId}`;
    // Shared join page; role + memberId decide behavior
    return `${base}?role=${role}&memberId=${member.id}`;
  };

  return (
    <div className="bg-muted mt-6 rounded-lg p-4 shadow-sm">
      <h2 className="text-fg mb-4 text-2xl font-bold">🛠️ Admins & Hosts</h2>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          placeholder="Name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 focus:ring-indigo-500"
        />
        <select
          value={newRole}
          onChange={(e) => setNewRole(e.target.value as Role)}
          className="rounded-md border border-gray-300 px-3 py-2"
        >
          <option value="admin">Admin</option>
          <option value="host">Host</option>
        </select>
        <button
          onClick={handleAdd}
          className="rounded-md bg-indigo-600 px-5 py-2 font-medium text-white shadow transition hover:bg-indigo-700"
        >
          Add
        </button>
      </div>

      {admins.length === 0 ? (
        <p className="text-fg/70">No team added yet.</p>
      ) : (
        <ul className="space-y-2">
          {admins.map((m: Admin) => {
            const role: Role = m.role ?? 'admin';
            const invite = buildInviteLink(m);
            const isQR = selectedId === m.id;
            const isHost = role === 'host';

            return (
              <li key={m.id} className="rounded-md border bg-gray-50 p-2 text-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1">
                    <p className="text-fg font-semibold">
                      {m.name}{' '}
                      <span
                        className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                          isHost ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {isHost ? 'Host' : 'Admin'}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                  
                   
                  

                    <button
                      onClick={() => setSelectedId(isQR ? null : m.id)}
                      className="text-xs font-semibold text-indigo-600 hover:underline"
                    >
                      🔗 Invite
                    </button>

                  </div>
                </div>

                {isQR && (
                  <div className="bg-muted mt-2 max-w-xs rounded-md border p-2 shadow-sm">
                    <QRCodeCanvas value={invite} size={96} />
                    <p className="text-fg/70 mt-1 break-all text-xs">{invite}</p>
                    <button
                      onClick={() => navigator.clipboard.writeText(invite)}
                      className="mt-1 text-xs text-indigo-600 hover:underline"
                    >
                      Copy Link
                    </button>
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

export default AdminListPanel;








