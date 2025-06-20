import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { v4 as uuidv4 } from 'uuid';
import { useQuizSocket } from '../../../sockets/QuizSocketProvider';
import { useAdminStore, Admin } from '../useAdminStore';
import { fullQuizReset } from '../utils/fullQuizReset';
import { useNavigate } from 'react-router-dom';


const AdminListPanel: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [newAdminName, setNewAdminName] = useState('');
  const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null);
  const { socket } = useQuizSocket();
  const { admins, setFullAdmins } = useAdminStore();
  const debug = true;

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
    <div className="bg-white p-4 rounded-lg shadow-sm mt-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">🛠️ Admins</h2>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text"
          placeholder="Admin Name"
          value={newAdminName}
          onChange={(e) => setNewAdminName(e.target.value)}
          className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500"
        />
        <button
          onClick={handleAddAdmin}
          className="bg-indigo-600 text-white px-5 py-2 rounded-md font-medium shadow hover:bg-indigo-700 transition"
        >
          Add Admin
        </button>
      </div>

      {admins.length === 0 ? (
        <p className="text-gray-600">No admins added yet.</p>
      ) : (
        <ul className="space-y-2">
          {admins.map((admin) => {
            const joinLink = `${window.location.origin}/quiz/admin-join/${roomId}?adminId=${admin.id}`;
            const isShowingQR = selectedAdminId === admin.id;

            return (
              <li key={admin.id} className="p-2 border rounded-md bg-gray-50 text-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">{admin.name}</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <button
                      onClick={() => setSelectedAdminId(isShowingQR ? null : admin.id)}
                      className="text-indigo-600 hover:underline text-xs font-semibold"
                    >
                      🔗 Invite
                    </button>
                    {isShowingQR && (
                      <div className="mt-1 p-2 bg-white border rounded-md shadow-sm max-w-xs">
                        <QRCodeCanvas value={joinLink} size={96} />
                        <p className="mt-1 text-xs text-gray-600 break-all">{joinLink}</p>
                        <button
                          onClick={() => navigator.clipboard.writeText(joinLink)}
                          className="text-indigo-600 text-xs mt-1 hover:underline"
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






