// ParticipantList.tsx
// The participant roster (QR + share link + edit/remove), extracted verbatim
// from PeerFundraiserDrawer. Presentational: the drawer owns the data and the
// edit/remove handlers.

import { QRCodeCanvas } from 'qrcode.react';
import { brand } from '../dashboard/branding';

type Props = {
  participants: any[];
  base: string;
  onEdit: (p: any) => void;
  onRemove: (p: any) => void;
};

export default function ParticipantList({ participants, base, onEdit, onRemove }: Props) {
  if (participants.length === 0) {
    return (
      <p className="text-sm py-4 text-center" style={{ color: brand.slate }}>
        No participants yet — add one above.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {participants.map(p => {
        const url = `${base}/${p.participant_slug}`;
        return (
          <div
            key={p.id}
            className={`flex items-center gap-4 rounded-xl p-4 ${p.is_active === 0 ? 'opacity-50' : ''}`}
            style={{ border: `1px solid ${brand.border}` }}
          >
            <QRCodeCanvas value={url} size={64} />
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sm" style={{ color: brand.navy }}>
                {p.participant_name}
                {p.is_active === 0 && (
                  <span className="ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase" style={{ background: brand.bg, color: brand.slate }}>
                    Inactive
                  </span>
                )}
              </p>
              <p className="text-xs truncate mt-0.5" style={{ color: brand.slate }}>{url}</p>
              {p.personal_target != null && (
                <p className="text-xs font-bold mt-0.5" style={{ color: brand.slate }}>
                  Target: €{Number(p.personal_target).toFixed(2)}
                </p>
              )}
              <p className="text-sm font-bold mt-0.5" style={{ color: brand.teal }}>
                €{Number(p.confirmed_total || 0).toFixed(2)} confirmed
              </p>
            </div>
            <div className="flex flex-col gap-2 flex-shrink-0">
              <button
                onClick={() => navigator.clipboard.writeText(url)}
                className="rounded-lg border px-3 py-1.5 text-xs font-bold"
                style={{ borderColor: brand.border, color: brand.navy }}
              >
                Copy
              </button>
              <button
                onClick={() => onEdit(p)}
                className="rounded-lg border px-3 py-1.5 text-xs font-bold"
                style={{ borderColor: brand.border, color: brand.navy }}
              >
                Edit
              </button>
              <button
                onClick={() => onRemove(p)}
                className="rounded-lg border px-3 py-1.5 text-xs font-bold"
                style={{ borderColor: '#f2c5c2', color: '#b42318' }}
              >
                Remove
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}