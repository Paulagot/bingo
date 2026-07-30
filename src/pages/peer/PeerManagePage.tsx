// src/pages/peer/PeerManagePage.tsx
//
// SHIM - the old /peer-dashboard/:id full-page route now just redirects
// to /peer-dashboard so any saved bookmarks or back-button navigations
// land on the dashboard. The drawer-based manage experience is handled
// by PeerFundraiserDrawer, opened from PeerDashboard.
//
// We pass the fundraiser ID via location.state so PeerDashboard can
// auto-open the correct drawer. If PeerDashboard reads
// location.state?.openId on mount, the UX is seamless even from a
// direct link. (That behaviour is opt-in; if PeerDashboard doesn't
// read it yet, the user just lands on the dashboard - perfectly fine.)

import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export default function PeerManagePage() {
  const navigate = useNavigate();
  const { peerFundraiserId } = useParams<{ peerFundraiserId: string }>();

  useEffect(() => {
    navigate('/peer-dashboard', {
      replace: true,
      state: { openId: peerFundraiserId ?? null },
    });
  }, [peerFundraiserId, navigate]);

  return null;
}