import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { v4 as uuidv4 } from 'uuid';
import { useQuizSocket } from '../sockets/QuizSocketProvider';
import { useAdminStore, Admin } from '../hooks/useAdminStore';
import { fullQuizReset } from '../utils/fullQuizReset';
import { useNavigate } from 'react-router-dom';


const AdminListPanel: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [newAdminName, setNewAdminName] = useState('');
  const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null);
  const { socket } = useQuizSocket();
  const { admins, setFullAdmins } = useAdminStore();
  const debug = false;

   const navigate = useNavigate();
  const handleAddAdmin = () => {
    if (!newAdminName.trim() || !roomId || !socket) return;

    const newAdmin: Admin = {
      id: uuidv4(),
      name: newAdminName.trim(),
    };

    // ✅ Just emit to server — no local state update here:
    socket.emit('add_admin', { roomId, admin: newAdmin });

    if (debug) console.log('[Socket Emit] add_admin', { roomId, admin: newAdmin });

    setNewAdminName('');
  };

  useEffect(() => {
    if (!socket) return;

    const handleAdminListUpdate = ({ admins }: { admins: Admin[] }) => {
      if (debug) console.log('[Socket] 🎯 admin_list_updated received:', admins);
      setFullAdmins(admins);
    };

    socket.on('admin_list_updated', handleAdminListUpdate);

    return () => {
      socket.off('admin_list_updated', handleAdminListUpdate);
    };
  }, [socket, setFullAdmins]);

 


  return (
    <div className="bg-muted mt-6 rounded-lg p-4 shadow-sm">
      <h2 className="text-fg mb-4 text-2xl font-bold">🛠️ Admins</h2>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          placeholder="Admin Name"
          value={newAdminName}
          onChange={(e) => setNewAdminName(e.target.value)}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 focus:ring-indigo-500"
        />
        <button
          onClick={handleAddAdmin}
          className="rounded-md bg-indigo-600 px-5 py-2 font-medium text-white shadow transition hover:bg-indigo-700"
        >
          Add Admin
        </button>
      </div>

      {admins.length === 0 ? (
        <p className="text-fg/70">No admins added yet.</p>
      ) : (
        <ul className="space-y-2">
          {admins.map((admin) => {
            const joinLink = `${window.location.origin}/quiz/admin-join/${roomId}?adminId=${admin.id}`;
            const isShowingQR = selectedAdminId === admin.id;

            return (
              <li key={admin.id} className="rounded-md border bg-gray-50 p-2 text-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1">
                    <p className="text-fg font-semibold">{admin.name}</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <button
                      onClick={() => setSelectedAdminId(isShowingQR ? null : admin.id)}
                      className="text-xs font-semibold text-indigo-600 hover:underline"
                    >
                      🔗 Invite
                    </button>
                    {isShowingQR && (
                      <div className="bg-muted mt-1 max-w-xs rounded-md border p-2 shadow-sm">
                        <QRCodeCanvas value={joinLink} size={96} />
                        <p className="text-fg/70 mt-1 break-all text-xs">{joinLink}</p>
                        <button
                          onClick={() => navigator.clipboard.writeText(joinLink)}
                          className="mt-1 text-xs text-indigo-600 hover:underline"
                        >
                          Copy Link
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default AdminListPanel;






