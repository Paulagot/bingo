// src/pages/ticketedEvent/WalkinPage.tsx
//
// Route: /tickets/walkin/:roomId
// Query params:
//   ?token=xxx  — operator token for door staff

import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import WalkinFlow from '../../../components/ticketedEvent/WalkinFlow';

export default function WalkinPage() {
  const { roomId }     = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const token          = searchParams.get('token');

  if (!roomId) {
    return (
      <div className="min-h-screen bg-[#f6f1e8] flex items-center justify-center">
        <p className="text-sm text-[#52636f]">No room ID provided.</p>
      </div>
    );
  }

  return (
    <WalkinFlow
      roomId={roomId}
      token={token}
      onDone={() => {
        // If they came from the check-in dashboard (has token), go back there
        if (token) {
          navigate(`/ticketed-event/checkin/${roomId}?token=${token}`);
        } else {
          navigate(-1);
        }
      }}
    />
  );
}