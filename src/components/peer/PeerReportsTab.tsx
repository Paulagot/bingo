// src/components/peer/PeerReportsTab.tsx
//
// Report summary for a peer fundraiser.
// Logic unchanged - re-skinned to the events dashboard palette.

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import svc from '../../services/PeerService';
import { brand } from '../dashboard/branding';

export default function PeerReportsTab({ fundraiserId }: { fundraiserId: string }) {
  const [r, setR] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    svc.report(fundraiserId)
      .then(setR)
      .finally(() => setLoading(false));
  }, [fundraiserId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 justify-center" style={{ color: brand.slate }}>
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: brand.teal }} />
        Loading report…
      </div>
    );
  }

  if (!r) {
    return <p className="text-sm py-4 text-center" style={{ color: brand.slate }}>No report data available.</p>;
  }

  const confirmed = Number(
    r.totals.find((x: any) => x.payment_status === 'confirmed')?.total || 0
  );

  return (
    <div>
      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <ReportCard label="Confirmed" value={`€${confirmed.toFixed(2)}`} />
        <ReportCard label="Participants" value={r.participants.length} />
        <ReportCard label="Rooms" value={r.rooms.length} />
      </div>

      {/* By participant */}
      <h3 className="mt-7 text-sm font-bold" style={{ color: brand.navy }}>By participant</h3>
      <div className="mt-3 space-y-2">
        {r.participants.map((x: any) => (
          <div
            key={x.participant_id || 'general'}
            className="flex justify-between items-center rounded-xl px-4 py-3"
            style={{ background: brand.bg }}
          >
            <span className="text-sm font-semibold" style={{ color: brand.navy }}>
              {x.participant_name || 'General link'}
            </span>
            <span className="text-sm font-bold" style={{ color: brand.teal }}>
              €{Number(x.confirmed_total || 0).toFixed(2)}
            </span>
          </div>
        ))}
        {r.participants.length === 0 && (
          <p className="text-sm py-2 text-center" style={{ color: brand.slate }}>No participants yet.</p>
        )}
      </div>
    </div>
  );
}

function ReportCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl p-4" style={{ background: brand.bg }}>
      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: brand.slate }}>{label}</p>
      <p className="mt-2 text-2xl font-bold" style={{ color: brand.navy }}>{value}</p>
    </div>
  );
}