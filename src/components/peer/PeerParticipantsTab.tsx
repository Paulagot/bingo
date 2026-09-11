// src/components/peer/PeerParticipantsTab.tsx
//
// Self-contained participants tab.
// Owns: editing state, approve/reject/remove handlers, join link.
// Parent (PeerFundraiserDrawer) just passes fundraiserId, base URL,
// the already-loaded participants list, and an onChanged callback.

import { useState } from 'react';
import svc from '../../services/PeerService';
import type { PeerParticipant } from '../../services/PeerService';
import ParticipantForm from './ParticipantForm';
import ParticipantList from './ParticipantList';
import { brand } from '../dashboard/branding';

interface Props {
  fundraiserId: string;
  participants: PeerParticipant[];
  base:         string;           // e.g. https://fundraisely.ie/fundraise/club/fundraiser
  onChanged:    () => void;       // triggers drawer reload
}

export default function PeerParticipantsTab({
  fundraiserId,
  participants,
  base,
  onChanged,
}: Props) {
  const [editing, setEditing] = useState<PeerParticipant | null>(null);

  const handleRemove = async (p: PeerParticipant) => {
    if (!confirm(
      `Remove ${p.participant_name}? If they have orders they'll be deactivated instead of deleted.`
    )) return;
    await svc.deleteParticipant(fundraiserId, p.id);
    onChanged();
  };

  const handleApprove = async (p: PeerParticipant) => {
    await svc.approveParticipant(fundraiserId, p.id);
    onChanged();
  };

  const handleReject = async (p: PeerParticipant) => {
    if (!confirm(`Reject ${p.participant_name}'s application?`)) return;
    await svc.rejectParticipant(fundraiserId, p.id);
    onChanged();
  };

  const joinUrl = base ? `${base}/join` : null;

  return (
    <div>
      {/* ── Shareable join link ── */}
      {joinUrl && (
        <div
          className="rounded-xl border p-4 mb-5"
          style={{ borderColor: brand.border, background: '#fff' }}
        >
          <p
            className="text-[10px] font-bold uppercase tracking-widest mb-1"
            style={{ color: brand.slate }}
          >
            Participant sign-up link
          </p>
          <p className="text-xs mb-2" style={{ color: brand.slate }}>
            Share this link so people can apply to take part. You approve them below.
          </p>
          <div className="flex items-center gap-2">
            <p
              className="text-sm flex-1 truncate font-mono"
              style={{ color: brand.teal }}
            >
              {joinUrl}
            </p>
            <button
              onClick={() => navigator.clipboard.writeText(joinUrl)}
              className="flex-shrink-0 rounded-lg border px-3 py-1.5 text-xs font-bold"
              style={{ borderColor: brand.border, color: brand.navy }}
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {/* ── Add / edit form ── */}
      <ParticipantForm
        fundraiserId={fundraiserId}
        editing={editing}
        onSaved={() => { setEditing(null); onChanged(); }}
        onCancel={() => setEditing(null)}
      />

      {/* ── Participant list with pending approval tab ── */}
      <ParticipantList
        participants={participants}
        base={base}
        onEdit={setEditing}
        onRemove={handleRemove}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  );
}