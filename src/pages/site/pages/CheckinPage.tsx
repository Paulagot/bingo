// src/pages/ticketedEvent/CheckinPage.tsx
//
// Route: /ticketed-event/checkin/:roomId
// Query params:
//   ?hostId=xxx   — logged-in host opening from the drawer
//   ?token=xxx    — door staff operator token (no club login needed)

import { useParams, useSearchParams } from 'react-router-dom';
import CheckinDashboard from '../../../components/ticketedEvent/CheckinDashboard';

export default function CheckinPage() {
  const { roomId }      = useParams<{ roomId: string }>();
  const [searchParams]  = useSearchParams();
  const hostId          = searchParams.get('hostId') ?? undefined;

  if (!roomId) {
    return (
      <div className="min-h-screen bg-[#f6f1e8] flex items-center justify-center">
        <p className="text-sm text-[#52636f]">No room ID provided.</p>
      </div>
    );
  }

  return <CheckinDashboard roomId={roomId} hostId={hostId} />;
}